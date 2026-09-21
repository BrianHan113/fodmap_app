import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Header, LevelDot, VerdictBadge } from '../components/ui';
import { useChallenges, useFoods } from '../db/hooks';
import { matchesQuery, safeServing } from '../lib/foods';
import { personalVerdict, toleranceMap } from '../lib/tolerance';
import { CATEGORIES } from '../types';

export default function FoodGuide() {
  const { list } = useFoods();
  const challenges = useChallenges();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cat = params.get('cat') ?? '';
  const lowOnly = params.get('low') === '1';

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };

  const tol = useMemo(() => toleranceMap(challenges), [challenges]);
  const hasResults = Object.keys(tol).length > 0;

  const foods = useMemo(
    () =>
      list.filter(
        (f) => matchesQuery(f, q) && (!cat || f.category === cat) && (!lowOnly || f.servings.some((s) => s.level === 'low')),
      ),
    [list, q, cat, lowOnly],
  );

  return (
    <>
      <Header title="Food guide" />
      <div className="search sticky">
        <Icon name="search" size={18} />
        <input placeholder={`Search ${list.length} foods…`} value={q} onChange={(e) => set('q', e.target.value)} />
        {q && (
          <button className="icon-btn" onClick={() => set('q', '')} aria-label="Clear">
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
      <div className="chips">
        <button className={`chip ${lowOnly ? 'on' : ''}`} onClick={() => set('low', lowOnly ? '' : '1')}>
          Has a low serving
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => set('cat', cat === c ? '' : c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="legend small muted">
        <LevelDot level="low" /> low <LevelDot level="moderate" /> moderate <LevelDot level="high" /> high at smallest serving
      </div>
      <ul className="list card flush">
        {foods.map((f) => {
          const safe = safeServing(f);
          const verdict = hasResults ? personalVerdict(f, tol) : undefined;
          return (
            <li key={f.id}>
              <Link to={`/foods/${f.id}`} className="row">
                <LevelDot level={f.servings[0].level} />
                <span className="grow">
                  <span className="row-title">{f.name}</span>
                  <span className="row-sub">{safe ? `Low: up to ${safe.label}` : 'No low-FODMAP serving'}</span>
                </span>
                {verdict && verdict !== 'untested' && <VerdictBadge verdict={verdict} />}
                <Icon name="chevron" size={18} />
              </Link>
            </li>
          );
        })}
        {!foods.length && <li className="empty">No foods match.</li>}
      </ul>
      <Link to="/settings/foods/new" className="btn block">
        <Icon name="plus" size={18} /> Add a custom food
      </Link>
    </>
  );
}
