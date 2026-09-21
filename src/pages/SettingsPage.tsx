import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Header, Segmented } from '../components/ui';
import { db } from '../db/db';
import { saveSettings, useFoods, useSettings } from '../db/hooks';
import { exportData, importData, resetData } from '../lib/backup';
import { today } from '../lib/dates';
import type { Phase } from '../types';

export default function SettingsPage() {
  const settings = useSettings();
  const { overrides } = useFoods();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const doExport = async () => {
    const data = await exportData(db);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fodmap-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Backup downloaded.');
  };

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!confirm('Importing replaces ALL current data on this device with the backup. Continue?')) return;
      await importData(db, data);
      setMsg('Backup restored.');
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  };

  const doReset = async () => {
    if (!confirm('Delete ALL your data (logs, challenges, custom foods)? Export a backup first if you might want it.')) return;
    if (!confirm('Really delete everything? This cannot be undone.')) return;
    await resetData(db);
  };

  const custom = overrides.filter((f) => f.custom && !f.hidden);
  const edited = overrides.filter((f) => !f.custom);

  return (
    <>
      <Header title="Settings" back />
      <section className="card">
        <h2>Phase</h2>
        <Segmented<Phase>
          value={settings.phase}
          onChange={(phase) => saveSettings({ phase })}
          options={[
            { value: 'elimination', label: 'Elimination' },
            { value: 'reintroduction', label: 'Reintro' },
            { value: 'personalization', label: 'Personal' },
          ]}
        />
        <label className="field">
          <span>Elimination start date</span>
          <input type="date" value={settings.elimStart} onChange={(e) => e.target.value && saveSettings({ elimStart: e.target.value })} />
        </label>
      </section>

      <section className="card">
        <h2>Appearance</h2>
        <Segmented
          value={settings.theme}
          onChange={(theme) => saveSettings({ theme })}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </section>

      <section className="card">
        <h2>Foods</h2>
        <Link to="/settings/foods/new" className="btn block">
          <Icon name="plus" size={18} /> Add custom food
        </Link>
        {custom.length > 0 && (
          <>
            <h3>Custom foods</h3>
            <ul className="list">
              {custom.map((f) => (
                <li key={f.id}>
                  <Link to={`/settings/foods/${f.id}`} className="row">
                    <span className="grow">{f.name}</span>
                    <Icon name="chevron" size={18} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        {edited.length > 0 && (
          <>
            <h3>Edited or hidden built-in foods</h3>
            <ul className="list">
              {edited.map((f) => (
                <li key={f.id}>
                  <Link to={`/settings/foods/${f.id}`} className="row">
                    <span className="grow">{f.name}</span>
                    {f.hidden && <span className="badge">Hidden</span>}
                    <Icon name="chevron" size={18} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <h2>Your data</h2>
        <p className="muted small">
          Everything is stored only on this device. Export a backup regularly (e.g. to Google Drive), especially before clearing browser data or switching
          phones.
        </p>
        <div className="btn-row">
          <button className="btn primary" onClick={doExport}>
            Export backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = '';
          }}
        />
        {msg && <p className="small">{msg}</p>}
        <Link to="/export" className="btn block">
          Export diary for AI analysis
        </Link>
        <button className="btn danger block" onClick={doReset}>
          Delete all data
        </button>
      </section>

      <section className="card">
        <h2>About</h2>
        <p className="muted small">
          Serving thresholds are approximations compiled from publicly available Monash University and FODMAP Friendly information and may differ from the
          latest lab testing. The Monash University FODMAP Diet app is the reference. This app does not give medical advice. Work with your doctor or a
          dietitian.
        </p>
      </section>
    </>
  );
}
