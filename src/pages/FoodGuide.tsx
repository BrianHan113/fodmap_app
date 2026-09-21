import { Link, useSearchParams } from 'react-router-dom';
import { FoodBrowser, type FoodFilters } from '../components/FoodBrowser';
import { Icon } from '../components/Icon';
import { Header } from '../components/ui';
import type { FoodSort } from '../lib/foods';

export default function FoodGuide() {
  const [params, setParams] = useSearchParams();
  // Filters live in the URL so they survive opening a food and coming back.
  const filters: FoodFilters = {
    q: params.get('q') ?? '',
    cat: params.get('cat') ?? '',
    lowOnly: params.get('low') === '1',
    lowAll: params.get('all') === '1',
    bigSafe: params.get('big') === '1',
    favOnly: params.get('fav') === '1',
    sort: (params.get('sort') as FoodSort | null) ?? 'name',
    recent: false,
  };

  const onChange = (patch: Partial<FoodFilters>) => {
    const next = { ...filters, ...patch };
    const p = new URLSearchParams();
    if (next.q) p.set('q', next.q);
    if (next.cat) p.set('cat', next.cat);
    if (next.lowOnly) p.set('low', '1');
    if (next.lowAll) p.set('all', '1');
    if (next.bigSafe) p.set('big', '1');
    if (next.favOnly) p.set('fav', '1');
    if (next.sort !== 'name') p.set('sort', next.sort);
    setParams(p, { replace: true });
  };

  return (
    <>
      <Header title="Food guide" />
      <FoodBrowser filters={filters} onChange={onChange} />
      <Link to="/settings/foods/new" className="btn block">
        <Icon name="plus" size={18} /> Add a custom food
      </Link>
    </>
  );
}
