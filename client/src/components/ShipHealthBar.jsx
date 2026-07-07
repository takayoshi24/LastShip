import { FLEET_CONFIG } from '../config/fleet.js';

export default function ShipHealthBar({ label, hitsObj, sunkList }) {
  return (
    <div className="health-bar-group">
      <span className="health-bar-label">{label}</span>
      <div className="health-bar-ships">
        {FLEET_CONFIG.map(ship => {
          const isSunk = sunkList.includes(ship.name);
          const hits = hitsObj[ship.name] ?? 0;
          return (
            <div key={ship.name} className="health-bar-row" title={ship.name}>
              {Array.from({ length: ship.size }, (_, i) => {
                const state = isSunk ? 'sunk' : i < hits ? 'hit' : 'ok';
                return <span key={i} className={`hb-cell ${state}`} />;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
