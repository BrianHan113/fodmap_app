import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Header, LevelBadge, VerdictBadge } from '../components/ui';
import { toggleFavourite, useChallenges, useFavourites, useFoods } from '../db/hooks';
import { safeServing } from '../lib/foods';
import { fmtNutrient, NUTRIENT_LABEL } from '../lib/nutrition';
import { GL_LEVEL_TEXT, glDensity, glDensityText, glLevel, glServingShort } from '../lib/glycemic';
import { personalVerdict, toleranceMap } from '../lib/tolerance';
import { GROUP_LABEL, NUTRIENTS, type Group } from '../types';

const GROUP_HINT: Record<Group, string> = {
  fructose: 'Excess fructose (more fructose than glucose).',
  lactose: 'Milk sugar. Lactose-free versions are low.',
  mannitol: 'A polyol (sugar alcohol).',
  sorbitol: 'A polyol (sugar alcohol).',
  gos: 'Galacto-oligosaccharides, mainly in legumes.',
  fructan: 'Chains of fructose, mainly in wheat, onion and garlic.',
};

export default function FoodDetail() {
  const { id } = useParams();
  const { map } = useFoods();
  const challenges = useChallenges();
  const favourites = useFavourites();
  const food = id ? map.get(id) : undefined;
  const tol = useMemo(() => toleranceMap(challenges), [challenges]);

  if (!food) return <Header title="Food not found" back />;
  const density = glDensity(food);
  // Carb-heavy FODMAP-free foods (sugar, rice, potato) still need portion control for blood sugar.
  const portionMatters = food.fodmapFree && density !== undefined && glLevel(density) !== 'low';
  const safe = safeServing(food);
  const verdict = Object.keys(tol).length ? personalVerdict(food, tol) : undefined;
  const groups = [...new Set(food.servings.flatMap((s) => Object.keys(s.groups) as Group[]))];

  return (
    <>
      <Header
        title={food.name}
        back
        right={
          <>
            <button
              className={`icon-btn star ${favourites.has(food.id) ? 'on' : ''}`}
              onClick={() => toggleFavourite(food.id, !favourites.has(food.id))}
              aria-label={favourites.has(food.id) ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={favourites.has(food.id)}
            >
              <Icon name="star" filled={favourites.has(food.id)} />
            </button>
            <Link to={`/settings/foods/${food.id}`} className="icon-btn" aria-label="Edit food">
              <Icon name="edit" />
            </Link>
          </>
        }
      />
      <section className={`card safe-card ${portionMatters ? 'safe-caution' : safe ? 'safe-yes' : 'safe-no'}`}>
        <div className="muted small">{food.category}</div>
        {portionMatters ? (
          <>
            <div className="safe-label">No FODMAPs</div>
            <div className="safe-amount">Portion still matters</div>
            <div className="small">
              for blood sugar: GL {food.gl} per {glServingShort(food)}, and more if you eat more
            </div>
          </>
        ) : food.fodmapFree ? (
          <>
            <div className="safe-label">No FODMAPs</div>
            <div className="safe-amount">No FODMAP limit</div>
          </>
        ) : safe ? (
          <>
            <div className="safe-label">Safe serving</div>
            <div className="safe-amount">up to {safe.label}</div>
          </>
        ) : (
          <>
            <div className="safe-label">No low-FODMAP serving</div>
            <div className="safe-amount">Avoid during elimination</div>
          </>
        )}
        {verdict && <VerdictBadge verdict={verdict} />}
      </section>

      {food.fodmapFree ? (
        <section className="card">
          <h2>Servings</h2>
          <p className="muted small">
            Contains no FODMAPs, so portion size doesn't matter for FODMAPs.{' '}
            {portionMatters
              ? 'It is carbohydrate-rich, though, so larger portions raise the glycaemic load (see below).'
              : 'Watch sauces, marinades and seasonings added to it.'}
          </p>
        </section>
      ) : (
        <section className="card">
          <h2>Servings</h2>
          <ul className="tiers">
            {food.servings.map((s, i) => (
              <li key={i} className={`tier tier-${s.level}`}>
                <div className="tier-head">
                  <span className="grow">{s.label}</span>
                  <LevelBadge level={s.level} />
                </div>
                {Object.keys(s.groups).length > 0 && (
                  <div className="tier-groups">
                    {(Object.entries(s.groups) as [Group, string][]).map(([g, lvl]) => (
                      <span key={g} className={`pill pill-${lvl}`}>
                        {GROUP_LABEL[g]}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.length > 0 && (
        <section className="card">
          <h2>Which FODMAPs</h2>
          <dl className="defs">
            {groups.map((g) => (
              <div key={g}>
                <dt>{GROUP_LABEL[g]}</dt>
                <dd>{GROUP_HINT[g]}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {food.gl !== undefined && (
        <section className="card">
          <h2>Glycaemic load</h2>
          {food.gl === 0 ? (
            <div className="gl-detail">
              <span className="gl-tag gl-low gl-big">GL 0</span>
              <span>
                <b>Low GL at any amount</b> (negligible carbohydrate)
              </span>
            </div>
          ) : (
            <>
              <dl className="gl-rows">
                <div>
                  <dt>{glServingShort(food)}</dt>
                  <dd>
                    <span className={`gl-tag gl-${glLevel(food.gl)}`}>GL {food.gl}</span> {GL_LEVEL_TEXT[glLevel(food.gl)]} for this amount
                  </dd>
                </div>
                {density !== undefined && (
                  <div>
                    <dt>{glDensityText(food) === 'per 100g' ? 'Per 100g' : 'Per glass (250ml)'}</dt>
                    <dd>
                      <span className={`gl-tag gl-${glLevel(density)}`}>GL {density}</span> {GL_LEVEL_TEXT[glLevel(density)]}, used for GL sorting
                    </dd>
                  </div>
                )}
                <div>
                  <dt>Bigger portions</dt>
                  <dd>
                    {[2, 3].map((n) => (
                      <span key={n} className="gl-scale">
                        {n}× <b className={`gl-${glLevel(food.gl! * n)}`}>GL {food.gl! * n}</b>
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </>
          )}
          <p className="muted small">
            How much a given amount of food raises blood sugar, combining its GI and carbohydrate. Each number applies only to the amount shown:
            eat twice as much and the GL doubles. Low ≤10, medium 11–19, high ≥20. Estimated from published GI tables; it varies with ripeness, cooking and portion, and is separate from the FODMAP rating.
          </p>
        </section>
      )}

      {food.nutrition && (
        <section className="card">
          <h2>Nutrition</h2>
          <table className="table nutrition-table">
            <thead>
              <tr>
                <th />
                <th className="num">{food.category === 'Drinks' ? '100ml' : '100g'}</th>
                {food.servings
                  .filter((s) => s.grams !== undefined)
                  .map((s, i) => (
                    <th key={i} className="num">
                      {s.label.replace(/\s*\(.*\)/, '')}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {NUTRIENTS.map((n) => (
                <tr key={n}>
                  <td>{NUTRIENT_LABEL[n]}</td>
                  <td className="num">{fmtNutrient(n, food.nutrition![n])}</td>
                  {food.servings
                    .filter((s) => s.grams !== undefined)
                    .map((s, i) => (
                      <td key={i} className="num">
                        {fmtNutrient(n, (food.nutrition![n] * s.grams!) / 100)}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">Approximate typical values. Carbs include fibre. Brands and recipes vary.</p>
        </section>
      )}

      {food.notes && (
        <section className="card">
          <h2>Tips</h2>
          <p>{food.notes}</p>
        </section>
      )}
      {food.custom && <p className="muted small center">Custom food</p>}
    </>
  );
}
