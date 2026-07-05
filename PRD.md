# PRD — LastShip: Browser-Based Battleship Game

## Problem Statement

Players want to play Battleship online against a specific friend or a bot, from any browser, without needing to install anything. There is no good lightweight option that supports real-time play, multiple simultaneous games, and a bot opponent in a single web app.

## Solution

A web-based Battleship game where players can create a private room and share a link with a friend, join a public quick match, or play solo against a bot. The game runs in the browser using React, communicates in real-time over WebSockets, and keeps all game state on the server to prevent cheating. Multiple games run concurrently in isolated rooms.

## User Stories

### Lobby & Matchmaking

1. As a player, I want to land on a home page and immediately see options to Quick Match, Create a Private Room, or Play vs Bot, so that I can start playing without signing up.
2. As a player, I want to click Quick Match and be placed in a public queue, so that I get paired with the next available stranger automatically.
3. As a player waiting in the Quick Match queue, I want to see a "waiting for opponent" indicator, so that I know the system is looking for someone.
4. As a player, I want to create a private room and receive a short room code and shareable URL, so that I can send it to a specific friend.
5. As a player, I want to share the room URL with a friend and have them join my exact room by opening that link, so that we play against each other and not a stranger.
6. As a player joining via a private link, I want the game to start automatically once both players are in the room, so that there is no extra confirmation step.
7. As a player, I want to click Play vs Bot and go directly to a game setup screen without going through the lobby, so that I can play alone immediately.

### Ship Placement

8. As a player, I want to see my 10x10 grid and a list of 5 ships to place before the game starts, so that I can set up my fleet.
9. As a player, I want to drag ships from a panel and drop them onto my grid, so that I can position them exactly where I want.
10. As a player, I want to rotate a ship before or during placement, so that I can place it horizontally or vertically.
11. As a player, I want the grid to visually reject an invalid placement (overlapping another ship or out of bounds), so that I always know if my placement is legal.
12. As a player, I want to see a countdown timer showing how much time I have left to place my ships (1 minute), so that I am not surprised when the game starts.
13. As a player who placed all 5 ships before the timer runs out, I want the game to begin as soon as my opponent is also ready, so that I am not kept waiting unnecessarily.
14. As a player who placed some ships but not all when the timer expires, I want the game to start with only the ships I placed, so that my positioning choices are respected.
15. As a player who placed zero ships when the timer expires, I want all 5 ships to be auto-placed randomly on my grid, so that I am not immediately at an impossible disadvantage.
16. As a bot opponent, I want my ships to be placed randomly on the grid at game start, so that the game can begin without delay.

### Gameplay

17. As a player, I want to see two grids side by side — my fleet grid and my attack grid (showing shots fired at the opponent) — so that I have full situational awareness.
18. As a player on my turn, I want to click a cell on the attack grid to fire at that coordinate, so that I can make my move.
19. As a player, I want to see immediate visual feedback (hit or miss marker) after I fire, so that I know the result of my shot.
20. As a player, I want to see a hit or miss marker appear on my fleet grid when my opponent fires at me, so that I can track damage to my ships.
21. As a player, I want to see a clear turn indicator showing whose turn it is, so that I never have to guess.
22. As a player, I want to see a 5-minute countdown timer on my turn, so that I know how much time I have to fire.
23. As a player who does not fire before the 5-minute turn timer expires, I want to forfeit the game automatically, so that the opponent is not left waiting indefinitely.
24. As a player, I want to see an animation when one of my opponent's ships is fully sunk, so that the moment feels impactful.
25. As a player, I want to see which of my opponent's ships have been sunk and which are still afloat, so that I can adjust my strategy.
26. As a player, I want the game to end and a winner to be declared as soon as all ships on one side are sunk, so that there is a clear conclusion.
27. As the winning player, I want to see a victory screen with the option to play again or return to the lobby, so that I can continue playing.
28. As the losing player, I want to see a defeat screen with the option to play again or return to the lobby, so that I can have a rematch.

### Bot AI

29. As a player facing the bot, I want the bot to fire at a random untried cell when it has no active target, so that the game feels challenging from the start.
30. As a player facing the bot, I want the bot to focus shots around a cell it has already hit, so that it behaves like a competent opponent.
31. As a player facing the bot, I want the bot to use knowledge of remaining ship sizes and already-shot cells to estimate the most probable locations, so that it plays intelligently rather than randomly.
32. As a player facing the bot, I want the bot to take its turn without a long delay, so that the game feels responsive.

### Disconnect & Reconnect

33. As a player who loses internet connection mid-game, I want the server to hold my game slot open for 30 seconds, so that a brief drop does not immediately cost me the game.
34. As a reconnecting player, I want to reopen the game URL and be automatically restored to my in-progress game, so that I do not have to rejoin manually.
35. As a player whose opponent does not reconnect within 30 seconds, I want to be declared the winner automatically, so that I am not stuck waiting forever.
36. As a player, I want my session token to be stored locally in my browser so that reconnect works even after a page refresh, so that accidental refreshes do not end my game.

## Implementation Decisions

