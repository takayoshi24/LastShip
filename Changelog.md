# Changelog

---
## 2026-07-07 — 1 commit on master

**Scope:** feat — Impossible bot ranking / hall of fame

### feat: ranking system gated behind beating the Impossible bot

- **Author:** Kamil Jendzul
- **Date:** 2026-07-07

Players who defeat the Impossible bot are issued a one-time server-side token included in the `GAME_OVER` WebSocket message. That token unlocks a name-entry form on the game-over screen; submitting it POSTs `{name, token}` to `POST /api/rankings`, where the server validates the token (UUID stored in memory with a 10-minute TTL, consumed on first use), records the entry with shot count and timestamp, and persists the sorted list to `server/data/rankings.json`. Shot count is tracked server-side in `Room.humanShotCount`, incremented each time the human fires a valid shot against the bot. The leaderboard is served at `GET /api/rankings` and displayed at a new `/ranking` route with medal icons (🥇🥈🥉) for the top three; it is accessible from a "Hall of Fame" link in the lobby.

**Files changed:**
- `server/src/rankings/storage.js` +28 (new) — `getRankings` / `addEntry` using `server/data/rankings.json`, sorted by shots, capped at 100 entries
- `server/src/rankings/tokens.js` +16 (new) — `createRankingToken` / `consumeRankingToken` with UUID + expiry Map
- `server/src/room/Room.js` +12 / -1 — `humanShotCount` field; incremented in `fireShot`; `_endGame` emits token to winner when impossible bot is beaten
- `server/src/server.js` +43 — `readBody` helper; `GET /api/rankings` and `POST /api/rankings` routes before static-file fallback; CORS headers
- `client/vite.config.js` +5 — proxy `/api` → `localhost:3000` for dev
- `client/src/context/GameContext.jsx` +3 / -1 — `rankingToken: null` in initial state; populated from `GAME_OVER` action
- `client/src/components/GameOver.jsx` +55 / -8 — gold-bordered ranking form shown when `rankingToken` present; async fetch POST; success link to `/ranking`
- `client/src/pages/RankingPage.jsx` +52 (new) — leaderboard table with medal icons, loading/empty states, date formatting
- `client/src/pages/LobbyPage.jsx` +3 / -1 — "Hall of Fame" link below the title
- `client/src/App.jsx` +2 — `/ranking` route added
- `client/src/index.css` +90 — styles for ranking lobby link, GameOver form, leaderboard table and row variants

---

**Summary:** This batch adds a persistent Impossible-bot hall of fame. The ranking is fully server-gated — a one-time cryptographic token proves the win is real, the shot count is measured server-side so it cannot be spoofed, and entries survive server restarts via a JSON file. Players who beat Impossible see a gold "enter the hall of fame" prompt on the game-over screen; everyone can browse the leaderboard from the lobby's "Hall of Fame" link. No entry is possible from PvP games or easier difficulty bots.

---
## 2026-07-07 — 1 commit on master

**Scope:** Bug fix — ship dragging broken on Android during placement phase

### fix: enable ship drag on Android with TouchSensor and touch-action: none

- **Author:** Kamil Jendzul
- **Date:** 2026-07-07

Android Chrome intercepts touch events for native scrolling before dnd-kit's `PointerSensor` can accumulate the 5 px distance threshold, so the drag was cancelled before it started. Three targeted changes fix this: `touchAction: 'none'` added to the `ShipDraggable` inline style tells Android to hand all touch events to JavaScript rather than reserving them for scroll; `TouchSensor` imported and registered alongside `PointerSensor` uses native `touchstart`/`touchmove` events directly, bypassing the Pointer Events API layer that Android was short-circuiting; and the `TouchSensor` uses a delay-based activation constraint (`delay: 150ms, tolerance: 5`) which is more reliable on Android than the distance-based constraint used for mouse/stylus.

**Files changed:**
- `client/src/components/PlacementPhase.jsx` — import `TouchSensor`; add `TouchSensor` to `useSensors`; add `touchAction: 'none'` to `ShipDraggable` style

---

