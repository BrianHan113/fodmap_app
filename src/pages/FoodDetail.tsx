import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Header, LevelBadge, VerdictBadge } from '../components/ui';
import { toggleFavourite, useChallenges, useFavourites, useFoods } from '../db/hooks';
import { safeServing } from '../lib/foods';
import { GL_LEVEL_LABEL, glLevel } from '../lib/glycemic';
import { personalVerdict, toleranceMap } from '../lib/tolerance';
import { GROUP_LABEL, type Group } from '../types';

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
      <section className={`card safe-card ${safe ? 'safe-yes' : 'safe-no'}`}>
        <div className="muted small">{food.category}</div>
        {safe ? (
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
          <div className="gl-detail">
            <span className={`gl-tag gl-${glLevel(food.gl)} gl-big`}>GL {food.gl}</span>
            <span>
              <b>{GL_LEVEL_LABEL[glLevel(food.gl)]}</b> per {food.glServing}
            </span>
          </div>
          <p className="muted small">
            How much a serving raises blood sugar, combining its GI and carbohydrate. Low ≤10, medium 11–19, high ≥20. Estimated from published GI
            tables; it varies with ripeness, cooking and portion size, and is separate from the FODMAP rating.
          </p>
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
