import { fmtNutrient, NUTRIENT_LABEL } from '../lib/nutrition';
import { NUTRIENTS, type Nutrition } from '../types';

/**
 * Calories and macros for a meal or a day. With targets, each nutrient gets a progress bar.
 */
export function NutritionSummary({ total, missing = 0, targets }: { total: Nutrition; missing?: number; targets?: Partial<Nutrition> }) {
  return (
    <div className="nutrition">
      <div className="nutrition-grid">
        {NUTRIENTS.map((n) => {
          const target = targets?.[n];
          const pct = target ? Math.min(100, (total[n] / target) * 100) : undefined;
          return (
            <div key={n} className={`nutrient nutrient-${n}`}>
              <span className="nutrient-label">{NUTRIENT_LABEL[n]}</span>
              <span className="nutrient-value">{fmtNutrient(n, total[n])}</span>
              {target !== undefined && (
                <>
                  <span className="nutrient-track">
                    <span className={`nutrient-fill ${total[n] > target ? 'over' : ''}`} style={{ width: `${pct}%` }} />
                  </span>
                  <span className="nutrient-target">of {fmtNutrient(n, target)}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
      {missing > 0 && (
        <p className="muted small">
          {missing} item{missing > 1 ? 's' : ''} not counted (no nutrition data). Add it in the food's edit screen.
        </p>
      )}
    </div>
  );
}