**Summary:** Ship placement was completely non-functional on Android — touching a ship and dragging had no effect. The root cause was Android Chrome consuming touch events for scroll detection before dnd-kit could register a drag, combined with the absence of `touch-action: none` which is required to opt an element out of native touch handling. Adding `TouchSensor` with a short hold delay and `touchAction: 'none'` on the draggable restores full drag-and-drop placement on Android without affecting iPhone or desktop.

---
## 2026-07-05 — 1 commit on feat/audio-hit-miss-volume

**Scope:** Sound effects for hit/miss and manual volume control

### feat: explosion sound on hit, water sound on miss, volume slider

- **Author:** Kamil Jendzul
- **Date:** 2026-07-05

Hit events play `Explosion_Sound_Effect.mp3` and miss events play `Explosion_Water_Sound_Effect.mp3`. Each play spawns a fresh `Audio` instance so sounds overlay each other freely. A volume slider in the turn bar (with mute/unmute icon) controls both sounds; the setting persists via `localStorage`.

**Files changed:**
- `client/public/audio/` — added `Explosion_Sound_Effect.mp3` and `Explosion_Water_Sound_Effect.mp3`
- `client/src/components/GameBoard.jsx` — volume state + `explosionAudioRef` as volume store; hit/miss audio playback; `LuVolume2`/`LuVolumeX` slider in turn bar
- `client/src/index.css` — `.volume-control` and range input styles

---

**Summary:** The game now plays distinct sound effects on hit (explosion) and miss (water splash), with each sound able to overlap itself for rapid fire. A compact volume slider in the turn bar lets players adjust or mute audio at any time, with the preference saved across sessions.

---
## 2026-07-05 — 1 commit on feat/ship-icons-and-fleet-legend

**Scope:** Ship cell icons + fleet info in sunk ships panel

### feat: FaShip icon on ship cells; cell-count legend in sunk ships panel

- **Author:** Kamil Jendzul
- **Date:** 2026-07-05

Ship cells on the fleet board now render a `FaShip` icon (react-icons/fa) in light blue so occupied cells are visually distinct from empty sea. The sunk ships panel (`SunkShipsList`) now shows each ship's real name (removed the `?????` mask for enemy ships) alongside a row of small coloured squares representing its cell count — in both "Your ships" and "Enemy ships" columns.

**Files changed:**
- `client/src/components/GameBoard.jsx` — import `FaShip`; render ship icon for `s === 'ship'`
- `client/src/components/SunkShipsList.jsx` — both columns use flex ship-tag with name + cell squares; enemy column shows real name
- `client/src/index.css` — `.ship-tag` flex layout; `.ship-tag-name/cells/cell` styles; `.ship-cell-icon` style

---

**Summary:** Ship cells now show a `FaShip` icon for instant fleet readability, and the sunk-ships panel lists every ship by real name with a mini cell-count bar so both players can track remaining fleet sizes at a glance.

---
## 2026-07-05 — 1 commit on feat/miss-sonar-animation

**Scope:** Sonar ping animation on miss cells using SiSonarqubeserver

### feat: dual sonar ping animation on miss cells

- **Author:** Kamil Jendzul
- **Date:** 2026-07-05

Miss cells now render two overlapping `SiSonarqubeserver` icons (react-icons/si) that pulse together in a sonar-ping loop. Both icons sit at the same center point via `position: absolute; inset: 0` inside a `.sonar-wrap` container. The animation (`sonarAnim`) expands each icon from `scale: 0` to `scale: 1.2` while fading `opacity: 1 → 0`, then silently resets at `scale: 0` while invisible — ensuring the loop restart is seamless with no visible jump. The second icon has `initial={{ rotate: 90 }}` so it is permanently oriented 90° from the first, giving the combined pair a crosshair-like appearance. Both fire simultaneously on the same 2.2 s `easeOut` cycle.

**Files changed:**
- `client/src/components/GameBoard.jsx` — `SiSonarqubeserver` import; `sonarAnim` constant; dual sonar render in fleet and attack miss cells
- `client/src/index.css` — `.sonar-wrap` positioned container; `.sonar-icon` absolute inset styles; `.grid-cell.miss` overflow visible

