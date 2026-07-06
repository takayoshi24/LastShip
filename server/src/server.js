import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { handleMessage, handleDisconnect } from './handlers/messageRouter.js';

const PORT = process.env.PORT ?? 3000;
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, '../../client/dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const httpServer = createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const filePath = join(DIST, url === '/' ? 'index.html' : url);

  try {
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(content);
  } catch {
    try {
      const content = await readFile(join(DIST, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch {
      res.writeHead(500);
      res.end('Server error');
    }
  }
});

const wss = new WebSocketServer({ server: httpServer });
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

httpServer.listen(PORT, () => {
  console.log(`LastShip running on http://localhost:${PORT}`);
});
