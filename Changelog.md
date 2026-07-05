# Changelog

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
