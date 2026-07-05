import { useState, useEffect, useRef } from 'react';

export default function CountdownTimer({ seconds, onExpire }) {
  const [left, setLeft] = useState(seconds);
  const ref = useRef(null);

  useEffect(() => {
    setLeft(seconds);
    ref.current = setInterval(() => {
      setLeft(s => {
        if (s <= 1) { clearInterval(ref.current); onExpire?.(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [seconds]);

  const mins = String(Math.floor(left / 60)).padStart(2, '0');
  const secs = String(left % 60).padStart(2, '0');
  const urgent = left <= 30;

  return (
    <span className={`timer ${urgent ? 'urgent' : ''}`}>{mins}:{secs}</span>
  );
}
