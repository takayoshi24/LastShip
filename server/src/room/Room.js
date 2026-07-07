import { v4 as uuidv4 } from 'uuid';
import { createBoard, applyPlacements, randomPlacement, processShot, checkWin } from '../core/gameLogic.js';
import { FLEET_CONFIG, GRID_SIZE } from '../config/fleet.js';
import { getNextShot } from '../core/botAI.js';
import { createRankingToken } from '../rankings/tokens.js';
import { mulberry32, dailySeed, todayString } from '../core/seededRandom.js';
import { updateEloAndStats } from '../services/accounts.js';

const emptyHits = () => Object.fromEntries(FLEET_CONFIG.map(s => [s.name, 0]));

const PLACEMENT_TIMEOUT_MS = 60_000;
const TURN_TIMEOUT_MS = 30_000;
const TURN_TIMEOUT_SECS = 30;
const RECONNECT_TIMEOUT_MS = 30_000;

export class Room {
  constructor(code, type = 'pvp', botDifficulty = 'medium') {
    this.code = code;
    this.type = type;
    this.botDifficulty = botDifficulty;
    this.state = 'waiting';
    this.players = [null, null];
    this.boards = [createBoard(), createBoard()];
    this.placements = [[], []];
    this.currentTurn = null;
    this.sunkShips = [[], []];
    this._placementTimer = null;
    this._turnTimer = null;
    this._reconnectTimers = [null, null];
    this._placementReady = [false, false];
    this.gameStartTime = null;
    this.shipHits = [emptyHits(), emptyHits()];
    this.shotLog = [];
    this.spectators = [];
    this.avatars = [null, null];
    this.gameOptions = { salvo: false, fog: false };
    this.shotsRemainingThisTurn = 0;
    this.rematchVotes = [false, false];
    this.accountTokens = [null, null];
  }

  setAvatar(slotIndex, avatar) {
    this.avatars[slotIndex] = avatar ?? null;
  }

  setGameOptions(options = {}) {
    this.gameOptions = { salvo: !!options.salvo, fog: !!options.fog };
  }

  setAccountToken(slotIndex, token) {
    this.accountTokens[slotIndex] = token ?? null;
  }

  addSpectator(ws) {
    this.spectators.push(ws);
    const masked = (idx) => this.boards[idx].map(row =>
      row.map(cell => ({ state: cell.state === 'ship' ? 'empty' : cell.state }))
    );
    const payload = {
      type: 'SPECTATOR_STATE',
      boards: [masked(0), masked(1)],
      currentTurn: this.currentTurn !== null ? this.currentTurn + 1 : null,
      sunkShips: this.sunkShips,
      shipHits: this.shipHits,
      avatars: this.avatars,
      roomState: this.state,
    };
    if (ws.readyState === 1) ws.send(JSON.stringify(payload));
  }

  removeSpectator(ws) {
    this.spectators = this.spectators.filter(s => s !== ws);
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
    const raw = JSON.stringify(msg);
    for (const ws of this.spectators) {
      if (ws.readyState === 1) ws.send(raw);
    }
  }

  startPlacement() {
    this.state = 'placement';
    if (this.type === 'bot' || this.type === 'daily') {
      const rand = this.type === 'daily' ? mulberry32(dailySeed()) : Math.random;
      this.placements[1] = randomPlacement([], rand);
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
      if ((this.type === 'bot' || this.type === 'daily') && i === 1) continue;
      if (this.placements[i].length === 0) {
        this.placements[i] = randomPlacement();
        this.boards[i] = applyPlacements(createBoard(), this.placements[i]);
      }
    }
    this._startGame();
  }

  _startGame() {
    this.state = 'active';
    this.gameStartTime = Date.now();
    const isImpossible = (this.type === 'bot' || this.type === 'daily') && this.botDifficulty === 'impossible';
    this.currentTurn = isImpossible ? 0 : (Math.random() < 0.5 ? 0 : 1);

    if (this.gameOptions.salvo) {
      this.shotsRemainingThisTurn = FLEET_CONFIG.length;
    }

    const botAvatar = (this.type === 'bot' || this.type === 'daily')
      ? { color: '#64748b', icon: '🤖' } : null;
    if (botAvatar) this.avatars[1] = botAvatar;

    this.broadcast({
      type: 'GAME_START',
      firstPlayerSlot: this.currentTurn + 1,
      gameOptions: this.gameOptions,
      shotsRemaining: this.gameOptions.salvo ? this.shotsRemainingThisTurn : null,
    });
    for (let i = 0; i < 2; i++) {
      if (!this.players[i]?.isBot) {
        this.send(i, { type: 'YOUR_PLACEMENTS', placements: this.placements[i] });
        const oppIdx = i === 0 ? 1 : 0;
        this.send(i, { type: 'OPPONENT_INFO', avatar: this.avatars[oppIdx] });
      }
    }
    this._startTurnTimer();
    if (this.players[this.currentTurn]?.isBot) this._scheduleBotShot();
  }

