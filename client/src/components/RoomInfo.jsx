import { useState } from 'react';

export default function RoomInfo({ roomCode }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/game/${roomCode}`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="room-info">
      <span className="room-code">Room: <strong>{roomCode}</strong></span>
      <button onClick={copy} className="btn-ghost">
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}
