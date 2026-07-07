import { test, expect } from '@playwright/test';

// ── Lobby ──────────────────────────────────────────────────────────────────

test.describe('Lobby', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('LastShip');
  });

  test('shows title, subtitle and all primary buttons', async ({ page }) => {
    await expect(page.getByText('Battleship — play online with a friend or face the bot')).toBeVisible();

    // Quick-play buttons
    await expect(page.getByRole('button', { name: 'Quick Match' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Private Room' })).toBeVisible();

    // Bot buttons (exact:true avoids 'Hard' matching 'Super Hard')
    for (const label of ['Easy', 'Medium', 'Hard', 'Super Hard', 'Impossible']) {
      await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
    }

    await expect(page.getByRole('button', { name: /Daily Challenge/ })).toBeVisible();
  });

  test('shows navigation links to Hall of Fame and My Stats', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Hall of Fame' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Stats' })).toBeVisible();
  });

  test('shows Salvo mode and Fog of War checkboxes', async ({ page }) => {
    await expect(page.getByText(/Salvo mode/)).toBeVisible();
    await expect(page.getByText(/Fog of war/)).toBeVisible();
  });

  test('shows Log in / Register button when not logged in', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Log in \/ Register/ })).toBeVisible();
  });

  test('shows avatar picker', async ({ page }) => {
    await expect(page.locator('.avatar-picker, [class*="avatar"]').first()).toBeVisible();
  });
});

// ── Info modal ─────────────────────────────────────────────────────────────

test.describe('Info modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('LastShip');
  });

  test('opens when ? button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: '?' }).click();
    await expect(page.locator('.info-modal')).toBeVisible();
    await expect(page.getByText('How to play LastShip')).toBeVisible();
  });

  test('closes via the ✕ button', async ({ page }) => {
    await page.getByRole('button', { name: '?' }).click();
    await expect(page.locator('.info-modal')).toBeVisible();
    await page.locator('.info-close').click();
    await expect(page.locator('.info-modal')).not.toBeVisible();
  });

  test('closes by clicking the backdrop', async ({ page }) => {
    await page.getByRole('button', { name: '?' }).click();
    await expect(page.locator('.info-modal')).toBeVisible();
    // Click backdrop (the container around the modal)
    await page.locator('.info-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.info-modal')).not.toBeVisible();
  });
});

// ── Account modal ──────────────────────────────────────────────────────────

test.describe('Account modal', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any saved account
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('LastShip');
  });

  test('opens when Log in / Register is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /Log in \/ Register/ }).click();
    await expect(page.locator('.account-modal')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  });

  test('closes via ✕ button', async ({ page }) => {
    await page.getByRole('button', { name: /Log in \/ Register/ }).click();
    await expect(page.locator('.account-modal')).toBeVisible();
    await page.locator('.info-close').click();
    await expect(page.locator('.account-modal')).not.toBeVisible();
  });

  test('registers a new account and shows it in the lobby', async ({ page }) => {
    const name = `player_${Date.now()}`;

    await page.getByRole('button', { name: /Log in \/ Register/ }).click();
    await expect(page.locator('.account-modal')).toBeVisible();

    // Switch to register mode via the toggle button
    await page.getByRole('button', { name: /Don't have an account\? Register/ }).click();
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();

    await page.locator('input[placeholder="2–20 characters"]').fill(name);
    await page.locator('input[type="password"]').fill('1234');
    await page.getByRole('button', { name: 'Create account' }).click();

    // Modal closes, account bar appears
    await expect(page.locator('.account-modal')).not.toBeVisible();
    await expect(page.locator('.account-bar')).toBeVisible();
    await expect(page.locator('.account-name')).toHaveText(name);
    await expect(page.locator('.account-elo')).toBeVisible();
  });

  test('shows error for short name on registration', async ({ page }) => {
    await page.getByRole('button', { name: /Log in \/ Register/ }).click();
    await page.getByRole('button', { name: /Don't have an account\? Register/ }).click();
    await page.locator('input[placeholder="2–20 characters"]').fill('a');
    await page.locator('input[type="password"]').fill('1234');
    // Submit button is enabled (client lets it through); server rejects the short name
    await page.getByRole('button', { name: 'Create account' }).click();
    // Modal stays open and shows an error
    await expect(page.locator('.account-modal')).toBeVisible();
    await expect(page.locator('.account-error')).toBeVisible();
  });
});

// ── Navigation ─────────────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test('Hall of Fame page loads with tabs and back link', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Hall of Fame' }).click();
    await expect(page).toHaveURL('/ranking');
    await expect(page.getByRole('heading', { name: 'Hall of Fame' })).toBeVisible();
    await expect(page.getByRole('button', { name: "Today's Challenge" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'All-Time Impossible' })).toBeVisible();
    await expect(page.getByRole('link', { name: /← Back/ })).toBeVisible();
  });

  test('My Stats page loads with heading and back link', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'My Stats' }).click();
    await expect(page).toHaveURL('/stats');
    await expect(page.getByRole('heading', { name: 'Your Stats' })).toBeVisible();
    await expect(page.getByRole('link', { name: /← Back/ })).toBeVisible();
  });

  test('unknown routes redirect to lobby', async ({ page }) => {
    await page.goto('/not-a-real-route');
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toHaveText('LastShip');
  });
});

