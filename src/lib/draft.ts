import { useEffect, useRef, useState } from 'react';

/*
 * Unsaved form drafts, kept in localStorage so leaving a form (a stray tap on the nav bar,
 * switching apps) doesn't lose what was entered. One draft per form, e.g. "meal:new" or
 * "meal:12". A draft only exists while the form differs from its starting state.
 */

const PREFIX = 'draft:';

export function readDraft<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function hasDraft(key: string): boolean {
  return readDraft(key) !== undefined;
}

function writeDraft(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: drafts are a convenience, so carry on without one.
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Ignore, as above.
  }
}

/** JSON with object keys sorted, so equal values compare equal whatever order their keys were set in. */
function stableJson(v: unknown): string {
  return JSON.stringify(v, (_, x) =>
    x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x,
  );
}

interface State<T> {
  key: string;
  /** The form's current values; undefined while the saved entry loads. */
  value?: T;
  /** The values with no edits: defaults for a new entry, or the saved entry. */
  baseline?: T;
  restored: boolean;
}

export interface Draft<T> {
  value: T | undefined;
  set: (patch: Partial<T>) => void;
  /** An unsaved draft from an earlier visit was restored. */
  restored: boolean;
  /** Drop the draft and go back to the starting values. */
  discard: () => void;
  /** Drop the draft after saving or deleting. */
  clear: () => void;
}

/**
 * Form state that survives leaving the page. `makeDefault` gives a new entry's values; `load`
 * (for editing) fetches the saved entry in the same shape. Pass a different key for each form
 * and entry.
 */
export function useDraft<T extends object>(key: string, makeDefault: () => T, load?: () => Promise<T | undefined>): Draft<T> {
  const init = (): State<T> => {
    if (load) return { key, restored: false };
    const base = makeDefault();
    const draft = readDraft<T>(key);
    return { key, value: draft ?? base, baseline: base, restored: !!draft };
  };
  const [s, setS] = useState(init);
  const done = useRef(false);

  // Load the saved entry, and start over when the route switches to another entry.
  useEffect(() => {
    done.current = false;
    if (!load) {
      if (s.key !== key) setS(init());
      return;
    }
    let cancelled = false;
    setS({ key, restored: false });
    load().then((saved) => {
      if (cancelled) return;
      const base = saved ?? makeDefault();
      const draft = readDraft<T>(key);
      setS({ key, value: draft ?? base, baseline: base, restored: !!draft });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (done.current || s.key !== key || s.value === undefined) return;
    if (stableJson(s.value) === stableJson(s.baseline)) clearDraft(key);
    else writeDraft(key, s.value);
  }, [s, key]);

  return {
    value: s.key === key ? s.value : undefined,
    set: (patch) => setS((cur) => (cur.value ? { ...cur, value: { ...cur.value, ...patch } } : cur)),
    restored: s.restored,
    discard: () => setS((cur) => ({ ...cur, value: cur.baseline, restored: false })),
    clear: () => {
      done.current = true;
      clearDraft(key);
    },
  };
}