  _startTurnTimer() {
    clearTimeout(this._turnTimer);
    this.broadcast({ type: 'TURN_TIMER', slot: this.currentTurn + 1, secs: TURN_TIMEOUT_SECS });
    this._turnTimer = setTimeout(() => this._onTurnTimeout(), TURN_TIMEOUT_MS);
  }

  _onTurnTimeout() {
    if (this.state !== 'active') return;
    const shooter = this.currentTurn;
    const targetIndex = 1 - shooter;
    const shots = this.gameOptions.salvo ? this.shotsRemainingThisTurn : 1;

    for (let i = 0; i < shots && this.state === 'active' && this.currentTurn === shooter; i++) {
      const available = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const s = this.boards[targetIndex][r][c].state;
          if (s === 'empty' || s === 'ship') available.push([r, c]);
        }
      }
      if (available.length === 0) break;
      const coord = available[Math.floor(Math.random() * available.length)];
      this.fireShot(shooter, coord);
    }
  }

  fireShot(slotIndex, coordinate) {
    if (this.state !== 'active') return { error: 'GAME_NOT_ACTIVE' };
    if (slotIndex !== this.currentTurn) return { error: 'NOT_YOUR_TURN' };

    const targetIndex = slotIndex === 0 ? 1 : 0;
    const [r, c] = coordinate;
    const hitShipName = this.boards[targetIndex][r][c].shipName;

    const result = processShot(this.boards[targetIndex], this.placements[targetIndex], coordinate);
    if (result.error) return result;

    this.boards[targetIndex] = result.board;
    if (result.sunkShip) this.sunkShips[targetIndex].push(result.sunkShip.name);

    if (result.result === 'hit' && hitShipName) {
      this.shipHits[targetIndex][hitShipName] = (this.shipHits[targetIndex][hitShipName] || 0) + 1;
    }

    this.shotLog.push({
      shooter: slotIndex + 1,
      coordinate,
      result: result.result,
      sunkCells: result.sunkShip?.cells ?? null,
    });

    const gameOver = checkWin(this.boards[targetIndex], this.placements[targetIndex]);

    // Determine next turn (server-authoritative, sent to client)
    let nextTurn = null;
    let nextShotsRemaining = null;

    if (!gameOver) {
      if (this.gameOptions.salvo) {
        this.shotsRemainingThisTurn--;
        if (this.shotsRemainingThisTurn <= 0) {
          this.currentTurn = targetIndex;
          this.shotsRemainingThisTurn = FLEET_CONFIG.length - this.sunkShips[targetIndex].length;
        }
        nextTurn = this.currentTurn + 1;
        nextShotsRemaining = this.shotsRemainingThisTurn;
      } else {
        this.currentTurn = targetIndex;
        nextTurn = this.currentTurn + 1;
      }
    }

    const payload = {
      type: 'SHOT_RESULT',
      coordinate,
      result: result.result,
      shooterSlot: slotIndex + 1,
      shipHits: this.shipHits,
      nextTurn,
      shotsRemaining: nextShotsRemaining,
    };
    if (result.sunkShip) payload.sunkShip = result.sunkShip;
    this.broadcast(payload);

    if (gameOver) {
      this._endGame(slotIndex);
      return { ok: true };
    }

    // Restart timer only when turn switches
    const turnSwitched = this.gameOptions.salvo
      ? this.shotsRemainingThisTurn === FLEET_CONFIG.length - this.sunkShips[this.currentTurn].length && this.currentTurn === targetIndex
      : true;

    if (!this.gameOptions.salvo || this.currentTurn !== slotIndex) {
      this._startTurnTimer();
      if (this.players[this.currentTurn]?.isBot) this._scheduleBotShot();
    } else if (this.players[this.currentTurn]?.isBot) {
      // Bot still has salvo shots
      this._scheduleBotShot();
    }

    return { ok: true };
  }

  _scheduleBotShot() {
    const delay = this.gameOptions.salvo ? 600 + Math.random() * 300 : 1000 + Math.random() * 500;
    setTimeout(() => {
      if (this.state !== 'active') return;
      if (!this.players[this.currentTurn]?.isBot) return;
      const target = getNextShot(this.boards[0], this.sunkShips[0], this.botDifficulty);
      this.fireShot(this.currentTurn, target);
    }, delay);
  }

  _endGame(winnerIndex) {
    this.state = 'finished';
    clearTimeout(this._turnTimer);
    clearTimeout(this._placementTimer);

    const isImpossibleWin = (this.type === 'bot' || this.type === 'daily')
      && this.botDifficulty === 'impossible'
      && winnerIndex === 0;

    const replayPayload = { shots: this.shotLog, placements: this.placements };

    // ELO update for PvP games where both players are registered
    let eloDeltas = null;
    if (this.type === 'pvp' && this.accountTokens[0] && this.accountTokens[1]) {
      const winnerToken = this.accountTokens[winnerIndex];
      eloDeltas = updateEloAndStats(
        this.accountTokens[0], this.accountTokens[1], winnerToken, this.shotLog
      );
    }

    if (isImpossibleWin) {
      const duration = Math.round((Date.now() - this.gameStartTime) / 1000);
      const rankingDay = this.type === 'daily' ? todayString() : null;
      const rankingToken = createRankingToken(duration, rankingDay);
      this.send(0, { type: 'GAME_OVER', winner: 1, rankingToken, rankingDay, ...replayPayload });
      this.send(1, { type: 'GAME_OVER', winner: 1, ...replayPayload });
    } else {
      const extra = eloDeltas
        ? { eloDeltas: [eloDeltas.elo1, eloDeltas.elo2] }
        : {};
      this.send(0, { type: 'GAME_OVER', winner: winnerIndex + 1, ...replayPayload, ...extra });
      this.send(1, { type: 'GAME_OVER', winner: winnerIndex + 1, ...replayPayload, ...extra });
    }
  }

  voteRematch(slotIndex) {
    if (this.state !== 'finished') return;
    this.rematchVotes[slotIndex] = true;

    if (this.type !== 'pvp') {
      // Bot/daily: auto-approve for the bot side
      this.rematchVotes[1 - slotIndex] = true;
    } else {
      const oppIndex = 1 - slotIndex;
      if (!this.rematchVotes[oppIndex]) {
        this.send(oppIndex, { type: 'REMATCH_OFFERED' });
      }
    }

    if (this.rematchVotes[0] && this.rematchVotes[1]) {
      this._startRematch();
    }
  }

  _startRematch() {
    clearTimeout(this._turnTimer);
    clearTimeout(this._placementTimer);

    this.boards = [createBoard(), createBoard()];
    this.placements = [[], []];
    this.currentTurn = null;
    this.sunkShips = [[], []];
    this.shipHits = [emptyHits(), emptyHits()];
    this.shotLog = [];
    this.rematchVotes = [false, false];
    this._placementReady = [false, false];
    this.gameStartTime = null;
    this.shotsRemainingThisTurn = 0;

    for (let i = 0; i < 2; i++) {
      if (!this.players[i]?.isBot) {
        this.send(i, {
          type: 'ROOM_READY',
          roomCode: this.code,
          playerSlot: i + 1,
          playerToken: this.players[i].token,
          gameMode: this.type === 'pvp' ? 'pvp' : this.type === 'daily' ? 'daily' : 'bot',
          botDifficulty: this.botDifficulty ?? null,
          gameOptions: this.gameOptions,
        });
      }
    }

    this.startPlacement();
  }

  disconnect(slotIndex) {
    if (!this.players[slotIndex]) return;
    this.players[slotIndex].connected = false;

    if (this.state === 'finished') return;

    const opponentIndex = slotIndex === 0 ? 1 : 0;
    this.send(opponentIndex, { type: 'OPPONENT_DISCONNECTED', secondsRemaining: RECONNECT_TIMEOUT_MS / 1000 });

    this._reconnectTimers[slotIndex] = setTimeout(() => {
      if (!this.players[slotIndex]?.connected) this._endGame(opponentIndex);
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
        gameOptions: this.gameOptions,
        shotsRemaining: this.gameOptions.salvo ? this.shotsRemainingThisTurn : null,
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
