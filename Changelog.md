# Changelog

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

The reducer had no case for `PLACEMENT_ACCEPTED`, so when the server confirmed a valid ship placement the client simply ignored the message and stayed on `PlacementPhase` with the Ready button locked at "Sending..." indefinitely — effectively freezing the game until the 60-second placement timer expired and `GAME_START` eventually arrived (or never arriving in the 2-player case where the other player had not yet placed). Added three changes: a `'PLACEMENT_ACCEPTED'` case that transitions `screen` to the new `'placed'` state; a `'PLACEMENT_ERROR'` case that stores the rejection reason so `PlacementPhase` can unlock the button and display the error; and a "Waiting for opponent to be ready..." spinner panel in `GamePage` rendered for `screen === 'placed'`, giving the player clear feedback between submitting ships and `GAME_START` arriving.

**Files changed:**
- `client/src/components/PlacementPhase.jsx` +7 / -0
- `client/src/context/GameContext.jsx` +9 / -1
- `client/src/pages/GamePage.jsx` +6 / -0

**Summary:** Clicking Ready on the placement screen sent the ships to the server correctly, but because `PLACEMENT_ACCEPTED` had no reducer handler the client never left the placement screen — the button stayed frozen at "Sending..." and the player saw no indication that their submission was received. The fix adds proper state transitions: the player now immediately sees a spinner and "Waiting for opponent..." after submitting, the button unlocks and shows an error message if the server rejects the placement, and the game starts normally when `GAME_START` arrives.

---
## 2026-07-05 — 2 commits on master

