const COLORS = [
  { id: '#2563eb', label: 'Blue' },
  { id: '#dc2626', label: 'Red' },
  { id: '#16a34a', label: 'Green' },
  { id: '#9333ea', label: 'Purple' },
  { id: '#ea580c', label: 'Orange' },
  { id: '#db2777', label: 'Pink' },
  { id: '#0891b2', label: 'Cyan' },
  { id: '#ca8a04', label: 'Yellow' },
];

const ICONS = ['🦈', '🐙', '🐬', '⚓', '💀', '🐳', '🦑', '🔱'];

export const DEFAULT_AVATAR = { color: '#2563eb', icon: '🦈' };

export function loadAvatar() {
  try { return JSON.parse(localStorage.getItem('lastship_avatar')) ?? DEFAULT_AVATAR; } catch { return DEFAULT_AVATAR; }
}

export function saveAvatar(avatar) {
  localStorage.setItem('lastship_avatar', JSON.stringify(avatar));
}

export default function AvatarPicker({ avatar, onChange }) {
  return (
    <div className="avatar-picker">
      <div className="avatar-preview" style={{ background: avatar.color }}>
        {avatar.icon}
      </div>
      <div className="avatar-options">
        <div className="avatar-icons">
          {ICONS.map(icon => (
            <button
              key={icon}
              className={`avatar-icon-btn ${avatar.icon === icon ? 'selected' : ''}`}
              onClick={() => onChange({ ...avatar, icon })}
            >{icon}</button>
          ))}
        </div>
        <div className="avatar-colors">
          {COLORS.map(c => (
            <button
              key={c.id}
              className={`avatar-color-btn ${avatar.color === c.id ? 'selected' : ''}`}
              style={{ background: c.id }}
              title={c.label}
              onClick={() => onChange({ ...avatar, color: c.id })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
