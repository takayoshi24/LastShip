import { useState } from 'react';

const THEMES = [
  { id: 'default', label: 'Default', dot: '#4fc3f7' },
  { id: 'ocean',   label: 'Ocean',   dot: '#00c9c9' },
  { id: 'retro',   label: 'Retro',   dot: '#00ff41' },
  { id: 'dusk',    label: 'Dusk',    dot: '#d946ef' },
];

const KEY = 'lastship_theme';

export function applyTheme(id) {
  document.documentElement.setAttribute('data-theme', id === 'default' ? '' : id);
  localStorage.setItem(KEY, id);
}

export function loadTheme() {
  return localStorage.getItem(KEY) ?? 'default';
}

export default function ThemePicker() {
  const [current, setCurrent] = useState(loadTheme);

  function pick(id) {
    applyTheme(id);
    setCurrent(id);
  }

  return (
    <div className="theme-picker">
      <span className="theme-label">Theme</span>
      {THEMES.map(t => (
        <button
          key={t.id}
          className={`theme-dot ${current === t.id ? 'active' : ''}`}
          style={{ background: t.dot }}
          onClick={() => pick(t.id)}
          title={t.label}
        />
      ))}
    </div>
  );
}