---

**Summary:** Miss cells now show a distinctive dual sonar-ping animation — two `SiSonarqubeserver` icons at 0° and 90° pulsing outward in sync from cell centre and fading as they expand, like a real sonar sweep. The seamless loop is achieved by resetting the scale to zero while opacity is already zero, so the snap-back is invisible.

---
## 2026-07-05 — 1 commit on feat/sea-icons-skull-fire-home-fix

**Scope:** Board icons (sea/skull/fire), fire animation polish, connecting screen home button

### feat: sea/skull/fire board icons, fire animation polish, connecting screen home button

- **Author:** Kamil Jendzul
- **Date:** 2026-07-05

**Sea icon on empty cells:** Every empty cell on both the fleet and attack boards now shows `LuEqualApproximately` (react-icons/lu) — a wavy double-line that reads as a water surface. Rendered at 55% of cell size in light blue (`#4fc3f7`) at 30% opacity so it stays subtle and doesn't compete with hits, ships, or misses. `display: flex / align-items: center / justify-content: center` was moved to the base `.grid-cell` rule so all icon states (sea, skull, fire) centre automatically — removing the duplicate flex declarations that were previously on `.grid-cell.hit` and `.grid-cell.sunk`.

**Skull icon on sunk cells:** `GiHarryPotterSkull` (react-icons/gi) renders centred inside every sunk cell on both boards, replacing the CSS `::after` emoji approach. Styled white at 55% of cell size against the dark red sunk background.

**Fire icon on hit cells:** `SiFireship` (react-icons/si) renders inside hit cells with a framer-motion animation that simulates real flame. The icon is anchored at its bottom centre (`transformOrigin: '50% 100%'`) so the base stays fixed while the top sways — `rotate` oscillates −3° to +4°, `scaleY` pulses 1.0 → 1.11, and `opacity` flickers, all on a `linear` ease over 2 s for smooth continuous motion rather than the jarring `easeInOut` jumps of the previous version. Icon colour is deep dark red (`#7a1200`) with layered drop-shadows (`#ff2200` core, `#ff6600` halo) for a glowing-ember look against the bright red hit-cell background. The `prefers-reduced-motion` guard was also removed so the explosion burst fires on Windows PCs with animations disabled in Ease of Access.

**Connecting screen home button:** The `screen === 'lobby'` early-return branch in `GamePage` previously rendered before `<RoomInfo>`, so the `← Home` button was absent while the "Connecting to room…" message was shown. `RoomInfo` is now included in that early return. The redundant "Back to Lobby" button that was only shown on `reconnectFailed` was removed since `RoomInfo`'s home button already handles navigation and forfeit cleanup.

**react-icons installed:** Added `react-icons` as a client dependency (`npm install react-icons`).

**Files changed:**
- `client/package.json` — react-icons dependency added
- `client/package-lock.json` — lockfile updated
- `client/src/components/GameBoard.jsx` — LuEqualApproximately, GiHarryPotterSkull, SiFireship imports and renders; fireShipAnim revised
- `client/src/index.css` — `.grid-cell` base gets flex; `.sea-icon`, `.fire-ship-icon`, `.skull-icon` styles; fire-glow keyframe; sunk position:relative
- `client/src/pages/GamePage.jsx` — RoomInfo shown on connecting screen; redundant Back to Lobby button removed

---

**Summary:** This batch transforms the game boards visually and polishes two UX issues. Empty cells now display a subtle wavy sea icon, hit cells show a flickering fire-ship icon that sways realistically from its base, and sunk cells show a skull — giving each board state a distinct, readable identity. The fire animation was reworked from jumping `easeInOut` keyframes to smooth `linear` motion anchored at the bottom, and the icon colour was deepened for contrast against the red background. On the UX side, the connecting screen now correctly shows the `← Home` button that was missing from the early-return render path.

---
## 2026-07-05 — 1 commit on fix/hit-explosion-ws-placement

**Scope:** Hit explosion animation, fire glow on hit cells, WebSocket message-drop fix, PLACEMENT_ACCEPTED race condition fix

