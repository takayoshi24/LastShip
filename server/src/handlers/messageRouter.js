import {
  createRoom,
  getRoom,
  enqueueQuickMatch,
  dequeueQuickMatch,
  deleteRoom,
} from '../room/registry.js';
import { validatePlacements, randomPlacement } from '../core/gameLogic.js';

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

const VALID_COLORS = ['#2563eb','#dc2626','#16a34a','#9333ea','#ea580c','#db2777','#0891b2','#ca8a04'];
const VALID_ICONS  = ['🦈','🐙','🐬','⚓','💀','🐳','🦑','🔱'];
function sanitizeAvatar(raw) {
  if (!raw) return null;
  return {
    color: VALID_COLORS.includes(raw.color) ? raw.color : '#2563eb',
    icon:  VALID_ICONS.includes(raw.icon)   ? raw.icon  : '🦈',
  };
}

export function handleMessage(ws, rawData, wsToRoom) {
  let msg;
  try {
    msg = JSON.parse(rawData);
  } catch {
    send(ws, { type: 'ERROR', code: 'INVALID_JSON', message: 'Invalid JSON' });
    return;
  }

  switch (msg.type) {
    case 'CREATE_ROOM': {
      const avatar = sanitizeAvatar(msg.avatar);
      const room = createRoom('pvp');
      room.setGameOptions(msg.gameOptions);
      const { slot, token } = room.addPlayer(ws);
      room.setAvatar(slot - 1, avatar);
      wsToRoom.set(ws, { roomCode: room.code, slotIndex: slot - 1 });
      send(ws, { type: 'WAITING_FOR_OPPONENT', roomCode: room.code, playerSlot: slot, playerToken: token });
      break;
    }

    case 'JOIN_ROOM': {
      const room = getRoom(msg.roomCode);
      if (!room) return send(ws, { type: 'ERROR', code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      if (room.isFull()) return send(ws, { type: 'ERROR', code: 'ROOM_FULL', message: 'Room is full' });
      if (room.state !== 'waiting') return send(ws, { type: 'ERROR', code: 'ROOM_STARTED', message: 'Game already started' });

      const avatar = sanitizeAvatar(msg.avatar);
      const { slot, token } = room.addPlayer(ws);
      room.setAvatar(slot - 1, avatar);
      wsToRoom.set(ws, { roomCode: room.code, slotIndex: slot - 1 });

      const ready = { type: 'ROOM_READY', roomCode: room.code, gameOptions: room.gameOptions };
      const p1 = room.players[0];
      send(p1.ws, { ...ready, playerSlot: 1, playerToken: p1.token });
      send(ws, { ...ready, playerSlot: slot, playerToken: token });

      room.startPlacement();
      break;
    }

    case 'QUICK_MATCH': {
      const result = enqueueQuickMatch(ws, sanitizeAvatar(msg.avatar), msg.gameOptions ?? {}, msg.accountToken ?? null);
      if (result.queued) {
        wsToRoom.set(ws, { roomCode: null, slotIndex: null, inQueue: true });
        send(ws, { type: 'QUEUE_JOINED' });
      } else {
        const room = result.room;
        const slotIndex = room.players.findIndex(p => p && p.ws === ws);
        wsToRoom.set(ws, { roomCode: room.code, slotIndex });
        const waitingSlotIndex = 1 - slotIndex;
        const waitingWs = room.players[waitingSlotIndex]?.ws;
        if (waitingWs) wsToRoom.set(waitingWs, { roomCode: room.code, slotIndex: waitingSlotIndex });
      }
      break;
    }

    case 'SPECTATE': {
      const room = getRoom(msg.roomCode?.toUpperCase?.());
      if (!room || room.state === 'waiting' || room.state === 'finished') {
        return send(ws, { type: 'ERROR', code: 'CANNOT_SPECTATE', message: 'Room not available for spectating' });
      }
      wsToRoom.set(ws, { roomCode: room.code, slotIndex: -1, isSpectator: true });
      room.addSpectator(ws);
      break;
    }

    case 'CANCEL_QUEUE': {
      dequeueQuickMatch(ws);
      wsToRoom.delete(ws);
      send(ws, { type: 'QUEUE_CANCELLED' });
      break;
    }

    case 'PLAY_BOT': {
      const difficulty = ['easy', 'medium', 'hard', 'superhard', 'impossible'].includes(msg.difficulty) ? msg.difficulty : 'medium';
      const room = createRoom('bot', difficulty);
      const { slot, token } = room.addPlayer(ws);
      room.setAvatar(slot - 1, sanitizeAvatar(msg.avatar));
      room.addBot();
      wsToRoom.set(ws, { roomCode: room.code, slotIndex: slot - 1 });
      room.setGameOptions(msg.gameOptions);
      send(ws, { type: 'ROOM_READY', roomCode: room.code, playerSlot: slot, playerToken: token, gameMode: 'bot', botDifficulty: difficulty, gameOptions: room.gameOptions });
      room.startPlacement();
      break;
    }

    case 'PLACE_SHIPS': {
      const context = wsToRoom.get(ws);
      if (!context?.roomCode) return send(ws, { type: 'ERROR', code: 'NOT_IN_ROOM', message: 'Not in a room' });

      const room = getRoom(context.roomCode);
      if (!room || room.state !== 'placement') return;

      const placements = msg.placements ?? [];
      if (placements.length === 0) {
        const autoPlaced = randomPlacement();
        send(ws, { type: 'PLACEMENT_ACCEPTED' });
        room.submitPlacement(context.slotIndex, autoPlaced);
        return;
      }

      const validation = validatePlacements(placements);
      if (!validation.valid) {
        return send(ws, { type: 'PLACEMENT_ERROR', reason: validation.reason });
      }

      send(ws, { type: 'PLACEMENT_ACCEPTED' });
      room.submitPlacement(context.slotIndex, placements);
      break;
    }

    case 'FIRE': {
      const context = wsToRoom.get(ws);
      if (!context?.roomCode) return send(ws, { type: 'ERROR', code: 'NOT_IN_ROOM', message: 'Not in a room' });

      const room = getRoom(context.roomCode);
      if (!room) return;

      const result = room.fireShot(context.slotIndex, msg.coordinate);
      if (result.error) {
        send(ws, { type: 'FIRE_ERROR', code: result.error });
      }
      break;
    }

    case 'PLAY_DAILY': {
      const room = createRoom('daily', 'impossible');
      const { slot, token } = room.addPlayer(ws);
      room.setAvatar(slot - 1, sanitizeAvatar(msg.avatar));
      room.addBot();
      wsToRoom.set(ws, { roomCode: room.code, slotIndex: slot - 1 });
      send(ws, { type: 'ROOM_READY', roomCode: room.code, playerSlot: slot, playerToken: token, gameMode: 'daily', botDifficulty: 'impossible' });
      room.startPlacement();
      break;
    }

    case 'CHAT': {
      const context = wsToRoom.get(ws);
      if (!context?.roomCode) return;
      const room = getRoom(context.roomCode);
      if (!room) return;
      const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, 200) : '';
      if (!text) return;
      room.broadcast({ type: 'CHAT', text, senderSlot: context.slotIndex + 1 });
      break;
    }

    case 'EMOJI': {
      const context = wsToRoom.get(ws);
      if (!context?.roomCode) return;
      const room = getRoom(context.roomCode);
      if (!room) return;
      const VALID = ['😂', '💀', '🔥', '👍', '😤', '🎯', '😱', '🤡'];
      if (!VALID.includes(msg.emoji)) return;
      room.broadcast({ type: 'EMOJI', emoji: msg.emoji, senderSlot: context.slotIndex + 1 });
      break;
    }

    case 'REMATCH': {
      const context = wsToRoom.get(ws);
      if (!context?.roomCode) return;
      const room = getRoom(context.roomCode);
      if (!room || room.state !== 'finished') return;
      room.voteRematch(context.slotIndex);
      break;
    }

    case 'FORFEIT': {
      const context = wsToRoom.get(ws);
      if (!context?.roomCode) return;
      const room = getRoom(context.roomCode);
      if (room) room.forfeit(context.slotIndex);
      break;
    }

    case 'RECONNECT': {
      const room = getRoom(msg.roomCode);
      if (!room) return send(ws, { type: 'RECONNECT_FAILED' });

      const slotIndex = room.getPlayerByToken(msg.playerToken);
      if (slotIndex === -1) return send(ws, { type: 'RECONNECT_FAILED' });

      wsToRoom.set(ws, { roomCode: room.code, slotIndex });
      room.reconnect(slotIndex, ws);
      break;
    }

    default:
      send(ws, { type: 'ERROR', code: 'UNKNOWN_TYPE', message: `Unknown message type: ${msg.type}` });
  }
}

export function handleDisconnect(ws, wsToRoom) {
  const context = wsToRoom.get(ws);
  if (!context) return;

  dequeueQuickMatch(ws);

  if (context.roomCode) {
    const room = getRoom(context.roomCode);
    if (room) {
      if (context.isSpectator) {
        room.removeSpectator(ws);
      } else if (context.slotIndex !== null && context.slotIndex >= 0) {
        room.disconnect(context.slotIndex);
        if (room.state === 'finished') {
          setTimeout(() => deleteRoom(context.roomCode), 5000);
        }
      }
    }
  }

  wsToRoom.delete(ws);
}
