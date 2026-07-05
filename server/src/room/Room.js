import { v4 as uuidv4 } from 'uuid';
import { createBoard, applyPlacements, randomPlacement, processShot, checkWin } from '../core/gameLogic.js';
import { getNextShot } from '../core/botAI.js';

const PLACEMENT_TIMEOUT_MS = 60_000;
const TURN_TIMEOUT_MS = 5 * 60_000;
const RECONNECT_TIMEOUT_MS = 30_000;

export class Room {
  constructor(code, type = 'pvp') {
    this.code = code;
    this.type = type; // 'pvp' | 'bot'
    this.state = 'waiting'; // waiting | placement | active | finished
    this.players = [null, null]; // index 0 = slot 1, index 1 = slot 2
    this.boards = [createBoard(), createBoard()];
    this.placements = [[], []];
    this.currentTurn = null;
    this.sunkShips = [[], []];
    this._placementTimer = null;
    this._turnTimer = null;
    this._reconnectTimers = [null, null];
    this._placementReady = [false, false];
  }

  addPlayer(ws) {
    const slot = this.players[0] === null ? 0 : 1;
    const token = uuidv4();
    this.players[slot] = { ws, token, connected: true };
    return { slot: slot + 1, token };
  }

  addBot() {
    this.players[1] = { ws: null, token: null, connected: true, isBot: true };
  }

  isFull() {
    return this.players[0] !== null && this.players[1] !== null;
  }

  send(slotIndex, msg) {
    const player = this.players[slotIndex];
    if (player && player.ws && player.ws.readyState === 1) {
      player.ws.send(JSON.stringify(msg));
    }
  }

  broadcast(msg) {
    this.send(0, msg);
    this.send(1, msg);
  }

  startPlacement() {
    this.state = 'placement';
    if (this.type === 'bot') {
      this.placements[1] = randomPlacement();
      this.boards[1] = applyPlacements(this.boards[1], this.placements[1]);
      this._placementReady[1] = true;
    }

    this._placementTimer = setTimeout(() => this._onPlacementTimeout(), PLACEMENT_TIMEOUT_MS);
  }

  submitPlacement(slotIndex, playerPlacements) {
    if (this.state !== 'placement') return;
    this.placements[slotIndex] = playerPlacements;
    this.boards[slotIndex] = applyPlacements(createBoard(), playerPlacements);
    this._placementReady[slotIndex] = true;

    if (this._placementReady[0] && this._placementReady[1]) {
      clearTimeout(this._placementTimer);
      this._startGame();
    }
  }

  _onPlacementTimeout() {
    for (let i = 0; i < 2; i++) {
      if (this.type === 'bot' && i === 1) continue;
      if (this.placements[i].length === 0) {
        this.placements[i] = randomPlacement();
        this.boards[i] = applyPlacements(createBoard(), this.placements[i]);
      }
    }
    this._startGame();
  }

  _startGame() {
    this.state = 'active';
    this.currentTurn = Math.random() < 0.5 ? 0 : 1;
    this.broadcast({ type: 'GAME_START', firstPlayerSlot: this.currentTurn + 1 });
    // Send each player their own final placements (needed if auto-placed by server)
    for (let i = 0; i < 2; i++) {
      if (!this.players[i]?.isBot) {
        this.send(i, { type: 'YOUR_PLACEMENTS', placements: this.placements[i] });
      }
    }
    this._startTurnTimer();
    if (this.players[this.currentTurn]?.isBot) this._scheduleBotShot();
  }

  _startTurnTimer() {
    clearTimeout(this._turnTimer);
    this._turnTimer = setTimeout(() => this._onTurnTimeout(), TURN_TIMEOUT_MS);
  }

  _onTurnTimeout() {
    if (this.state !== 'active') return;
    const winner = this.currentTurn === 0 ? 1 : 0;
    this._endGame(winner);
  }

  fireShot(slotIndex, coordinate) {
    if (this.state !== 'active') return { error: 'GAME_NOT_ACTIVE' };
    if (slotIndex !== this.currentTurn) return { error: 'NOT_YOUR_TURN' };

    const targetIndex = slotIndex === 0 ? 1 : 0;
    const result = processShot(this.boards[targetIndex], this.placements[targetIndex], coordinate);

    if (result.error) return result;

    this.boards[targetIndex] = result.board;
    if (result.sunkShip) this.sunkShips[targetIndex].push(result.sunkShip.name);

    const payload = { type: 'SHOT_RESULT', coordinate, result: result.result, shooterSlot: slotIndex + 1 };
    if (result.sunkShip) payload.sunkShip = result.sunkShip;
    this.broadcast(payload);

    if (checkWin(this.boards[targetIndex], this.placements[targetIndex])) {
      this._endGame(slotIndex);
      return { ok: true };
    }

    this.currentTurn = targetIndex;
    this._startTurnTimer();

    if (this.players[this.currentTurn]?.isBot) this._scheduleBotShot();

    return { ok: true };
  }

  _scheduleBotShot() {
    const delay = 300 + Math.random() * 500;
    setTimeout(() => {
      if (this.state !== 'active') return;
      const target = getNextShot(this.boards[0], this.sunkShips[0]);
      this.fireShot(1, target);
    }, delay);
  }

  _endGame(winnerIndex) {
    this.state = 'finished';
    clearTimeout(this._turnTimer);
    clearTimeout(this._placementTimer);
    this.broadcast({ type: 'GAME_OVER', winner: winnerIndex + 1 });
  }

  disconnect(slotIndex) {
    if (!this.players[slotIndex]) return;
    this.players[slotIndex].connected = false;

    if (this.state === 'finished') return;

    const opponentIndex = slotIndex === 0 ? 1 : 0;
    let secondsRemaining = RECONNECT_TIMEOUT_MS / 1000;

    this.send(opponentIndex, { type: 'OPPONENT_DISCONNECTED', secondsRemaining });

    this._reconnectTimers[slotIndex] = setTimeout(() => {
      if (!this.players[slotIndex]?.connected) {
        this._endGame(opponentIndex);
      }
    }, RECONNECT_TIMEOUT_MS);
  }

  reconnect(slotIndex, ws) {
    clearTimeout(this._reconnectTimers[slotIndex]);
    this.players[slotIndex].ws = ws;
    this.players[slotIndex].connected = true;

    const opponentIndex = slotIndex === 0 ? 1 : 0;
    this.send(opponentIndex, { type: 'OPPONENT_RECONNECTED' });

    const myBoard = this.boards[slotIndex];
    const attackBoard = this.boards[opponentIndex];
    const safeAttackBoard = attackBoard.map(row =>
      row.map(cell => ({
        state: cell.state === 'ship' ? 'empty' : cell.state,
        shipName: cell.state === 'ship' ? null : cell.shipName,
      }))
    );

    this.send(slotIndex, {
      type: 'RECONNECT_SUCCESS',
      gameState: {
        myBoard,
        attackBoard: safeAttackBoard,
        currentTurn: this.currentTurn + 1,
        myPlacements: this.placements[slotIndex],
        sunkShips: this.sunkShips,
        roomState: this.state,
        playerSlot: slotIndex + 1,
      },
    });
  }

  forfeit(slotIndex) {
    if (this.state !== 'active') return;
    this._endGame(slotIndex === 0 ? 1 : 0);
  }

  getPlayerByToken(token) {
    return this.players.findIndex(p => p && p.token === token);
  }

  cleanup() {
    clearTimeout(this._placementTimer);
    clearTimeout(this._turnTimer);
    for (const t of this._reconnectTimers) clearTimeout(t);
  }
}
