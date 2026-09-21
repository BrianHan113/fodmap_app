import { useState } from 'react';
import { saveSettings } from '../db/hooks';
import { today } from '../lib/dates';

const STEPS = [
  {
    title: 'Welcome to FODMAP Helper',
    body: (
      <>
        <p>
          FODMAPs are short-chain carbs that some guts struggle to absorb. They are grouped into <b>fructose</b>,{' '}
          <b>lactose</b>, the polyols <b>sorbitol</b> and <b>mannitol</b>, <b>GOS</b> and <b>fructans</b>.
        </p>
        <p>
          Most foods aren't simply "good" or "bad". What matters is <b>how much</b> you eat. This app shows safe
          serving sizes and warns you when servings add up in one meal.
        </p>
      </>
    ),
  },
  {
    title: 'Three phases',
    body: (
      <ol className="phases">
        <li>
          <b>Elimination (2–6 weeks).</b> Eat only low-FODMAP servings and log how you feel until symptoms settle.
        </li>
        <li>
          <b>Reintroduction.</b> Test one FODMAP group at a time over 3 days with increasing doses, then take a
          washout break. The app schedules and scores each challenge.
        </li>
        <li>
          <b>Personalization.</b> Bring back everything you tolerate. The food guide then marks foods by{' '}
          <i>your</i> results, so your diet is as varied as possible.
        </li>
      </ol>
    ),
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [start, setStart] = useState(today());
  const last = step === STEPS.length;

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        {!last ? (
          <>
            <h1>{STEPS[step].title}</h1>
            {STEPS[step].body}
          </>
        ) : (
          <>
            <h1>Let's start</h1>
            <label className="field">
              <span>Elimination start date</span>
              <input type="date" value={start} max={today()} onChange={(e) => setStart(e.target.value)} />
            </label>
            <div className="callout">
              <b>Please note.</b> Serving thresholds here are approximations compiled from public Monash University and
              FODMAP Friendly information. The official Monash FODMAP app is the reference. Low-FODMAP is best done with
              a doctor or dietitian, after coeliac disease and other conditions have been ruled out.
            </div>
            <p className="muted small">Your data is stored only on this device. Use Settings → Export to back it up.</p>
          </>
        )}
        <div className="onboarding-nav">
          <div className="dots">
            {[...STEPS, null].map((_, i) => (
              <span key={i} className={i === step ? 'on' : ''} />
            ))}
          </div>
          {step > 0 && (
            <button className="btn ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          {!last ? (
            <button className="btn primary" onClick={() => setStep(step + 1)}>
              Next
            </button>
          ) : (
            <button className="btn primary" onClick={() => saveSettings({ onboarded: true, phase: 'elimination', elimStart: start })}>
              Start elimination
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
