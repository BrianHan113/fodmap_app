import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toggleFavourite, useChallenges, useFavourites, useFoods } from '../db/hooks';
import { baseLevel, bigSafePortion, lowInLargePortions, matchesQuery, orderedServings, safeServing, sortFoods, type FoodSort } from '../lib/foods';
import { glLevel, glServingShort } from '../lib/glycemic';
import { personalVerdict, toleranceMap } from '../lib/tolerance';
import { CATEGORIES, type Food } from '../types';
import { Icon } from './Icon';
import { LevelDot, VerdictBadge, groupsText } from './ui';

export interface FoodFilters {
  q: string;
  cat: string;
  lowOnly: boolean;
  /** Only foods that are FODMAP-free or low even in large portions. */
  lowAll: boolean;
  /** Only foods whose low-FODMAP serving is at least 75g / 125ml. */
  bigSafe: boolean;
  /** Only starred foods. */
  favOnly: boolean;
  sort: FoodSort;
  /** Only foods from recent meals (picker only). */
  recent: boolean;
}

export const DEFAULT_FILTERS: FoodFilters = { q: '', cat: '', lowOnly: false, lowAll: false, bigSafe: false, favOnly: false, sort: 'name', recent: false };

/**
 * The food list with search, category chips, low-serving filter, FODMAP sort and personal
 * verdicts. Used by the Foods tab (rows link to the food page) and the meal "Add food" sheet
 * (rows expand to pick a serving).
 */
