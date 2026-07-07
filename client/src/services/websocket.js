function getWsUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (import.meta.env.DEV) return 'ws://localhost:3000';
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}`;
}

const WS_URL = getWsUrl();

let socket = null;
const listeners = new Set();
let reconnectAttempts = 0;
const MAX_RECONNECT = 3;
let pending = [];

function connect() {
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    reconnectAttempts = 0;
    for (const fn of listeners) fn({ type: '_CONNECTED' });

    const token = localStorage.getItem('lastship_player_token');
    const roomCode = localStorage.getItem('lastship_room_code');
    if (token && roomCode) {
      pending = [];
      socket.send(JSON.stringify({ type: 'RECONNECT', roomCode, playerToken: token }));
    } else {
      const queued = pending.splice(0);
      for (const msg of queued) socket.send(msg);
    }
  };

  socket.onmessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    for (const fn of listeners) fn(msg);
  };

  socket.onclose = () => {
    pending = [];
    for (const fn of listeners) fn({ type: '_DISCONNECTED' });
    if (reconnectAttempts < MAX_RECONNECT) {
      reconnectAttempts++;
      setTimeout(connect, 1000);
    } else {
      for (const fn of listeners) fn({ type: '_RECONNECT_EXHAUSTED' });
    }
  };

  socket.onerror = () => {};
}

export function send(msg) {
  const data = JSON.stringify(msg);
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(data);
  } else {
    pending.push(data);
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function init() {
  if (!socket) connect();
}
