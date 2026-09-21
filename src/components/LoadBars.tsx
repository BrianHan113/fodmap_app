import { GROUPS, GROUP_LABEL } from '../types';
import { loadLevel, type Load } from '../lib/fodmapLoad';

/** Per-FODMAP load: 1 = one moderate serving, 2+ = high. */
export function LoadBars({ load }: { load: Load }) {
  return (
    <div className="loadbars">
      {GROUPS.map((g) => {
        const v = load[g];
        const pct = Math.min(100, (v / 3) * 100);
        return (
          <div key={g} className="loadbar">
            <span className="loadbar-label">{GROUP_LABEL[g]}</span>
            <span className="loadbar-track">
              <span className={`loadbar-fill fill-${loadLevel(v)}`} style={{ width: `${Math.max(pct, v ? 8 : 0)}%` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
