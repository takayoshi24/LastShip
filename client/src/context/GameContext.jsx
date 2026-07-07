import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { send, subscribe, init } from '../services/websocket.js';

const GameContext = createContext(null);

const initialState = {
  screen: 'lobby',
  roomCode: null,
  playerSlot: null,
  myBoard: null,
  attackBoard: null,
  myPlacements: [],
  sunkShips: [[], []],
  currentTurn: null,
  lastShotResult: null,
  winner: null,
  rankingToken: null,
  rankingDay: null,
  opponentDisconnected: false,
  reconnecting: false,
  reconnectFailed: false,
  connectionStatus: 'connecting',
  placementError: null,
  onlineCount: 0,
  messages: [],
  boardEmoji: null,
  turnTimerTick: 0,
  gameMode: 'pvp',
  shipHits: [
    { Carrier: 0, Battleship: 0, Cruiser: 0, Submarine: 0, Destroyer: 0 },
    { Carrier: 0, Battleship: 0, Cruiser: 0, Submarine: 0, Destroyer: 0 },
  ],
  replayData: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'WAITING_FOR_OPPONENT':
      localStorage.setItem('lastship_player_token', action.playerToken);
      localStorage.setItem('lastship_room_code', action.roomCode);
      return { ...state, roomCode: action.roomCode, playerSlot: action.playerSlot, screen: 'waiting' };

    case 'ROOM_READY':
      localStorage.setItem('lastship_player_token', action.playerToken);
      localStorage.setItem('lastship_room_code', action.roomCode);
      return {
        ...state,
        roomCode: action.roomCode,
        playerSlot: action.playerSlot,
        screen: 'placement',
        placementError: null,
        messages: [],
        gameMode: action.gameMode ?? 'pvp',
        shipHits: initialState.shipHits,
        replayData: null,
      };

    case 'PLACEMENT_ACCEPTED':
      return { ...state, screen: 'placed' };

    case 'PLACEMENT_ERROR':
      return { ...state, placementError: action.reason };

    case 'GAME_START':
      return { ...state, screen: 'game', currentTurn: action.firstPlayerSlot, lastShotResult: null };

    case 'SHOT_RESULT':
      return {
        ...state,
        lastShotResult: action,
        shipHits: action.shipHits ?? state.shipHits,
      };

    case 'GAME_OVER':
      return {
        ...state,
        screen: 'gameover',
        winner: action.winner,
        rankingToken: action.rankingToken ?? null,
        rankingDay: action.rankingDay ?? null,
        replayData: action.shots ? { shots: action.shots, placements: action.placements } : null,
      };

    case 'TURN_TIMER':
      return { ...state, turnTimerTick: state.turnTimerTick + 1 };

    case 'CHAT':
      return {
        ...state,
        messages: [...state.messages, { text: action.text, senderSlot: action.senderSlot, id: Date.now() + Math.random() }],
      };

    case 'EMOJI':
      return { ...state, boardEmoji: { emoji: action.emoji, senderSlot: action.senderSlot, id: Date.now() } };

    case 'CLEAR_EMOJI':
      return { ...state, boardEmoji: null };

    case 'OPPONENT_DISCONNECTED':
      return { ...state, opponentDisconnected: true };

    case 'OPPONENT_RECONNECTED':
      return { ...state, opponentDisconnected: false };

    case 'RECONNECT_SUCCESS': {
      const gs = action.gameState;
      return {
        ...state,
        screen: gs.roomState === 'active' ? 'game' : gs.roomState === 'placement' ? 'placement' : gs.roomState === 'waiting' ? 'waiting' : 'lobby',
        myBoard: gs.myBoard,
        attackBoard: gs.attackBoard,
        myPlacements: gs.myPlacements,
        sunkShips: gs.sunkShips,
        currentTurn: gs.currentTurn,
        playerSlot: gs.playerSlot ?? state.playerSlot,
        reconnecting: false,
        reconnectFailed: false,
        turnTimerTick: state.turnTimerTick + 1,
      };
    }

    case 'RECONNECT_FAILED':
      localStorage.removeItem('lastship_player_token');
      localStorage.removeItem('lastship_room_code');
      return { ...state, reconnecting: false, reconnectFailed: true, screen: 'lobby' };

    case '_DISCONNECTED':
      return { ...state, connectionStatus: 'disconnected', reconnecting: true };

    case '_RECONNECT_EXHAUSTED':
      return { ...state, reconnecting: false, reconnectFailed: true };

    case '_CONNECTED':
      return { ...state, connectionStatus: 'connected', reconnecting: false };

    case 'YOUR_PLACEMENTS':
      return { ...state, myPlacements: action.placements };

    case 'SET_BOARDS':
      return { ...state, myBoard: action.myBoard, attackBoard: action.attackBoard };

    case 'UPDATE_PLACEMENTS':
      return { ...state, myPlacements: action.placements };

    case 'UPDATE_TURN':
      return { ...state, currentTurn: action.turn };

    case 'ADD_SUNK':
      return {
        ...state,
        sunkShips: state.sunkShips.map((arr, i) =>
          i === action.targetIndex ? [...arr, action.shipName] : arr
        ),
      };

    case 'PLAYER_COUNT':
      return { ...state, onlineCount: action.count };

    case 'RESET':
      localStorage.removeItem('lastship_player_token');
      localStorage.removeItem('lastship_room_code');
      return { ...initialState, connectionStatus: state.connectionStatus, onlineCount: state.onlineCount };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    init();
    const unsub = subscribe((msg) => {
      dispatch(msg);
      if (msg.type === 'EMOJI') {
        setTimeout(() => dispatch({ type: 'CLEAR_EMOJI' }), 3000);
      }
    });
    return unsub;
  }, []);

  const sendMsg = useCallback((msg) => send(msg), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <GameContext.Provider value={{ state, dispatch, sendMsg, reset }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
