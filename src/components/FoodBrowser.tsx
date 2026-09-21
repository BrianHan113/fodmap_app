import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useChallenges, useFoods } from '../db/hooks';
import { matchesQuery, safeServing, sortFoods, type FoodSort } from '../lib/foods';
import { personalVerdict, toleranceMap } from '../lib/tolerance';
import { CATEGORIES, type Food } from '../types';
import { Icon } from './Icon';
import { LevelDot, VerdictBadge, groupsText } from './ui';

export interface FoodFilters {
  q: string;
  cat: string;
  lowOnly: boolean;
  sort: FoodSort;
  /** Only foods from recent meals (picker only). */
  recent: boolean;
}

export const DEFAULT_FILTERS: FoodFilters = { q: '', cat: '', lowOnly: false, sort: 'name', recent: false };

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
  const [open, setOpen] = useState<string | null>(null);
  const { q, cat, lowOnly, sort } = filters;
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
          (!recent || recentSet.has(f.id)),
      ),
      sort,
    );
  }, [list, q, cat, lowOnly, sort, recent, recentIds]);

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
        {hasRecent && (
          <button className={`chip ${recent ? 'on' : ''}`} onClick={() => onChange({ recent: !recent })}>
            Recent
          </button>
        )}
        <button className={`chip ${lowOnly ? 'on' : ''}`} onClick={() => onChange({ lowOnly: !lowOnly })}>
          Has a low serving
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => onChange({ cat: cat === c ? '' : c })}>
            {c}
          </button>
        ))}
      </div>
      <div className="guide-tools">
        <div className="legend small muted">
          <LevelDot level="low" /> low <LevelDot level="moderate" /> moderate <LevelDot level="high" /> high at smallest serving
        </div>
        <label className="sort small muted">
          Sort
          <select value={sort} onChange={(e) => onChange({ sort: e.target.value as FoodSort })}>
            <option value="name">A–Z</option>
            <option value="low">Lowest FODMAP first</option>
            <option value="high">Highest FODMAP first</option>
          </select>
        </label>
      </div>
      <ul className="list card flush">
        {foods.map((f) => {
          const safe = safeServing(f);
          const verdict = hasResults ? personalVerdict(f, tol) : undefined;
          const body = (
            <>
              <LevelDot level={f.servings[0].level} />
              <span className="grow">
                <span className="row-title">{f.name}</span>
                <span className="row-sub">{safe ? `Low: up to ${safe.label}` : 'No low-FODMAP serving'}</span>
              </span>
              {verdict && verdict !== 'untested' && <VerdictBadge verdict={verdict} />}
            </>
          );
          return (
            <li key={f.id}>
              {onPick ? (
                <>
                  <button className="row" onClick={() => setOpen(open === f.id ? null : f.id)} aria-expanded={open === f.id}>
                    {body}
                    <Icon name={open === f.id ? 'close' : 'plus'} size={18} />
                  </button>
                  {open === f.id && (
                    <div className="serving-choices">
                      {f.servings.map((s, i) => (
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
                <Link to={`/foods/${f.id}`} className="row">
                  {body}
                  <Icon name="chevron" size={18} />
                </Link>
              )}
            </li>
          );
        })}
        {!foods.length && <li className="empty">No foods match.</li>}
      </ul>
    </>
  );
}
