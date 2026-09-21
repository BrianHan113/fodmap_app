import { Link, useParams } from 'react-router-dom';
import { DayTimeline } from '../components/DayTimeline';
import { Icon } from '../components/Icon';
import { Header } from '../components/ui';
import { addDays, formatDate, today } from '../lib/dates';

export default function DayView() {
  const { date = today() } = useParams();
  return (
    <>
      <Header title={formatDate(date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} back />
      <div className="day-nav">
        <Link to={`/history/${addDays(date, -1)}`} replace className="btn ghost">
          <Icon name="back" size={18} /> Prev
        </Link>
        <Link to={`/history/${addDays(date, 1)}`} replace className="btn ghost">
          Next <Icon name="chevron" size={18} />
        </Link>
      </div>
      <div className="quick">
        <Link to={`/meal/new?date=${date}`} className="quick-btn">
          <span className="quick-icon">🍽️</span>Meal
        </Link>
        <Link to={`/symptoms/new?date=${date}`} className="quick-btn">
          <span className="quick-icon">🌡️</span>Symptoms
        </Link>
        <Link to={`/bowel/new?date=${date}`} className="quick-btn">
          <span className="quick-icon">🚽</span>Bowel
        </Link>
        <Link to={`/day/${date}`} className="quick-btn">
          <span className="quick-icon">📝</span>Check-in
        </Link>
      </div>
      <DayTimeline date={date} />
    </>
  );
}
