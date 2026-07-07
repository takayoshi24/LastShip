export default function InfoModal({ onClose }) {
  return (
    <div className="info-backdrop" onClick={onClose}>
      <div className="info-modal" onClick={e => e.stopPropagation()}>
        <div className="info-header">
          <h2>How to play LastShip</h2>
          <button className="info-close" onClick={onClose}>✕</button>
        </div>

        <div className="info-body">
          <section className="info-section">
            <h3>🎯 Basics</h3>
            <p>
              Classic Battleship on a 10×10 grid. Place your 5 ships, then take
              turns firing at your opponent's grid. Sink all 5 enemy ships to win.
              Grid columns are A–J, rows 1–10.
            </p>
          </section>

          <section className="info-section">
            <h3>⚔️ Game modes</h3>
            <ul>
              <li><strong>Quick Match</strong> — paired instantly with another online player.</li>
              <li><strong>Private Room</strong> — share the room code with a friend.</li>
              <li><strong>Bot</strong> — five difficulty tiers from Easy to Impossible.</li>
              <li><strong>Daily Challenge</strong> — the same seeded Impossible bot for everyone today. Beat it to enter the daily leaderboard.</li>
            </ul>
          </section>

          <section className="info-section">
            <h3>⚡ Salvo mode</h3>
            <p>
              Toggle it in the lobby before creating or starting a bot game. Each
              turn you fire <em>one shot per surviving ship</em> — up to 5 shots
              early on, down to 1 when you're almost sunk. Changes strategy completely.
            </p>
          </section>

          <section className="info-section">
            <h3>👁 Spectate</h3>
            <p>
              Type a room code and check <strong>Spectate</strong> to watch a live
              game. Ship positions stay hidden — you only see hits and misses as they
              happen.
            </p>
          </section>

          <section className="info-section">
            <h3>💬 PvP chat &amp; emoji</h3>
            <p>
              During a player-vs-player game a chat box appears. Send text or pick
              one of 8 quick emojis — the emoji flashes as a big overlay on the
              opponent's fleet board.
            </p>
          </section>

          <section className="info-section">
            <h3>⌨️ Keyboard shortcuts</h3>
            <ul>
              <li><kbd>↑ ↓ ← →</kbd> — move the crosshair on the attack grid</li>
              <li><kbd>Enter</kbd> — fire the highlighted cell</li>
              <li><kbd>Esc</kbd> — exit keyboard mode</li>
              <li><kbd>R</kbd> (placement) — rotate the current ship</li>
            </ul>
          </section>

          <section className="info-section">
            <h3>📊 Stats &amp; replay</h3>
            <p>
              Every game is recorded locally in your browser (no account needed).
              Visit <strong>My Stats</strong> for win rate, accuracy, and streaks.
              After any game click <strong>Watch Replay</strong> to step through
              every shot.
            </p>
          </section>

          <section className="info-section">
            <h3>🎨 Themes</h3>
            <p>
              Four colour themes — Default, Ocean, Retro, Dusk — switched from the
              dots in the lobby. Your choice is saved across sessions.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