**Scope:** Bug fix — mobile touch interactions broken after responsive layout (PR #39)

### 546e529 — fix: use PointerSensor so Ready button works on iOS/Android

- **Author:** Kamil Jendzul
- **Date:** 2026-07-05
- **Hash:** `546e529cdf4c9a252d0f696d1e33dcfa03a8551c`

`TouchSensor` calls `preventDefault()` on `touchstart` on draggable elements. On iOS Safari this blocks all subsequent `click` events in the same touch sequence — including on buttons that are outside `DndContext` entirely. Replaced `MouseSensor + TouchSensor` with a single `PointerSensor(distance: 5)`. Pointer events do not carry the same `preventDefault`-blocks-click behaviour as native touch events, so short taps fall through as normal clicks while a deliberate drag (≥5px pointer movement) still activates the drag gesture. Also added a `sending` state to the Ready button so it immediately renders "Sending..." on tap, giving the user visible confirmation that the touch registered before the server responds.

**Files changed:**
- `client/src/components/PlacementPhase.jsx` +8 / -5

---

### 0f92938 — fix: restore touch interactions on mobile after responsive layout change

- **Author:** Kamil Jendzul
- **Date:** 2026-07-05
- **Hash:** `0f929389094d6bc1341f8e446190ec71b9f4c40c`

First-pass fix for mobile touch interactions broken by PR #38. Configured dnd-kit with `TouchSensor(delay: 200ms, tolerance: 8px)` so short taps could fire as clicks, and added `touch-action: manipulation` to `button` elements (removes the 300ms double-tap-zoom delay browsers impose when they cannot classify a gesture) and to `.grid-cell.clickable` (tells the browser to treat a finger touch on attack cells as a tap rather than a scroll attempt). Also added `whileTap` scale animation to attack-grid cells as tactile feedback on touch devices where `whileHover` has no effect.

**Files changed:**
- `client/src/components/GameBoard.jsx` +1 / -0
- `client/src/components/PlacementPhase.jsx` +4 / -1
- `client/src/index.css` +2 / -1

---

**Summary:** After the mobile responsive layout landed (PR #38), touch interactions stopped working on phone — players could neither tap attack cells nor tap the Ready button. The root cause was dnd-kit's `TouchSensor`, which calls `preventDefault()` on `touchstart` on draggable ship elements; on iOS Safari this suppresses `click` events throughout the same touch sequence, even for buttons completely outside the `DndContext`. The fix switches to `PointerSensor` with a 5px distance threshold, which avoids native touch event interception while still supporting drag-and-drop. Supporting changes add `touch-action: manipulation` to buttons and clickable cells, a `whileTap` animation for attack-grid feedback, and a "Sending..." button state so players immediately know their Ready tap was received.

---
## 2026-07-05 — 1 commit on master (session 3)

**Scope:** Bug fix — private room placement starts before opponent joins (PR #36)

### 1e486c2 — fix: show waiting screen after creating private room until opponent joins (#36)

- **Author:** takayoshi24
- **Date:** 2026-07-05
- **Hash:** `1e486c205634b8fe724a16f5d2850aa1091a1d0c`

`CREATE_ROOM` sent `ROOM_READY` immediately, which caused the client to navigate to `/game/` and mount `PlacementPhase` — starting the 60-second countdown — before any opponent had connected. The server's placement timer only starts in `JOIN_ROOM`, so the two timers were never in sync and a player could exhaust their placement time before the opponent even arrived. `CREATE_ROOM` now sends `WAITING_FOR_OPPONENT` instead. The client stores the token/slot and transitions to a new `'waiting'` screen that displays the room URL so the creator can share it. When the second player joins, the server sends `ROOM_READY` to both players simultaneously and `startPlacement()` is called — both timers start at the same moment.

**Files changed:**
- `client/src/context/GameContext.jsx` +6 / -1
- `client/src/pages/GamePage.jsx` +9 / -0
- `client/src/pages/LobbyPage.jsx` +1 / -1
- `server/src/handlers/messageRouter.js` +1 / -1

**Summary:** Creating a private room immediately dropped the creator into the placement phase with a running countdown, even though no opponent had joined and the server hadn't started its own timer yet. The fix introduces a waiting screen with the shareable room URL; placement — and both timers — only begin once the second player connects.

---
## 2026-07-05 — 1 commit on master

**Scope:** Bug fix session — attack animation shared-state bug (PR #35)

### db3e694 — fix: scope shot animations to correct board and block re-firing (#35)

- **Author:** takayoshi24
- **Date:** 2026-07-05
- **Hash:** `db3e6949bbd3c09a7ad591662153c8b0dd9f618d`

`animatingCells` was a single shared map applied to both the fleet and attack grids via `getCellState`. Firing at `[r,c]` set `animatingCells["r,c"]` which showed a hit on both boards at that coordinate simultaneously — the user saw two cells light up instead of one. Split into `attackAnimating` (Your Attack grid) and `fleetAnimating` (Your Fleet grid), keyed by `shooterSlot` included in the server's `SHOT_RESULT` broadcast so each client knows which board to update. Also fixed two related bugs: `handleFire` was guarding against re-firing by checking `state.attackBoard` which was never updated during play (every cell always appeared empty, allowing players to fire at already-attacked cells — now checks `attackAnimating` instead); and `ADD_SUNK` always dispatched `targetIndex: oppIndex` regardless of who fired, meaning the defender incorrectly tracked the opponent's sunk list when their own ship was hit.

**Files changed:**
- `client/src/components/GameBoard.jsx` +37 / -33
- `server/src/room/Room.js` +1 / -1

**Summary:** A single shared animation map was causing every shot to visually register on both the attack board and the fleet board at the same coordinate, making every hit appear to strike two cells. The fix routes shot results to the correct board based on who fired, simultaneously closing two related bugs: players could repeatedly fire at already-attacked cells (the guard checked a board state that was never updated), and the sunk-ships tracker was crediting the wrong player's list when the opponent scored a hit.

---
## 2026-07-05 — 10 commits on master

**Scope:** Code-review session — 4 bug fixes, 2 refactors, 3 dead-code removals, 1 performance improvement (issues #15–#24, PRs #25–#34)

### e389030 — perf: memoize occupied Set so it rebuilds only when placements change (#34)

- **Author:** takayoshi24
- **Date:** 2026-07-05
- **Hash:** `e389030299dcc9441cfca7fd709fcad2d4e42fb4`

`occupied` was computed inline on every render — once per second from the `secsLeft` countdown and on every `onDragOver` event during drag. Each rebuild iterated all placements and their cells, then `getPreviewCells` immediately cloned the result. Wrapping in `useMemo([placements])` means the Set is rebuilt only when a ship is dropped or repositioned, eliminating all redundant work during countdown ticks and drag-over events.

**Files changed:**
- `client/src/components/PlacementPhase.jsx` +9 / -7

---

### 7750028 — chore: remove unused DragOverlay import from PlacementPhase (#33)

- **Author:** takayoshi24
- **Date:** 2026-07-05
- **Hash:** `775002810181c6328e1a210dbe9d8ed04f3ef76b`

`DragOverlay` was imported but never referenced in the file. Dead imports increase bundle size and create false positives when grepping for where a symbol is consumed.

**Files changed:**
- `client/src/components/PlacementPhase.jsx` +1 / -1

---

### 699e381 — chore: remove dead .placed-ship-cell CSS rule (#32)

- **Author:** takayoshi24
- **Date:** 2026-07-05
- **Hash:** `699e3815b1505c6dc02aacc5940ee2e070673a08`

This rule was the styling spec for placed-ship cells in the old overlay approach. The overlay was removed in a prior refactor; ships are now styled via `.grid-cell.ship`. The `accent-dark` border it specified was restored to `.grid-cell.ship` in #17, making this rule fully superseded. Confirmed no JSX references to `placed-ship-cell` remain in the codebase.

**Files changed:**
- `client/src/index.css` +0 / -8

---

### 9cde69f — refactor: extract withoutShip helper to deduplicate occupied-exclusion logic (#31)

- **Author:** takayoshi24
- **Date:** 2026-07-05
- **Hash:** `9cde69f93f45259a8a74f17b0a41462cdd7cc4b5`

The same 7-line block — clone `occupied`, find the existing placement for the dragged ship, and delete its cells from the clone — was copy-pasted verbatim in both `getPreviewCells` and `handleDragEnd`. A divergence between the two copies would produce a split-brain where the drag preview shows a placement as valid but the drop handler rejects it, or vice versa. Extracted `withoutShip(occupied, placements, shipName)` and called it from both functions. No logic changed.

**Files changed:**
- `client/src/components/PlacementPhase.jsx` +13 / -16

---

### 0614ab4 — refactor: extract cellsFor into shared utils/grid.js (#30)

- **Author:** takayoshi24
- **Date:** 2026-07-05
- **Hash:** `0614ab439a87f1b6756f2354573686461a09759a`

The function was defined identically in `PlacementPhase.jsx` and `GameBoard.jsx`. A divergence between the two copies would silently cause placement validation and board rendering to disagree on ship positions. Moving it to a single source of truth eliminates that risk.

**Files changed:**
- `client/src/components/GameBoard.jsx` +1 / -7
- `client/src/components/PlacementPhase.jsx` +1 / -7
- `client/src/utils/grid.js` +6 / -0 (new file)

---

### d159948 — chore: remove dead .ships-overlay CSS rule (#29)

- **Author:** takayoshi24
- **Date:** 2026-07-05
- **Hash:** `d159948fc18d85f045c33abfd2f5f5d184f11a67`

The overlay div that bore this class was removed from `PlacementPhase.jsx` in a prior refactor. The rule was unreachable by any element, but its `pointer-events: none` would silently swallow all mouse/touch events on any future element that accidentally used the class name — a latent trap. Confirmed no JSX references to `ships-overlay` remain in the codebase.

**Files changed:**
- `client/src/index.css` +0 / -8

---

### 0d17dfa — fix: correct explosion particle positions to account for CSS grid gap (#28)

- **Author:** takayoshi24
- **Date:** 2026-07-05
- **Hash:** `0d17dfadac702729d670fc6064e7f0607f0d7ab0`

`cellSize = gridRect.width / GRID_SIZE` evaluated to 37.8px for a 10×10 grid with 2px gaps (total width 378px). This value was used for both the inter-cell stride and the half-cell centering offset, causing particles to drift progressively from cell centers — up to ~0.9px off at column 9. The correct stride is `cellWidth + gap = 36 + 2 = 38px`, and the correct centering offset is `cellWidth / 2 = 18px`. Split into `cellWidth` and `stride` so each is used where semantically correct.

**Files changed:**
- `client/src/components/GameBoard.jsx` +5 / -3

---

### 0e92a4f — fix: restore accent-dark border on placed ship cells (#27)

- **Author:** takayoshi24
- **Date:** 2026-07-05
- **Hash:** `0e92a4f59e17cfb8458083a211b2a5fdfc4d1624`

`.grid-cell.ship` only overrode `background`, so placed ships inherited the base `.grid-cell` border (`var(--border)`) — indistinguishable from empty cells by outline. The old `.placed-ship-cell` overlay rule set `border: 1px solid var(--accent-dark)`, which was lost in the refactor. Added `border-color: var(--accent-dark)` to `.grid-cell.ship` to restore the intended visual distinction.

**Files changed:**
- `client/src/index.css` +1 / -1

---

### 24df1c1 — fix: position sunk-ship explosion on attack board, not fleet board (#26)

- **Author:** takayoshi24
- **Date:** 2026-07-05
- **Hash:** `24df1c197b7b375af565bbff869e631ce70a928f`

`gridRef` was attached to the "Your Fleet" div but was used to compute explosion particle coordinates for sunk ships. Sunk-ship events fire when the local player sinks an opponent ship — an attack-board action — so the explosion should appear over "Your Attack", not "Your Fleet". Added `attackGridRef`, attached it to the "Your Attack" grid div, and used it in the explosion `getBoundingClientRect()` call.

**Files changed:**
- `client/src/components/GameBoard.jsx` +4 / -3

---

### 043e37f — fix: always show ship class on occupied cells during drag preview (#25)

- **Author:** takayoshi24
- **Date:** 2026-07-05
- **Hash:** `043e37f23f5400b135e1a65452eb04b903dbb80a`

When a drag preview covers an already-occupied cell, `hasShip` and `preview` were both truthy simultaneously. The old guard (`hasShip && !preview`) suppressed the `ship` class, leaving the cell with only `preview-invalid` styling — making the placed ship appear to vanish. Removed the `!preview` guard so `ship` is always applied when `hasShip` is true. CSS specificity already handles the visual layering correctly: `preview-valid` and `preview-invalid` rules appear after `.grid-cell.ship` in the stylesheet.

**Files changed:**
- `client/src/components/PlacementPhase.jsx` +1 / -1

---

**Summary:** This session closed all 10 issues raised in the code-review pass (issues #15–#24). Four bugs were fixed that affected user-visible correctness: placed ships visually vanished during drag, sunk-ship explosions fired on the wrong board, placed ships lost their accent border after a CSS refactor, and explosion particles drifted progressively off-center due to conflating cell width with grid stride. Two refactors eliminated code duplication that could silently diverge (`cellsFor` extracted to `utils/grid.js`, `withoutShip` deduplicated from two identical blocks). Three dead CSS rules and one dead import were deleted, removing latent traps (a `pointer-events: none` orphan, a superseded ship-cell overlay, an unreferenced component import). Finally, the `occupied` Set was memoized so it rebuilds only when ships are placed rather than on every countdown tick and drag-over event.
