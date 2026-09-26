import { Link } from 'react-router-dom';
import { hasDraft } from '../lib/draft';

/** Buttons to log a meal, symptoms, a bowel movement or the check-in for a date. */
export function QuickLog({ date }: { date: string }) {
  const buttons = [
    { to: `/meal/new?date=${date}`, draft: 'meal:new', icon: '🍽️', label: 'Meal' },
    { to: `/symptoms/new?date=${date}`, draft: 'symptoms:new', icon: '🌡️', label: 'Symptoms' },
    { to: `/bowel/new?date=${date}`, draft: 'bowel:new', icon: '🚽', label: 'Bowel' },
    { to: `/day/${date}`, draft: `day:${date}`, icon: '📝', label: 'Check-in' },
  ];
  return (
    <div className="quick">
      {buttons.map((b) => (
        <Link key={b.label} to={b.to} className="quick-btn">
          {hasDraft(b.draft) && <span className="quick-draft">Draft</span>}
          <span className="quick-icon">{b.icon}</span>
          {b.label}
        </Link>
      ))}
    </div>
  );
}
