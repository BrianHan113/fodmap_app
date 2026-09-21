import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Header, Segmented } from '../components/ui';
import { db } from '../db/db';
import { useChallenges, useFoods, useSettings } from '../db/hooks';
import { addDays, today } from '../lib/dates';
import { buildLlmExport } from '../lib/llmExport';

type Preset = 7 | 14 | 30 | 0;

export default function LlmExport() {
  const settings = useSettings();
  const { map } = useFoods();
  const challenges = useChallenges();
  const t = today();
  const [preset, setPreset] = useState<Preset>(14);
  const [start, setStart] = useState(addDays(t, -13));
  const [end, setEnd] = useState(t);
  const [focus, setFocus] = useState('');
  const [msg, setMsg] = useState('');

  const pickPreset = (p: Preset) => {
    setPreset(p);
    if (p) {
      setStart(addDays(t, -(p - 1)));
      setEnd(t);
    }
  };

  const data = useLiveQuery(async () => {
    const [meals, symptoms, bowel, days] = await Promise.all([
      db.meals.where('date').between(start, end, true, true).toArray(),
      db.symptoms.where('date').between(start, end, true, true).toArray(),
      db.bowel.where('date').between(start, end, true, true).toArray(),
      db.days.where('date').between(start, end, true, true).toArray(),
    ]);
    return { meals, symptoms, bowel, days };
  }, [start, end]);

  const text = useMemo(
    () => (data && start <= end ? buildLlmExport({ start, end, today: t, settings, challenges, foods: map, focus, ...data }) : ''),
    [data, start, end, t, settings, challenges, map, focus],
  );

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2500);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      flash('Copied. Paste it into ChatGPT, Claude, Gemini…');
    } catch {
      flash('Copy failed. Select the text below and copy it manually.');
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: 'FODMAP diary', text });
    } catch {
      /* user cancelled */
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fodmap-diary-${start}-to-${end}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = data && `${data.meals.length} meals · ${data.symptoms.length} symptom logs · ${data.bowel.length} bowel · ${data.days.length} check-ins`;

  return (
    <>
      <Header title="Export for AI" back />
      <section className="card">
        <p className="muted small">
          Builds a ready-made prompt with your diary for the chosen dates. Paste it into an AI assistant to summarise your data, spot patterns and suggest
          adjustments.
        </p>
        <Segmented<Preset>
          value={preset}
          onChange={pickPreset}
          options={[
            { value: 7, label: '7 days' },
            { value: 14, label: '14 days' },
            { value: 30, label: '30 days' },
            { value: 0, label: 'Custom' },
          ]}
        />
        <div className="row-fields">
          <label className="field">
            <span>From</span>
            <input
              type="date"
              value={start}
              max={end}
              onChange={(e) => {
                if (!e.target.value) return;
                setStart(e.target.value);
                setPreset(0);
              }}
            />
          </label>
          <label className="field">
            <span>To</span>
            <input
              type="date"
              value={end}
              min={start}
              max={t}
              onChange={(e) => {
                if (!e.target.value) return;
                setEnd(e.target.value);
                setPreset(0);
              }}
            />
          </label>
        </div>
        <label className="field">
          <span>Anything specific to ask? (optional)</span>
          <textarea
            rows={2}
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. Why am I bloated in the evenings? Am I ready for reintroduction?"
          />
        </label>
        {counts && <p className="muted small">{counts}</p>}
      </section>

      <div className="btn-row">
        <button className="btn primary" onClick={copy} disabled={!text}>
          Copy prompt
        </button>
        {'share' in navigator && (
          <button className="btn" onClick={share} disabled={!text}>
            Share…
          </button>
        )}
        <button className="btn" onClick={download} disabled={!text}>
          Download .md
        </button>
      </div>
      {msg && <p className="small center">{msg}</p>}

      <section className="card">
        <h2>Preview</h2>
        <pre className="export-preview">{text}</pre>
      </section>
      <p className="muted small center">Your diary is only sent where you choose to paste or share it.</p>
    </>
  );
}