export function FoodBrowser({
  filters,
  onChange,
  onPick,
  recentIds,
  autoFocus,
}: {
  filters: FoodFilters;
  onChange: (patch: Partial<FoodFilters>) => void;
  onPick?: (food: Food, servingIndex: number) => void;
  recentIds?: string[];
  autoFocus?: boolean;
}) {
  const { list } = useFoods();
  const challenges = useChallenges();
  const favourites = useFavourites();
  const [open, setOpen] = useState<string | null>(null);
  const { q, cat, lowOnly, lowAll, bigSafe, favOnly, sort } = filters;
  const hasRecent = !!recentIds?.length;
  const recent = filters.recent && hasRecent;

  const tol = useMemo(() => toleranceMap(challenges), [challenges]);
  const hasResults = Object.keys(tol).length > 0;

  const foods = useMemo(() => {
    const recentSet = new Set(recentIds);
    return sortFoods(
      list.filter(
        (f) =>
          matchesQuery(f, q) &&
          (!cat || f.category === cat) &&
          (!lowOnly || f.servings.some((s) => s.level === 'low')) &&
          (!lowAll || lowInLargePortions(f)) &&
          (!bigSafe || bigSafePortion(f)) &&
          (!favOnly || favourites.has(f.id)) &&
          (!recent || recentSet.has(f.id)),
      ),
      sort,
      favourites,
    );
  }, [list, q, cat, lowOnly, lowAll, bigSafe, favOnly, sort, recent, recentIds, favourites]);

  return (
    <>
      <div className="search sticky">
        <Icon name="search" size={18} />
        <input
          autoFocus={autoFocus}
          placeholder={`Search ${list.length} foods…`}
          value={q}
          // Typing searches everything, not just recent foods.
          onChange={(e) => onChange({ q: e.target.value, recent: false })}
        />
        {q && (
          <button className="icon-btn" onClick={() => onChange({ q: '' })} aria-label="Clear">
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
      <div className="chips">
        {/* Recent and Favourites are alternative shortlists, so each switches the other off. */}
        {hasRecent && (
          <button className={`chip ${recent ? 'on' : ''}`} onClick={() => onChange({ recent: !recent, favOnly: false })}>
            Recent
          </button>
        )}
        <button className={`chip ${favOnly ? 'on' : ''}`} onClick={() => onChange({ favOnly: !favOnly, recent: false })}>
          ★ Favourites
        </button>
        <button className={`chip ${lowOnly ? 'on' : ''}`} onClick={() => onChange({ lowOnly: !lowOnly })}>
          Has a low serving
        </button>
        <button
          className={`chip ${lowAll ? 'on' : ''}`}
          onClick={() => onChange({ lowAll: !lowAll })}
          title="No FODMAPs, or low FODMAP at every listed size with a large (75g+) safe portion"
        >
          Low even in large portions
        </button>
        <button
          className={`chip ${bigSafe ? 'on' : ''}`}
          onClick={() => onChange({ bigSafe: !bigSafe })}
          title="Low-FODMAP serving of at least 75g (125ml for drinks)"
        >
          Big safe portion
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => onChange({ cat: cat === c ? '' : c })}>
            {c}
          </button>
        ))}
      </div>
      <div className="guide-tools">
        <div className="legend small muted">
          <LevelDot level="low" /> low <LevelDot level="moderate" /> moderate <LevelDot level="high" /> high FODMAP at smallest serving
          <span className="legend-gl">
            GL = glycaemic load for the serving shown (low ≤10 · medium 11–19 · high ≥20). It grows with portion size. GL sorts compare per 100g so
            small servings don't look low.
          </span>
        </div>
        <label className="sort small muted">
          Sort
          <select value={sort} onChange={(e) => onChange({ sort: e.target.value as FoodSort })}>
            <option value="name">A–Z</option>
            <option value="low">Lowest FODMAP first</option>
            <option value="high">Highest FODMAP first</option>
            <option value="gl-low">Lowest GL first</option>
            <option value="gl-high">Highest GL first</option>
            <option value="combined">Lowest FODMAP + GL first</option>
            <option value="fav">Favourites first</option>
          </select>
        </label>
      </div>
      <ul className="list card flush">
        {foods.map((f) => {
          const safe = safeServing(f);
          const verdict = hasResults ? personalVerdict(f, tol) : undefined;
          const body = (
            <>
              <LevelDot level={baseLevel(f)} />
              <span className="grow">
                <span className="row-title">{f.name}</span>
                <span className="row-sub">{f.fodmapFree ? 'No FODMAPs' : safe ? `Low: up to ${safe.label}` : 'No low-FODMAP serving'}</span>
                <GlLine food={f} />
              </span>
              {verdict && verdict !== 'untested' && <VerdictBadge verdict={verdict} />}
            </>
          );
          const fav = favourites.has(f.id);
          const star = (
            <button
              className={`icon-btn star ${fav ? 'on' : ''}`}
              onClick={() => toggleFavourite(f.id, !fav)}
              aria-label={fav ? `Remove ${f.name} from favourites` : `Add ${f.name} to favourites`}
              aria-pressed={fav}
            >
              <Icon name="star" size={20} filled={fav} />
            </button>
          );
          return (
            <li key={f.id}>
              {onPick ? (
                <>
                  <div className="food-row">
                    <button className="row" onClick={() => setOpen(open === f.id ? null : f.id)} aria-expanded={open === f.id}>
                      {body}
                      <Icon name={open === f.id ? 'close' : 'plus'} size={18} />
                    </button>
                    {star}
                  </div>
                  {open === f.id && (
                    <div className="serving-choices">
                      {orderedServings(f).map(({ serving: s, index: i }) => (
                        <button key={i} className={`serving-choice sc-${s.level}`} onClick={() => onPick(f, i)}>
                          <LevelDot level={s.level} />
                          <span className="grow">{s.label}</span>
                          {s.level !== 'low' && <span className="small">{groupsText(s)}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="food-row">
                  <Link to={`/foods/${f.id}`} className="row">
                    {body}
                    <Icon name="chevron" size={18} />
                  </Link>
                  {star}
                </div>
              )}
            </li>
          );
        })}
        {!foods.length && <li className="empty">{favOnly && !favourites.size ? 'No favourites yet. Tap ☆ on a food to add it.' : 'No foods match.'}</li>}
      </ul>
    </>
  );
}

/** "GL 8 per 1 tbsp (12g)": GL is only meaningful for a stated amount, so always show it with its serving. */
function GlLine({ food }: { food: Food }) {
  if (food.gl === undefined) return null;
  return (
    <span className="row-sub gl-line">
      <span className={`gl-tag gl-${glLevel(food.gl)}`}>GL {food.gl}</span> {food.gl === 0 ? 'no carbohydrate' : `per ${glServingShort(food)}`}
    </span>
  );
}
