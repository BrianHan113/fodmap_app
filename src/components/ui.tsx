import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { GROUP_LABEL, type Group, type Level, type Serving } from '../types';
import type { Verdict } from '../lib/tolerance';
import { VERDICT_LABEL } from '../lib/tolerance';
import { Icon } from './Icon';

export const LEVEL_TEXT: Record<Level, string> = { low: 'Low', moderate: 'Moderate', high: 'High' };

export function LevelDot({ level }: { level: Level }) {
  return <span className={`dot dot-${level}`} aria-label={LEVEL_TEXT[level]} />;
}

export function LevelBadge({ level }: { level: Level }) {
  return <span className={`badge badge-${level}`}>{LEVEL_TEXT[level]}</span>;
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <span className={`badge verdict-${verdict}`}>{VERDICT_LABEL[verdict]}</span>;
}

export function groupsText(s: Serving): string {
  return (Object.keys(s.groups) as Group[]).map((g) => GROUP_LABEL[g]).join(', ');
}

export function Header({ title, back, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="topbar">
      {back ? (
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back">
          <Icon name="back" />
        </button>
      ) : (
        <span className="topbar-spacer" />
      )}
      <h1>{title}</h1>
      <span className="topbar-right">{right ?? <span className="topbar-spacer" />}</span>
    </header>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  lowText,
  highText,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  lowText?: string;
  highText?: string;
}) {
  return (
    <label className="slider">
      <span className="slider-head">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {(lowText || highText) && (
        <span className="slider-foot">
          <span>{lowText}</span>
          <span>{highText}</span>
        </span>
      )}
    </label>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** Shown when a form reopens with unsaved changes from an earlier visit. */
export function DraftNotice({ onDiscard }: { onDiscard: () => void }) {
  return (
    <div className="callout draft-notice">
      <span className="grow">Unsaved changes restored.</span>
      <button className="draft-discard" onClick={onDiscard}>
        Discard
      </button>
    </div>
  );
}
