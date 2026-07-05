import { WebSocketServer } from 'ws';
import { handleMessage, handleDisconnect } from './handlers/messageRouter.js';

const PORT = process.env.PORT ?? 3001;
const wss = new WebSocketServer({ port: PORT });

// Maps each WS connection to its room context
const wsToRoom = new Map();

wss.on('connection', (ws) => {
  console.log(`[WS] Client connected (total: ${wss.clients.size})`);

  ws.on('message', (data) => {
    handleMessage(ws, data.toString(), wsToRoom);
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected (total: ${wss.clients.size})`);
    handleDisconnect(ws, wsToRoom);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
  });
});

console.log(`LastShip server running on ws://localhost:${PORT}`);
