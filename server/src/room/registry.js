import { Room } from './Room.js';

const rooms = new Map();
const quickMatchQueue = [];

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

export function createRoom(type = 'pvp', botDifficulty = 'medium') {
  const code = generateCode();
  const room = new Room(code, type, botDifficulty);
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get(code) ?? null;
}

export function deleteRoom(code) {
  const room = rooms.get(code);
  if (room) {
    room.cleanup();
    rooms.delete(code);
  }
}

export function enqueueQuickMatch(ws, avatar, gameOptions = {}, accountToken = null) {
  const salvo = !!gameOptions.salvo;
  const fog = !!gameOptions.fog;
  const matchIdx = quickMatchQueue.findIndex(e =>
    !!e.gameOptions.salvo === salvo && !!e.gameOptions.fog === fog
  );

  if (matchIdx !== -1) {
    const [waiting] = quickMatchQueue.splice(matchIdx, 1);
    const room = createRoom('pvp');
    room.setGameOptions({ salvo, fog });
    const p1 = room.addPlayer(waiting.ws);
    const p2 = room.addPlayer(ws);
    room.setAvatar(p1.slot - 1, waiting.avatar);
    room.setAvatar(p2.slot - 1, avatar);
    room.setAccountToken(p1.slot - 1, waiting.accountToken);
    room.setAccountToken(p2.slot - 1, accountToken);

    const ready = { type: 'ROOM_READY', roomCode: room.code, gameOptions: room.gameOptions };
    waiting.ws.send(JSON.stringify({ ...ready, playerSlot: p1.slot, playerToken: p1.token }));
    ws.send(JSON.stringify({ ...ready, playerSlot: p2.slot, playerToken: p2.token }));

    room.startPlacement();
    return { queued: false, room };
  }

  quickMatchQueue.push({ ws, avatar, gameOptions: { salvo, fog }, accountToken });
  return { queued: true };
}

export function dequeueQuickMatch(ws) {
  const idx = quickMatchQueue.findIndex(e => e.ws === ws);
  if (idx !== -1) quickMatchQueue.splice(idx, 1);
}

export function getRooms() {
  return rooms;
}
