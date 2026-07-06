import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { send, subscribe, init } from '../services/websocket.js';

const GameContext = createContext(null);

const initialState = {
  screen: 'lobby',        // lobby | placement | game | gameover
  roomCode: null,
  playerSlot: null,
  myBoard: null,
  attackBoard: null,
  myPlacements: [],
  sunkShips: [[], []],
  currentTurn: null,
  lastShotResult: null,
  winner: null,
  opponentDisconnected: false,
  reconnecting: false,
  reconnectFailed: false,
  connectionStatus: 'connecting',
  placementError: null,
  onlineCount: 0,
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
      return { ...state, roomCode: action.roomCode, playerSlot: action.playerSlot, screen: 'placement', placementError: null };

    case 'PLACEMENT_ACCEPTED':
      return { ...state, screen: 'placed' };

    case 'PLACEMENT_ERROR':
      return { ...state, placementError: action.reason };

    case 'GAME_START':
      return { ...state, screen: 'game', currentTurn: action.firstPlayerSlot, lastShotResult: null };

    case 'SHOT_RESULT':
      return { ...state, lastShotResult: action };

    case 'GAME_OVER':
      return { ...state, screen: 'gameover', winner: action.winner };

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
      if (msg.type === '_DISCONNECTED' || msg.type === '_RECONNECT_EXHAUSTED') {
        dispatch(msg);
      } else {
        dispatch(msg);
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
