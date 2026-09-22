import { Component, type ReactNode } from 'react';
import { db, TABLES } from '../db/db';
import { exportData } from '../lib/backup';
import { today } from '../lib/dates';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
  busy: string;
}

/**
 * Stops a render error on one screen from unmounting the whole app (which used to blank the
 * page and lock the user out of all logging). Shows the error and offers recovery: reload,
 * export a backup, or delete just today's entries — the usual culprit for a screen that
 * won't render.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, busy: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Surface it for anyone reading the console / a bug report.
    console.error('App error boundary caught:', error, info);
  }

  private exportBackup = async () => {
    this.setState({ busy: 'export' });
    try {
      const data = await exportData(db);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `fodmap-backup-${today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export failed: ${(e as Error).message}`);
    }
    this.setState({ busy: '' });
  };

  private deleteToday = async () => {
    if (!confirm("Delete everything logged today (meals, symptoms, bowel movements and check-in)? Other days are kept. Export a backup first if you're unsure.")) return;
    this.setState({ busy: 'today' });
    const d = today();
    try {
      await db.transaction('rw', db.meals, db.symptoms, db.bowel, db.days, async () => {
        await db.meals.where('date').equals(d).delete();
        await db.symptoms.where('date').equals(d).delete();
        await db.bowel.where('date').equals(d).delete();
        await db.days.delete(d);
      });
      location.hash = '#/';
      location.reload();
    } catch (e) {
      alert(`Could not delete: ${(e as Error).message}`);
      this.setState({ busy: '' });
    }
  };

  private wipeAll = async () => {
    if (!confirm('Delete ALL app data on this device? This cannot be undone — export a backup first.')) return;
    if (!confirm('Really delete everything?')) return;
    this.setState({ busy: 'wipe' });
    try {
      await db.transaction(
        'rw',
        TABLES.map((t) => db.table(t)),
        async () => {
          for (const t of TABLES) await db.table(t).clear();
        },
      );
      location.hash = '#/';
      location.reload();
    } catch (e) {
      alert(`Could not reset: ${(e as Error).message}`);
      this.setState({ busy: '' });
    }
  };

  render() {
    const { error, busy } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="crash">
        <h1>Something went wrong on this screen</h1>
        <p className="muted small">Your other days are safe. Try these in order. If it keeps happening, export a backup and send me the message below.</p>
        <div className="crash-actions">
          <button className="btn primary block" onClick={() => location.reload()}>
            Reload the app
          </button>
          <button className="btn block" disabled={!!busy} onClick={this.exportBackup}>
            {busy === 'export' ? 'Exporting…' : 'Export a backup first'}
          </button>
          <button className="btn block" disabled={!!busy} onClick={this.deleteToday}>
            {busy === 'today' ? 'Deleting…' : "Delete today's entries and reload"}
          </button>
          <button
            className="btn block"
            onClick={() => {
              location.hash = '#/settings';
              this.setState({ error: null, busy: '' });
            }}
          >
            Go to Settings
          </button>
          <button className="btn danger block" disabled={!!busy} onClick={this.wipeAll}>
            Delete all data
          </button>
        </div>
        <details className="crash-details">
          <summary>Error details</summary>
          <pre>
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </details>
      </div>
    );
  }
}
