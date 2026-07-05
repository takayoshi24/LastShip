import { FLEET_CONFIG } from '../config/fleet.js';

export default function SunkShipsList({ sunkShips, playerSlot }) {
  const myIndex = playerSlot - 1;
  const oppIndex = myIndex === 0 ? 1 : 0;
  const mySunk = sunkShips?.[myIndex] ?? [];
  const oppSunk = sunkShips?.[oppIndex] ?? [];

  return (
    <div className="sunk-ships">
      <div className="sunk-column">
        <h4>Your ships</h4>
        {FLEET_CONFIG.map(s => (
          <div key={s.name} className={`ship-tag ${mySunk.includes(s.name) ? 'sunk' : ''}`}>
            <span className="ship-tag-name">{s.name}</span>
            <div className="ship-tag-cells">
              {Array.from({ length: s.size }, (_, i) => (
                <span key={i} className="ship-tag-cell" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="sunk-column">
        <h4>Enemy ships</h4>
        {FLEET_CONFIG.map(s => (
          <div key={s.name} className={`ship-tag ${oppSunk.includes(s.name) ? 'sunk' : ''}`}>
            <span className="ship-tag-name">{s.name}</span>
            <div className="ship-tag-cells">
              {Array.from({ length: s.size }, (_, i) => (
                <span key={i} className="ship-tag-cell" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