### feat: explosion and fire on hit; fix WS message drop and placement-accepted race

- **Author:** Kamil Jendzul
- **Date:** 2026-07-05

**Explosion on hit cells:** `GameBoard.jsx` canvas block refactored to cover both outcomes — when a shot is a `sunk`, the full multi-cell explosion burst fires across all the ship's cells as before; when the result is a plain `hit`, `triggerExplosion` now fires at that single cell's screen position. Previously only sunk ships triggered a particle burst; individual hits had no canvas feedback. The `prefers-reduced-motion` guard was also removed from `explosion.js` — explosions are functional game feedback (they confirm a hit), not decorative animation, so suppressing them based on an OS accessibility preference caused the feature to be silently absent on Windows PCs where "Show animations" is disabled in Ease of Access settings. The guard was the reason explosions worked on iPhone but not PC.

**Fire glow on hit cells:** `.grid-cell.hit` now carries a looping `fire-glow` CSS keyframe animation. The `box-shadow` pulses between a deep red-orange inner halo (`#ff4500`) and an outer gold bloom (`#ffd700`) at 0.5 s intervals, giving burning cells a persistent flickering-fire appearance. Because framer-motion only controls `scale` and `backgroundColor` via inline styles, the `box-shadow` animation runs independently without conflict.

**WebSocket message-drop fix:** `send()` previously called `socket.send()` only if `readyState === OPEN`, silently discarding messages when the socket was still connecting. If a player clicked Quick Match before the WebSocket finished opening, the `QUICK_MATCH` message was lost — the UI showed "Waiting for opponent" but the server never received the request and the player was never queued. A `pending` buffer now collects messages sent while the socket is connecting; on `onopen`, if no reconnect token is present the buffer is flushed in order. If a reconnect token exists, the buffer is discarded and `RECONNECT` takes priority. The buffer is also cleared on `onclose` so stale game actions are not replayed after a reconnect.

**PLACEMENT_ACCEPTED race condition fix:** The second player to submit ships (via auto-place or manual Ready) received messages in the order `GAME_START` → `YOUR_PLACEMENTS` → `PLACEMENT_ACCEPTED`. The reducer handles `PLACEMENT_ACCEPTED` by setting `screen: 'placed'`, which overwrote the `screen: 'game'` set by `GAME_START` — leaving the second player stuck on the "Ships submitted! Waiting for opponent…" spinner while the first player was already in the game. Fixed by sending `PLACEMENT_ACCEPTED` to the submitting player *before* calling `room.submitPlacement()` in `messageRouter.js`. Since `submitPlacement` may call `_startGame()` which broadcasts `GAME_START`, swapping the order guarantees `PLACEMENT_ACCEPTED` always arrives first and the screen transitions go `placement → placed → game` in the correct sequence.

**Files changed:**
- `client/src/components/GameBoard.jsx` — explosion on hit; canvas block refactored
- `client/src/index.css` — `fire-glow` keyframe animation on `.grid-cell.hit`
- `client/src/services/explosion.js` — removed `prefers-reduced-motion` guard
- `client/src/services/websocket.js` — outgoing message buffer; flush on open
- `server/src/handlers/messageRouter.js` — `PLACEMENT_ACCEPTED` sent before `submitPlacement`

---

**Summary:** This batch delivers two visual improvements and closes two bugs. Hit cells now produce a canvas particle burst on impact and pulse with a persistent fire-glow animation, making every successful shot visually distinct from a miss. Two silent failures were fixed: players who clicked Quick Match before the WebSocket finished connecting were never actually queued because the message was dropped (the UI showed "Waiting" but the server had no record of them), and the second player to auto-place ships was immediately kicked back to the waiting spinner because `PLACEMENT_ACCEPTED` arrived after `GAME_START` and overwrote the game screen state — only the first player made it into the game.

---
## 2026-07-05 — 2 commits on master

