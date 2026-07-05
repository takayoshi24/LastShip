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
      const room = createRoom('pvp');
      const { slot, token } = room.addPlayer(ws);
      wsToRoom.set(ws, { roomCode: room.code, slotIndex: slot - 1 });
      send(ws, { type: 'ROOM_READY', roomCode: room.code, playerSlot: slot, playerToken: token });
      break;
    }

    case 'JOIN_ROOM': {
      const room = getRoom(msg.roomCode);
      if (!room) return send(ws, { type: 'ERROR', code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      if (room.isFull()) return send(ws, { type: 'ERROR', code: 'ROOM_FULL', message: 'Room is full' });
      if (room.state !== 'waiting') return send(ws, { type: 'ERROR', code: 'ROOM_STARTED', message: 'Game already started' });

      const { slot, token } = room.addPlayer(ws);
      wsToRoom.set(ws, { roomCode: room.code, slotIndex: slot - 1 });

      const ready = { type: 'ROOM_READY', roomCode: room.code };
      // Notify both players
      const p1 = room.players[0];
      send(p1.ws, { ...ready, playerSlot: 1, playerToken: p1.token });
      send(ws, { ...ready, playerSlot: slot, playerToken: token });

      room.startPlacement();
      break;
    }

    case 'QUICK_MATCH': {
      const result = enqueueQuickMatch(ws);
      if (result.queued) {
        wsToRoom.set(ws, { roomCode: null, slotIndex: null, inQueue: true });
        send(ws, { type: 'QUEUE_JOINED' });
      } else {
        const room = result.room;
        const slotIndex = room.players.findIndex(p => p && p.ws === ws);
        wsToRoom.set(ws, { roomCode: room.code, slotIndex });
      }
      break;
    }

    case 'CANCEL_QUEUE': {
      dequeueQuickMatch(ws);
      wsToRoom.delete(ws);
      send(ws, { type: 'QUEUE_CANCELLED' });
      break;
    }

    case 'PLAY_BOT': {
      const room = createRoom('bot');
      const { slot, token } = room.addPlayer(ws);
      room.addBot();
      wsToRoom.set(ws, { roomCode: room.code, slotIndex: slot - 1 });
      send(ws, { type: 'ROOM_READY', roomCode: room.code, playerSlot: slot, playerToken: token });
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
        // Trigger ready with no placements — handled by timeout rule
        room.submitPlacement(context.slotIndex, []);
        return;
      }

      const validation = validatePlacements(placements);
      if (!validation.valid) {
        return send(ws, { type: 'PLACEMENT_ERROR', reason: validation.reason });
      }

      room.submitPlacement(context.slotIndex, placements);
      send(ws, { type: 'PLACEMENT_ACCEPTED' });
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
    if (room && context.slotIndex !== null) {
      room.disconnect(context.slotIndex);

      if (room.state === 'finished') {
        setTimeout(() => deleteRoom(context.roomCode), 5000);
      }
    }
  }

  wsToRoom.delete(ws);
}
