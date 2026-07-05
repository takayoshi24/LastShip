# LastShip

Browser-based Battleship — play online against a friend in a private room, join a quick match with a stranger, or go solo against the bot. No account required.

## Stack

| Layer | Technology |
|-------|-----------|
| Client | React 19, Vite, Framer Motion, @dnd-kit |
| Server | Node.js, `ws` (WebSocket) |
| Transport | WebSocket (no REST) |

## Project structure

```
LastShip/
├── client/          # React + Vite frontend
│   └── src/
│       ├── components/   # PlacementPhase, GameBoard, UI components
│       ├── context/      # GameContext (WebSocket state machine)
│       ├── pages/        # LobbyPage, GamePage
│       ├── services/     # websocket.js, explosion.js
│       └── utils/        # grid.js (shared cell math)
└── server/          # Node.js WebSocket server
    └── src/
        ├── config/       # fleet.js (ship definitions)
        ├── core/         # gameLogic.js, botAI.js
        ├── handlers/     # messageRouter.js
        └── room/         # Room.js, registry.js
```

## Local development

### Prerequisites

- Node.js 18+

### Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### Start the server

```bash
cd server
npm run dev
```

Runs on `ws://localhost:3001`. Uses `--watch` so it restarts on file changes.

### Start the client

```bash
cd client
npm run dev
```

Runs on `http://localhost:5173`.

## Playing over a local network (WiFi)

To play on another device on the same WiFi network (phone, another PC, etc.):

### 1 — Find your local IP

```powershell
ipconfig
```

Look for the **IPv4 Address** on your WiFi adapter (e.g. `192.168.0.20`). Use the WiFi IP even if your PC is also on ethernet — the other device must be on the same subnet.

### 2 — Open firewall ports

Windows blocks inbound connections by default. Run these once in an **Administrator** PowerShell:

```powershell
netsh advfirewall firewall add rule name="LastShip WS Server" dir=in action=allow protocol=TCP localport=3001 profile=any
netsh advfirewall firewall add rule name="LastShip Vite Dev" dir=in action=allow protocol=TCP localport=5173 profile=any
```

| Port | Service |
|------|---------|
| `3001` | WebSocket game server |
| `5173` | Vite dev server (game UI) |

To remove the rules later:
```powershell
netsh advfirewall firewall delete rule name="LastShip WS Server"
netsh advfirewall firewall delete rule name="LastShip Vite Dev"
```

### 3 — Start the client with your local IP

```powershell
cd client
$env:VITE_WS_URL="ws://192.168.0.20:3001"; npm run dev -- --host
```

Replace `192.168.0.20` with your actual WiFi IP.

### 4 — Connect from the other device

Open in the browser on the other device (screen must be on):

```
http://192.168.0.20:5173
```

> **Important:** type the full `http://` prefix. Mobile browsers will force HTTPS if you omit it, which breaks the connection.

## Game modes

| Mode | How to start |
|------|-------------|
| Quick Match | Joins a public queue — auto-paired with the next player |
| Private Room | Generates a room code and shareable URL — send the link to a friend |
| Play vs Bot | Instant game against the server-side AI |

## Rules

- 10×10 grid, fleet of 5 ships (Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2)
- 60-second ship placement phase — unplaced ships are auto-placed randomly if time runs out
- 5-minute turn timer — missing the timer forfeits the game
- First to sink all opponent ships wins

## Reconnecting

Session tokens are stored in `localStorage`. If you lose connection or refresh, the game restores automatically within 30 seconds. If the opponent doesn't reconnect within 30 seconds, you win by default.
