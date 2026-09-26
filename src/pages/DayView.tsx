import { Link, useParams } from 'react-router-dom';
import { DayTimeline } from '../components/DayTimeline';
import { Icon } from '../components/Icon';
import { QuickLog } from '../components/QuickLog';
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
      <QuickLog date={date} />
      <DayTimeline date={date} />
    </>
  );
}