// ── Create Private Room ────────────────────────────────────────────────────

test.describe('Create Private Room', () => {
  test('navigates to /game/:code and shows waiting screen with shareable link', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create Private Room' }).click();

    // Should navigate to /game/<roomCode>
    await expect(page).toHaveURL(/\/game\/[A-Z0-9]+/);

    // Waiting message with a shareable URL
    await expect(page.getByText(/Share this link with a friend/)).toBeVisible();
    await expect(page.getByText(/Waiting for opponent/)).toBeVisible();
  });
});

// ── Quick Match ────────────────────────────────────────────────────────────

test.describe('Quick Match', () => {
  test('shows waiting state and cancel button', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Quick Match' }).click();

    await expect(page.getByText(/Waiting for an opponent/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('cancel returns to lobby options', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Quick Match' }).click();
    await expect(page.getByText(/Waiting for an opponent/)).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Quick Match' })).toBeVisible();
  });
});

// ── Bot Game (Easy) ────────────────────────────────────────────────────────

test.describe('Bot game', () => {
  test.setTimeout(60_000);

  test('Easy bot: full flow — placement → game board → fire a shot → verify result', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Easy' }).click();

    // Should navigate to game page in placement phase
    await expect(page).toHaveURL(/\/game\/[A-Z0-9]+/);
    await expect(page.getByText('Place your ships')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Auto-place' })).toBeVisible();

    // Auto-place ships
    await page.getByRole('button', { name: 'Auto-place' }).click();

    // Game board should appear (GAME_START received)
    await expect(page.locator('.game-board')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Your Fleet')).toBeVisible();
    await expect(page.getByText('Your Attack')).toBeVisible();

    // Wait for our turn (turn-indicator should eventually say "Your turn")
    const myTurnIndicator = page.locator('.turn-indicator.my-turn');
    await myTurnIndicator.waitFor({ state: 'visible', timeout: 35_000 });
    await expect(myTurnIndicator).toContainText(/Your turn|Your salvo/);

    // Fire using keyboard (arrow key enters kb mode, Enter fires at cursor 0,0)
    await page.locator('.game-board').focus();
    await page.keyboard.press('ArrowRight');  // enter keyboard mode, cursor → (0,1)
    await page.keyboard.press('Enter');       // fire at cursor

    // After shot: a hit or miss cell should appear in the attack grid
    await expect(
      page.locator('.game-board .grid-cell.hit, .game-board .grid-cell.miss').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Placement phase shows ships list and timer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Medium' }).click();

    await expect(page).toHaveURL(/\/game\/[A-Z0-9]+/);
    await expect(page.getByText('Place your ships')).toBeVisible();
    await expect(page.getByText('Unplaced ships:')).toBeVisible();
    await expect(page.getByText(/Carrier/)).toBeVisible();
    await expect(page.getByText(/Battleship/)).toBeVisible();
    await expect(page.getByText(/Cruiser/)).toBeVisible();
    await expect(page.getByText(/Submarine/)).toBeVisible();
    await expect(page.getByText(/Destroyer/)).toBeVisible();

    // Timer should be present
    await expect(page.locator('.timer')).toBeVisible();
    // Rotate button
    await expect(page.getByRole('button', { name: /Rotate/ })).toBeVisible();
  });

  test('Forfeit button appears during game', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Easy' }).click();
    await expect(page.locator('.game-board, .placement-phase')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Auto-place' }).click();
    await expect(page.locator('.game-board')).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole('button', { name: 'Forfeit' })).toBeVisible();
  });

  test('Forfeit asks for confirmation', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Easy' }).click();
    await page.getByRole('button', { name: 'Auto-place' }).click();
    await expect(page.locator('.game-board')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Forfeit' }).click();
    await expect(page.getByRole('button', { name: /Confirm/ })).toBeVisible();
    // Cancel button also appears
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });
});

// ── Two-tab Quick Match (PvP) ──────────────────────────────────────────────

test.describe('Two-player Quick Match (same browser, two contexts)', () => {
  test.setTimeout(90_000);

  test('two players get matched and can fire at each other', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    await p1.goto('/');
    await p2.goto('/');

    // Both click Quick Match
    await p1.getByRole('button', { name: 'Quick Match' }).click();
    await p2.getByRole('button', { name: 'Quick Match' }).click();

    // Both should reach placement
    await expect(p1.getByText('Place your ships')).toBeVisible({ timeout: 15_000 });
    await expect(p2.getByText('Place your ships')).toBeVisible({ timeout: 15_000 });

    // Auto-place for both
    await p1.getByRole('button', { name: 'Auto-place' }).click();
    await p2.getByRole('button', { name: 'Auto-place' }).click();

    // Both should see the game board
    await expect(p1.locator('.game-board')).toBeVisible({ timeout: 15_000 });
    await expect(p2.locator('.game-board')).toBeVisible({ timeout: 15_000 });

    // One of them has first turn — find who
    const p1MyTurn = await p1.locator('.turn-indicator.my-turn').isVisible();
    const active = p1MyTurn ? p1 : p2;
    const passive = p1MyTurn ? p2 : p1;

    // Active player fires
    const cell = active.locator('.grid-cell.clickable').first();
    await cell.waitFor({ state: 'visible', timeout: 10_000 });
    await cell.click();

    // Turn switches to the other player
    await expect(passive.locator('.turn-indicator.my-turn')).toBeVisible({ timeout: 10_000 });

    await ctx1.close();
    await ctx2.close();
  });
});

// ── Spectate ───────────────────────────────────────────────────────────────

test.describe('Spectate flow', () => {
  test.setTimeout(90_000);

  test('spectator sees the game board of an active match', async ({ browser }) => {
    // Start a bot game in context 1
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const player = await ctx1.newPage();
    const spectator = await ctx2.newPage();

    await player.goto('/');
    await player.getByRole('button', { name: 'Easy' }).click();
    await player.getByRole('button', { name: 'Auto-place' }).click();
    // Wait for game to start
    await expect(player.locator('.game-board')).toBeVisible({ timeout: 15_000 });

    // Extract room code from URL
    const url = player.url();
    const roomCode = url.split('/game/')[1];
    expect(roomCode).toBeTruthy();

    // Spectator joins via lobby spectate form
    await spectator.goto('/');
    const roomInput = spectator.locator('input[placeholder="Room code"]');
    await roomInput.fill(roomCode);
    await spectator.locator('label.spectate-toggle input[type="checkbox"]').check();
    await spectator.getByRole('button', { name: 'Watch' }).click();

    await expect(spectator).toHaveURL('/spectate');
    await expect(spectator.locator('.spec-board-wrap, .spec-grid').first()).toBeVisible({ timeout: 10_000 });

    await ctx1.close();
    await ctx2.close();
  });
});
