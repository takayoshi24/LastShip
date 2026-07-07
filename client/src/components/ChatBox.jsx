import { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext.jsx';

const EMOJIS = ['😂', '💀', '🔥', '👍', '😤', '🎯', '😱', '🤡'];

export default function ChatBox() {
  const { state, sendMsg } = useGame();
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    sendMsg({ type: 'CHAT', text: text.trim() });
    setText('');
  }

  return (
    <div className="chat-box">
      <div className="chat-header">Chat</div>
      <div className="chat-messages">
        {state.messages.length === 0 && (
          <p className="chat-empty">Say something...</p>
        )}
        {state.messages.map(m => {
          const isMe = m.senderSlot === state.playerSlot;
          const avatar = isMe ? state.myAvatar : state.opponentAvatar;
          return (
            <div key={m.id} className={`chat-msg ${isMe ? 'mine' : 'theirs'}`}>
              {avatar && (
                <span className="chat-avatar" style={{ background: avatar.color }}>{avatar.icon}</span>
              )}
              <span className="chat-text">{m.text}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="chat-emojis">
        {EMOJIS.map(e => (
          <button key={e} className="emoji-btn" onClick={() => sendMsg({ type: 'EMOJI', emoji: e })}>{e}</button>
        ))}
      </div>
      <form className="chat-input" onSubmit={handleSend}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          maxLength={200}
        />
        <button type="submit" className="btn-primary" disabled={!text.trim()}>Send</button>
      </form>
    </div>
  );
}
