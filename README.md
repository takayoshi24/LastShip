# LastShip

Browser-based Battleship — play against a friend in a private room, join a quick match with a stranger, or fight the bot at five difficulty levels. No account required.

## Stack

| Layer | Technology |
|-------|-----------|
| Client | React 19, Vite, Framer Motion, @dnd-kit |
| Server | Node.js 20, `ws` (WebSocket) |
| Transport | WebSocket only (no REST) |

## Project structure

```
LastShip/
├── client/              React + Vite frontend
│   ├── public/audio/    Sound effects (.mp3)
│   └── src/
│       ├── components/  PlacementPhase, GameBoard, UI components
│       ├── context/     GameContext (WebSocket state machine)
│       ├── pages/       LobbyPage, GamePage
│       ├── services/    websocket.js, explosion.js
│       └── utils/       grid.js (cell math)
├── server/              Node.js server
│   └── src/
│       ├── config/      fleet.js (ship definitions)
│       ├── core/        gameLogic.js, botAI.js
│       ├── handlers/    messageRouter.js
│       └── room/        Room.js, registry.js
├── Dockerfile
└── package.json         Root scripts for build and start
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20+

## Local development

Install all dependencies from the repo root:

```bash
npm run install:all
```

Start the server (restarts on file changes):

```bash
npm run dev:server
```

In a second terminal, start the client dev server:

```bash
npm run dev:client
```

Open `http://localhost:5173`. The client connects to the WebSocket server at `ws://localhost:3000` by default.

To play on another device on the same network, set `VITE_WS_URL` when starting the client:

```bash
VITE_WS_URL=ws://192.168.0.20:3000 npm run dev:client -- --host
```

Then open `http://192.168.0.20:5173` on the other device.

## Production

Build the client and serve everything from a single Node.js process on one port:

```bash
npm run build   # compiles client into client/dist/
npm start       # serves HTTP + WebSocket on port 3000
```

The server serves the React app as static files and handles WebSocket upgrades on the same port — no reverse proxy is needed for basic deployments.

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on |
| `VITE_WS_URL` | derived from `window.location` | Override WebSocket URL at build time (only needed for split deployments) |

### Docker

```bash
docker build -t lastship .
docker run -p 3000:3000 lastship
```

The multi-stage Dockerfile builds the client then packages only the server and compiled assets into a lean Alpine image.

### VPS / server (AlmaLinux / Ubuntu example)

```bash
git clone https://github.com/takayoshi24/LastShip.git
cd LastShip
npm run install:all
npm run build

# keep the process alive
npm install -g pm2
pm2 start server/src/server.js --name lastship
pm2 save && pm2 startup
```

Open port 3000 in the firewall (AlmaLinux):

```bash
firewall-cmd --permanent --add-port=3000/tcp && firewall-cmd --reload
```

To put Nginx in front with HTTPS, proxy all traffic — including WebSocket upgrades — to `localhost:3000`:

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

## Game modes

| Mode | How to start |
|------|-------------|
| Quick Match | Joins a public queue — auto-paired with the next available player |
| Private Room | Generates a 6-character room code and shareable URL |
| Play vs Bot | Instant solo game — choose one of five difficulty levels |

### Bot difficulty levels

| Level | Strategy |
|-------|---------|
| Easy | Fires randomly — no targeting |
| Medium | Targets adjacent cells after a hit, locks to the ship axis when direction is known |
| Hard | Same as Medium + probability density to pick the statistically best search cell |
| Super Hard | Same as Hard + checkerboard parity filter — fires only at cells spaced by the smallest remaining ship size, halving the search space |
| Impossible | Cheats — reads ship positions directly on the server, never misses. Player always goes first to compensate. |

## Rules

- 10×10 grid, fleet of 5 ships: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
- 60-second placement phase — unplaced ships are auto-placed randomly when time runs out
- 5-minute turn timer — missing the timer forfeits the game
- First to sink all opponent ships wins
- Reconnect window: 30 seconds — opponent wins by default if you don't reconnect in time

## Features

**Visuals**

| Cell state | Visual |
|-----------|--------|
| Empty | Wave icon, low opacity |
| Your ship | Ship icon in light blue |
| Hit | Animated fire icon with orange glow + particle explosion |
| Sunk | Skull icon on dark red background |
| Miss | Dual sonar-ring pulse animation |

**Audio** — explosion on hit, water splash on miss. Sounds overlap so rapid shots don't cut each other off. Volume slider in the turn bar persists across sessions.

**Fleet panel** — lists every ship with a cell-count bar below both boards. Ships strike through when sunk. Enemy ship names are always visible so both players can track remaining fleet sizes.

**Reconnect** — session tokens are stored in `localStorage`. Refreshing or losing connection restores the game automatically within 30 seconds.

**Online count** — the lobby shows how many players are currently connected.

## Testing

```bash
cd server
npm test
```

Tests use [Vitest](https://vitest.dev/) and cover server-side game logic.

## Contributing

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make changes and run `cd server && npm test` to verify
3. Open a pull request against `master`
