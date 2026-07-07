import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { handleMessage, handleDisconnect } from './handlers/messageRouter.js';
import { getRankings, addEntry } from './rankings/storage.js';
import { consumeRankingToken } from './rankings/tokens.js';

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

const httpServer = createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/api/rankings') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    if (req.method === 'GET') {
      const rankings = getRankings();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(rankings));
    }

    if (req.method === 'POST') {
      let data;
      try { data = JSON.parse(await readBody(req)); } catch {
        res.writeHead(400); return res.end('Bad request');
      }
      const { name, token } = data ?? {};
      const trimmedName = typeof name === 'string' ? name.trim().slice(0, 20) : '';
      if (!trimmedName || !token) {
        res.writeHead(400); return res.end('Missing name or token');
      }
      const entry = consumeRankingToken(token);
      if (!entry) { res.writeHead(403); return res.end('Invalid or expired token'); }
      const rankings = addEntry(trimmedName, entry.duration);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(rankings));
    }

    res.writeHead(405); return res.end();
  }

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

function broadcastPlayerCount() {
  const msg = JSON.stringify({ type: 'PLAYER_COUNT', count: wss.clients.size });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

wss.on('connection', (ws) => {
  console.log(`[WS] Client connected (total: ${wss.clients.size})`);
  broadcastPlayerCount();

  ws.on('message', (data) => {
    handleMessage(ws, data.toString(), wsToRoom);
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected (total: ${wss.clients.size})`);
    handleDisconnect(ws, wsToRoom);
    broadcastPlayerCount();
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`LastShip running on http://0.0.0.0:${PORT}`);
});