**Scope:** Quick Match broken + reconnect loses turn ownership; Return and Forfeit buttons added (PRs #42–#43)

### 4ad2260 — feat: add Return (Home) button and Forfeit button

- **Author:** Kamil Jendzul
- **Date:** 2026-07-05
- **Hash:** `4ad2260fdc494d2d9abc4516f95cb512390f9d8c`

Two new controls. **Return (← Home)** in the RoomInfo bar: always visible on every game screen; if the player is in an active game it sends `FORFEIT` first so the opponent gets an immediate win rather than waiting 30 seconds for the disconnect timeout, then resets client state and navigates to the lobby. **Forfeit** in the GameBoard turn-bar: two-step confirmation to prevent accidental taps on mobile — first tap turns the button red and shows "Confirm?" alongside a "Cancel" button; a second tap sends `FORFEIT`; the confirmation auto-cancels after 4 seconds with no action. After forfeiting the opponent wins immediately and both players see the gameover screen so they can play again or return to the lobby. Server adds `Room.forfeit(slotIndex)` which calls `_endGame` with the opponent as winner only if the room is in `active` state, making late or duplicate forfeits no-ops.

**Files changed:**
- `client/src/components/GameBoard.jsx` +27 / -1
- `client/src/components/RoomInfo.jsx` +11 / -0
- `client/src/index.css` +4 / -0
- `server/src/handlers/messageRouter.js` +8 / -0
- `server/src/room/Room.js` +5 / -0

---

### 83e0cbb — fix: quick match first player can't fire; reconnect loses playerSlot

- **Author:** Kamil Jendzul
- **Date:** 2026-07-05
- **Hash:** `83e0cbb4d33cfe3df7b30ec4e06e892ce04b4fdd`

Two bugs fixed. **Quick Match**: `enqueueQuickMatch` dequeues the waiting player and sends `ROOM_READY` to both, but `messageRouter` only updated `wsToRoom` for the second (newly arriving) player. The first player kept `roomCode: null`, so every `FIRE` and `PLACE_SHIPS` they sent hit the `NOT_IN_ROOM` guard and was silently dropped — the game was permanently stuck on their turn with neither player able to proceed. Fixed by also registering the waiting player's `wsToRoom` entry when the match is made. **Reconnect**: `RECONNECT_SUCCESS` did not include `playerSlot` in its payload. After a page refresh the React state resets to `null`, so after reconnecting the client's `playerSlot` stayed `null`, `isMyTurn` was always `false`, and the player saw "Opponent's turn" for the rest of the game. Fixed by including `playerSlot: slotIndex + 1` in the server's reconnect response and applying it in the client reducer.

**Files changed:**
- `client/src/context/GameContext.jsx` +1 / -0
- `server/src/handlers/messageRouter.js` +4 / -0
- `server/src/room/Room.js` +1 / -0

---

**Summary:** This batch resolves three blocking issues: Quick Match was completely broken for the first queued player because their server-side room mapping was never updated after a match was made, silently discarding all their in-game actions; reconnecting after a page refresh lost the player's slot identity, causing the turn indicator to permanently show the wrong player's turn; and players had no way to voluntarily end a game or leave a screen. The fixes restore Quick Match parity, harden reconnect state restoration, and add Return and Forfeit controls with mobile-safe confirmation UX.

---
## 2026-07-05 — 1 commit on master

**Scope:** Bug fix — tapping attack cells does nothing on iPhone (PR #41)

### 704fb5b — fix: fire shots on iOS Safari by using onTap and cursor:pointer

- **Author:** Kamil Jendzul
- **Date:** 2026-07-05
- **Hash:** `704fb5b696419d2a5789a62307282d6123a46aaf`

iOS Safari only fires `click` events on `div` elements that have `cursor: pointer` in their computed style — a long-standing WebKit quirk that affects all non-interactive HTML elements. The attack-grid cells had `cursor: crosshair`, so every tap was silently dropped by iOS and no shot was ever sent. Two changes: `cursor: crosshair` changed to `cursor: pointer` on `.grid-cell.clickable` so iOS recognises the element as interactive; and `onClick` replaced with framer-motion's `onTap`, which is built on `PointerEvent` internally and fires regardless of cursor CSS, making the fix robust against any future cursor change.

**Files changed:**
- `client/src/components/GameBoard.jsx` +1 / -1
- `client/src/index.css` +1 / -1

**Summary:** On iPhone, tapping cells on the attack board had no effect — no shot was fired and no animation played. The cause was an obscure iOS Safari restriction: `click` events are suppressed on `div` elements unless `cursor: pointer` is set. The attack cells used `cursor: crosshair`, which iOS ignores for click hit-testing. Switching to `cursor: pointer` and replacing `onClick` with framer-motion's pointer-event-based `onTap` resolves the issue on all iOS versions.

---
## 2026-07-05 — 1 commit on master

**Scope:** Bug fix — Ready button stuck at "Sending..." after ships submitted (PR #40)

### c0072aa — fix: handle PLACEMENT_ACCEPTED so player leaves placement screen

- **Author:** Kamil Jendzul
- **Date:** 2026-07-05
- **Hash:** `c0072aa019bc56c4281eacd3a56e13baa818a848`

The reducer had no case for `PLACEMENT_ACCEPTED`, so when the server confirmed a valid ship placement the client simply ignored the message and stayed on `PlacementPhase` with the Ready button locked at "Sending..." indefinitely. Added three changes: a `'PLACEMENT_ACCEPTED'` case that transitions `screen` to the new `'placed'` state; a `'PLACEMENT_ERROR'` case that stores the rejection reason so `PlacementPhase` can unlock the button and display the error; and a "Waiting for opponent to be ready..." spinner panel in `GamePage` rendered for `screen === 'placed'`, giving the player clear feedback between submitting ships and `GAME_START` arriving.

**Files changed:**
- `client/src/components/PlacementPhase.jsx` +7 / -0
- `client/src/context/GameContext.jsx` +9 / -1
- `client/src/pages/GamePage.jsx` +6 / -0

**Summary:** Clicking Ready on the placement screen sent the ships to the server correctly, but because `PLACEMENT_ACCEPTED` had no reducer handler the client never left the placement screen. The fix adds proper state transitions and a waiting spinner.

---
## 2026-07-05 — 2 commits on master

**Scope:** Bug fix — mobile touch interactions broken after responsive layout (PR #39)

### 546e529 — fix: use PointerSensor so Ready button works on iOS/Android

- **Author:** Kamil Jendzul
- **Date:** 2026-07-05
- **Hash:** `546e529cdf4c9a252d0f696d1e33dcfa03a8551c`

`TouchSensor` calls `preventDefault()` on `touchstart` on draggable elements, blocking all subsequent `click` events in the same touch sequence on iOS Safari. Replaced with `PointerSensor(distance: 5)`.

**Files changed:**
- `client/src/components/PlacementPhase.jsx` +8 / -5

---

### 0f92938 — fix: restore touch interactions on mobile after responsive layout change

- **Author:** Kamil Jendzul
- **Date:** 2026-07-05
- **Hash:** `0f929389094d6bc1341f8e446190ec71b9f4c40c`

Configured dnd-kit `TouchSensor(delay: 200ms, tolerance: 8px)`, added `touch-action: manipulation` to buttons and `.grid-cell.clickable`, added `whileTap` scale feedback on attack cells.

**Files changed:**
- `client/src/components/GameBoard.jsx` +1 / -0
- `client/src/components/PlacementPhase.jsx` +4 / -1
- `client/src/index.css` +2 / -1

---

**Summary:** After the mobile responsive layout landed, touch interactions stopped working on phone. The fix switches to `PointerSensor` to avoid native touch event interception, adds `touch-action: manipulation`, and adds tap feedback on attack cells.

---
## 2026-07-05 — 10 commits on master

**Scope:** Code-review session — 4 bug fixes, 2 refactors, 3 dead-code removals, 1 performance improvement (issues #15–#24, PRs #25–#34)

**Summary:** This session closed all 10 issues raised in the code-review pass. Four bugs fixed (placed ships vanished during drag, sunk-ship explosions fired on wrong board, placed ships lost their accent border, explosion particles drifted off-center). Two refactors eliminated code duplication (`cellsFor` extracted, `withoutShip` deduplicated). Three dead CSS rules and one dead import deleted. `occupied` Set memoized.
