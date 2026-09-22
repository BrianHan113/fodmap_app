import { Suspense, lazy, useEffect } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Icon } from './components/Icon';
import { SettingsContext, useSettingsQuery } from './db/hooks';
import BowelForm from './pages/BowelForm';
import ChallengePage from './pages/ChallengePage';
import DayForm from './pages/DayForm';
import DayView from './pages/DayView';
import FoodDetail from './pages/FoodDetail';
import FoodEditor from './pages/FoodEditor';
import FoodGuide from './pages/FoodGuide';
import History from './pages/History';
import LlmExport from './pages/LlmExport';
import MealForm from './pages/MealForm';
import Onboarding from './pages/Onboarding';
import Reintro from './pages/Reintro';
import SettingsPage from './pages/SettingsPage';
import SymptomForm from './pages/SymptomForm';
import Today from './pages/Today';

const Insights = lazy(() => import('./pages/Insights'));

const TABS = [
  { to: '/', label: 'Today', icon: 'home' },
  { to: '/foods', label: 'Foods', icon: 'leaf' },
  { to: '/history', label: 'Diary', icon: 'calendar' },
  { to: '/reintro', label: 'Reintro', icon: 'flask' },
  { to: '/insights', label: 'Insights', icon: 'chart' },
];

export default function App() {
  const settings = useSettingsQuery();
  const { pathname } = useLocation();

  useEffect(() => {
    const t = settings?.theme;
    if (t && t !== 'system') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }, [settings?.theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!settings) return null;
  if (!settings.onboarded) return <Onboarding />;

  return (
    <SettingsContext.Provider value={settings}>
      <div className="app">
        <main className="content">
          <ErrorBoundary key={pathname}>
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/foods" element={<FoodGuide />} />
            <Route path="/foods/:id" element={<FoodDetail />} />
            <Route path="/meal/:id" element={<MealForm />} />
            <Route path="/symptoms/:id" element={<SymptomForm />} />
            <Route path="/bowel/:id" element={<BowelForm />} />
            <Route path="/day/:date" element={<DayForm />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:date" element={<DayView />} />
            <Route path="/reintro" element={<Reintro />} />
            <Route path="/reintro/:id" element={<ChallengePage />} />
            <Route path="/insights" element={<Suspense fallback={null}><Insights /></Suspense>} />
            <Route path="/export" element={<LlmExport />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/foods/:id" element={<FoodEditor />} />
            <Route path="*" element={<Today />} />
          </Routes>
          </ErrorBoundary>
        </main>
        <nav className="tabbar">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>
              <Icon name={t.icon} />
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </SettingsContext.Provider>
  );
}
