# LastShip

Browser-based Battleship — play a friend in a private room, get matched with a stranger via quick match, or fight a bot at five difficulty levels. No account required to play.

## Stack

| Layer | Technology |
|-------|------------|
| Client | React 19, Vite, Framer Motion, @dnd-kit |
| Server | Node.js 20, `ws` (WebSocket) |
| Transport | WebSocket only — no REST for game state |
| Persistence | JSON files on disk (rankings, accounts) |

## Prerequisites

- [Node.js](https://nodejs.org/) 20+

## Local development

Install all dependencies from the repo root:

```bash
npm run install:all
```

Start the WebSocket/HTTP server (restarts on file change):

```bash
npm run dev:server
```

In a second terminal, start the Vite dev server:

```bash
npm run dev:client
```

Open `http://localhost:5173`. The client connects to `ws://localhost:3000` by default.

**Playing from another device on the same network** — set `VITE_WS_URL` at startup:

```bash
VITE_WS_URL=ws://192.168.0.20:3000 npm run dev:client -- --host
```

Then open `http://192.168.0.20:5173` on the other device.

## Production build

Compile the client and serve everything from a single process:

```bash
npm run build   # outputs to client/dist/
npm start       # HTTP + WebSocket on port 3000
```

The server serves the React app as static files and handles WebSocket upgrades on the same port — no reverse proxy needed for basic deployments.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on |
| `VITE_WS_URL` | derived from `window.location` | Override WebSocket URL at client build time — only needed when client and server are on different origins |

## Docker

```bash
docker build -t lastship .
docker run -p 3000:3000 lastship
```

The multi-stage Dockerfile builds the client then packages only the server and compiled assets into a lean Alpine image. Rankings and account data persist inside the container at `server/data/` — mount a volume if you need durability across restarts:

```bash
docker run -p 3000:3000 -v lastship-data:/app/server/data lastship
```

## VPS deployment (AlmaLinux / Ubuntu)

```bash
git clone https://github.com/takayoshi24/LastShip.git
cd LastShip
npm run install:all
npm run build

npm install -g pm2
pm2 start server/src/server.js --name lastship
pm2 save && pm2 startup
```

Open port 3000 in the firewall (AlmaLinux):

```bash
firewall-cmd --permanent --add-port=3000/tcp && firewall-cmd --reload
```

To front with Nginx and HTTPS, proxy all traffic including WebSocket upgrades:

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

| Mode | Description |
|------|-------------|
| **Quick Match** | Auto-paired with the next available player in the public queue |
| **Private Room** | Generates a 6-character room code and a shareable link |
| **Play vs Bot** | Instant solo game — pick one of five difficulty levels |
| **Daily Challenge** | Same seeded Impossible bot for everyone that day — win to appear on the daily leaderboard |

## Optional game rules

Toggle before starting a match (host's settings apply to both players in Quick Match):

| Option | Effect |
|--------|--------|
| **Salvo mode** | Each player fires one shot per surviving ship per turn instead of one per turn |
| **Fog of war** | Your own fleet board is hidden during play — you see hits and misses but not ship positions |

## Bot difficulty

| Level | Strategy |
|-------|----------|
| Easy | Fires at random cells |
| Medium | Targets adjacent cells after a hit; locks to the ship's axis once direction is confirmed |
| Hard | Medium + probability-density map to pick the statistically optimal search cell |
| Super Hard | Hard + checkerboard parity filter (only fires at cells spaced by the smallest remaining ship size) |
| Impossible | Reads ship positions directly on the server — never misses. Player always goes first to compensate. |

## Rules

- 10×10 grid, fleet of 5: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
- 60-second placement phase — unplaced ships are auto-placed randomly when time runs out
- 30-second turn timer — missing it auto-fires a random shot on your behalf
- First to sink all opponent ships wins
- Reconnect window: 30 seconds — opponent wins by default after that

## Features

### Accounts and ELO

Register with a name and 4–8 digit PIN to track your rating across sessions. ELO updates after every PvP match. Login is optional — unregistered players can play all modes anonymously.

### Avatars and themes

Pick a colour and emoji icon as your avatar before queuing. Choose from four UI colour themes (Default, Ocean, Retro, Dusk) via the lobby theme picker — preference is saved locally.

### Spectating

Enter a room code in the lobby, check **Spectate**, and click **Watch** to observe an active match in real time. Ship positions are hidden for both sides.

### Shot heatmap

The post-game screen shows a heatmap of where each player fired — useful for spotting patterns in targeting.

### Replay viewer

Step through every shot of a finished match turn by turn on the game-over screen.

### In-game chat

Send short text messages and quick emoji reactions (😂 💀 🔥 👍 😤 🎯 😱 🤡) to your opponent during a match.

### Hall of Fame

`/ranking` — daily and all-time leaderboards for the Impossible bot. Fastest clear wins. Only server-verified wins can be submitted.

### Stats page

`/stats` — session statistics stored in `localStorage`: win/loss record, shot accuracy, and per-game-mode breakdowns. Linked to your ELO if logged in.

### Audio

Hit plays an explosion sound; miss plays a water-splash. Sounds overlap so rapid shots don't cut each other off. Volume slider in the turn bar persists across sessions.

## Project structure

```
LastShip/
├── client/                  React + Vite frontend
│   ├── public/audio/        Sound effects (.mp3)
│   └── src/
│       ├── components/      PlacementPhase, GameBoard, modals, UI widgets
│       ├── context/         GameContext — WebSocket state machine
│       ├── pages/           LobbyPage, GamePage, RankingPage, StatsPage, SpectatePage
│       ├── services/        websocket.js, account.js, stats.js, explosion.js
│       └── utils/           grid.js (cell coordinate math)
├── server/
│   └── src/
│       ├── config/          fleet.js (ship definitions)
│       ├── core/            gameLogic.js, botAI.js, seededRandom.js
│       ├── handlers/        messageRouter.js (WebSocket message dispatch)
│       ├── rankings/        storage.js, tokens.js
│       ├── room/            Room.js (game state machine), registry.js
│       ├── services/        accounts.js (register, login, ELO)
│       └── server.js        HTTP + WebSocket entry point
├── tests/
│   └── lastship.spec.js     Playwright E2E suite (24 tests)
├── playwright.config.js
├── Dockerfile
└── package.json             Root scripts
```

## Testing

### Server unit tests

```bash
cd server && npm test
```

Uses [Vitest](https://vitest.dev/) and covers server-side game logic.

### E2E tests (Playwright)

Build the client first, then run:

```bash
npm run build
npm run test:e2e
```

Playwright checks for an existing server on port 3000 and starts one automatically if none is found. The suite covers: lobby UI, info modal, account register/login, navigation, private room creation, quick match and cancel, bot game flow (auto-placement → fire → verify hit/miss), forfeit confirmation, two-player PvP matchmaking, and spectator view.

Open the interactive UI runner:

```bash
npm run test:e2e:ui
```

## Contributing

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make changes and run `cd server && npm test` to verify server logic
3. Run `npm run test:e2e` to check the full flow
4. Open a pull request against `master`

For significant changes open an issue first to discuss the approach.

## License

MIT — see [LICENSE](LICENSE)