- **Frontend:** React with Vite as the build tool. All game UI is DOM-based (no canvas primary renderer).
- **Animations:** Framer Motion handles ship-sink and hit/miss cell animations. A canvas overlay may be layered on top of the DOM grid for particle explosion effects on ship destruction only — it does not replace the DOM grid.
- **Real-time transport:** WebSockets. A single server instance handles all connections. Games are not recoverable if the server process restarts — this is an accepted v1 tradeoff.
- **Game state:** Fully server-side. The client is a dumb view. All move validation (shot legality, placement legality, win detection) runs on the server. The client never directly mutates game state.
- **Room system:** Every game (PvP or PvE) lives in a room with a unique short code. The room code is embedded in the shareable URL. Quick Match auto-creates a room and places it in a public queue; the server pairs the next queued player into it. Private rooms wait for a specific second player via the shared link.
- **Session identity:** On joining a room, the server issues a UUID player token. The client stores it in `localStorage`. On WebSocket reconnect, the client sends `{ roomId, playerToken }` and the server restores the game slot. Token is not tied to any account.
- **Fleet configuration:** Ship sizes and names are defined in a single config object, not hardcoded throughout the game logic. All placement, validation, and AI logic reads from this config. This makes future fleet customization a config change.

  ```js
  // Decision artifact — shape only, not a working snippet
  FLEET_CONFIG = [
    { name: 'Carrier', size: 5 },
    { name: 'Battleship', size: 4 },
    { name: 'Cruiser', size: 3 },
    { name: 'Submarine', size: 3 },
    { name: 'Destroyer', size: 2 },
  ]
  ```

- **Grid:** Standard 10x10. Coordinates are zero-indexed `[row, col]` internally.
- **Placement timeout rule:**
  - 0 ships placed → all 5 auto-placed randomly by server
  - 1–4 ships placed → game starts with only those ships; no auto-placement of the rest
  - 5 ships placed before timeout → game starts immediately when both players are ready
- **Turn timeout:** 5 minutes per turn. On expiry the server forfeits the game for the idle player — no auto-fire.
- **Disconnect timeout:** 30 seconds. Server runs the timer. If the server dies during the window, the game dies with it — accepted tradeoff.
- **Bot flow:** Play vs Bot bypasses the lobby entirely. A room is created server-side with one human slot and one bot slot. The bot responds to game events on the server — it is not a separate process.
- **Bot AI strategy:** Three phases — (1) random untried cell, (2) hunt around a confirmed hit, (3) probability density map weighted by remaining ship sizes and board constraints. The density calculation counts all valid placements of each remaining ship across untried cells and targets the highest-weight cell.
- **No authentication:** All players are anonymous. No login, no accounts, no persistent identity beyond the in-session localStorage token.

## Testing Decisions

A good test exercises observable behavior through a public interface and makes no assertions about internal implementation. Tests should not break when a function is renamed or an internal data structure changes — only when the externally visible behavior changes.

### Seam 1 — Server Game Logic (Pure Functions)
Test the core rules engine in isolation: ship placement validation (bounds, overlap), shot validation (already-shot cell, out-of-bounds), win condition detection, and timeout forfeit logic. These are pure functions that take state and return new state or errors. No WebSocket, no HTTP.

### Seam 2 — WebSocket Protocol (Integration)
Drive the server with a test WebSocket client. Cover the full message contract: room creation, player join, placement submission, shot fired, hit/miss/sink responses, disconnect and reconnect with token, and game-over event. This seam validates that client and server agree on the message shapes without involving the React UI.

### Seam 3 — Bot AI Module (Pure Functions)
Given a board state (shot history + remaining ship sizes), assert that the bot returns a valid, untried coordinate. Test each AI phase independently: random phase returns an untried cell, hunt phase targets cells adjacent to a hit, probability phase targets the highest-density cell. No WebSocket, no game loop.

### Seam 4 — React Components
Test grid rendering (correct cell states displayed), ship placement interactions (drag-and-drop fires the right placement event, rotation toggles correctly, invalid placements are rejected visually), and game state display (whose turn, timer, sunk ships list). WebSocket is mocked at the component boundary — components receive events and emit actions, tests verify the UI response.

## Out of Scope

- User accounts, authentication, or persistent identity across sessions
- Game history, match replays, or leaderboards
- Custom fleet configuration (ship sizes, counts, grid dimensions) — architecture supports it, UI does not expose it in v1
- Horizontal scaling or multi-server WebSocket coordination (e.g. Redis pub/sub)
- Game state persistence across server restarts
- Mobile-native app (web only, but responsive design is not explicitly excluded)
- Spectator mode
- Chat between players
- ELO or ranking system

## Further Notes

- The fleet config architecture decision is load-bearing for the stated future customization goal. Any developer working on game logic must read from `FLEET_CONFIG`, never from hardcoded numbers.
- The single-server constraint is a deliberate v1 simplification. When the project grows to need scaling, the WebSocket layer will need a pub/sub broker (Redis is the standard answer). This should be noted in the codebase when the WebSocket server is first written.
- The bot runs server-side. This prevents cheating (a client-side bot could read the server's hidden board state). It also means bot response time is controllable — add a short artificial delay so the bot does not feel instant.
