/**
 * What a visitor's choices about the backgrounds look like in storage.
 *
 * The whole state used to be saved — every setting of every background,
 * changed or not. That made a default something a visitor only ever got
 * once: the first visit wrote the values of the day into their browser, and
 * from then on those were "their settings", so a default re-cut later reached
 * nobody who had been here before. When the six backgrounds were rebuilt
 * that would have left every returning visitor looking at the new scenes
 * through the old ones' numbers.
 *
 * So what is saved now is the difference: which background was up, and only
 * the settings that are not what the background would have had anyway. A
 * default can move and everyone who never touched that control moves with
 * it; a value somebody chose stays chosen.
 *
 * A blob from before the change says nothing about which of its values were
 * chosen. It is read once, on the way to the new shape: the background that
 * was up is kept, and so is any colour that is not the colour the old version
 * shipped — a visitor's own palette is theirs, and it means the same thing on
 * the new scenes. Everything else in it is let go. The numbers were tuned
 * against pictures that no longer exist, and most of the names now mean
 * something a little different.
 */

export const STORAGE_KEY = 'animatedBackgroundSettings';

/** The shape described above. Anything saved without it is the old shape. */
export const SETTINGS_VERSION = 2;

type Values = Record<string, unknown>;

export interface SavedBackgrounds {
  version: number;
  currentBackgroundId: string;
  /** Per background: the settings that differ from its defaults. */
  settings: Record<string, Values>;
}

// The colours each background shipped with before the rebuild, to tell a
// colour somebody picked from one they were merely given.
const LEGACY_COLORS: Record<string, Record<string, number[]>> = {
  'pde-solver': {
    positive: [0.1, 0.6, 1.0],
    negative: [1.0, 0.3, 0.4],
    zero: [0.1, 0.1, 0.15],
  },
  'simple-waves': {
    primary: [0.2, 0.1, 0.8],
    secondary: [0.8, 0.2, 0.8],
    accent: [1.0, 0.6, 0.1],
    background: [0.15, 0.15, 0.2],
    grid: [0.3, 0.3, 0.3],
  },
  'cellular-automaton': {
    primary: [0.1, 0.8, 0.3],
    secondary: [0.9, 0.4, 0.1],
    accent: [1.0, 0.7, 0.2],
    background: [0.15, 0.15, 0.2],
    grid: [0.25, 0.3, 0.35],
  },
  'spectrogram-oscilloscope': {
    primary: [0.0, 0.8, 1.0],
    secondary: [1.0, 0.4, 0.8],
    accent: [1.0, 1.0, 0.0],
    background: [0.0, 0.1, 0.4],
    grid: [0.2, 0.3, 0.4],
  },
  'graph-topology': {
    primary: [0.2, 0.8, 1.0],
    secondary: [1.0, 0.7, 0.0],
    accent: [1.0, 0.2, 0.8],
    background: [0.15, 0.15, 0.2],
    grid: [0.25, 0.3, 0.35],
  },
  'shortest-path-lab': {
    primary: [0.0, 0.55, 1.0],
    secondary: [1.0, 1.0, 0.0],
    accent: [0.9, 0.2, 0.2],
    background: [0.18, 0.2, 0.26],
    grid: [0.2, 0.3, 0.4],
  },
};

const isRecord = (value: unknown): value is Values =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isColor = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every(part => typeof part === 'number' && Number.isFinite(part));

// A colour that has been through a colour picker and back comes home a hair
// off: eight bits a channel is a step of 1/255, so a channel can return as
// much as half a step from where it left. Only colours get the allowance —
// a slider's value is exactly what it was set to, and some of them move in
// steps far smaller than this.
const CHANNEL_SLACK = 0.5 / 255 + 1e-6;

const sameValue = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) && Array.isArray(b))
    return (
      a.length === b.length &&
      a.every((part, i) => {
        const other = b[i];
        return typeof part === 'number' && typeof other === 'number'
          ? Math.abs(part - other) <= CHANNEL_SLACK
          : sameValue(part, other);
      })
    );
  return a === b;
};

/**
 * The part of `settings` that is not `defaults` over again: what is worth
 * saving. Nested groups (the colours) are compared entry by entry, so
 * changing one colour saves one colour.
 */
export const overridesOf = (settings: Values, defaults: Values): Values => {
  const overrides: Values = {};
  for (const [key, value] of Object.entries(settings)) {
    if (value === undefined) continue;
    const base = defaults[key];
    if (isRecord(value) && isRecord(base)) {
      const inner = overridesOf(value, base);
      if (Object.keys(inner).length > 0) overrides[key] = inner;
    } else if (!sameValue(value, base)) {
      overrides[key] = value;
    }
  }
  return overrides;
};

/**
 * `overrides` laid over `defaults`. A saved value of a different kind from
 * the default it would replace is left out: a string where a scene expects a
 * number reaches three.js as NaN, and things silently vanish.
 */
export const withOverrides = <T extends object>(
  defaults: T,
  overrides: Values | undefined
): T => {
  const base = defaults as unknown as Values;
  const merged: Values = { ...base };
  if (!isRecord(overrides)) return merged as unknown as T;
  for (const [key, value] of Object.entries(overrides)) {
    const original = base[key];
    if (isRecord(original)) {
      if (isRecord(value)) merged[key] = withOverrides(original, value);
      continue;
    }
    if (original !== undefined && typeof value !== typeof original) continue;
    if (Array.isArray(original) !== Array.isArray(value)) continue;
    merged[key] = value;
  }
  return merged as unknown as T;
};

// The old shape, brought across: only the colours somebody chose.
const fromLegacy = (settings: Values): Record<string, Values> => {
  const kept: Record<string, Values> = {};
  for (const [id, saved] of Object.entries(settings)) {
    const shipped = LEGACY_COLORS[id];
    if (!shipped || !isRecord(saved) || !isRecord(saved.colors)) continue;
    const colors: Values = {};
    for (const [name, value] of Object.entries(saved.colors)) {
      if (!isColor(value) || !shipped[name]) continue;
      if (!sameValue(value, shipped[name])) colors[name] = value;
    }
    if (Object.keys(colors).length > 0) kept[id] = { colors };
  }
  return kept;
};

/**
 * Read what is in storage, whatever its age. Null when there is nothing
 * there to use.
 */
export const parseSaved = (raw: string | null): SavedBackgrounds | null => {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || typeof parsed.currentBackgroundId !== 'string')
    return null;

  const saved = isRecord(parsed.settings) ? parsed.settings : {};
  if (parsed.version !== SETTINGS_VERSION) {
    return {
      version: SETTINGS_VERSION,
      currentBackgroundId: parsed.currentBackgroundId,
      settings: fromLegacy(saved),
    };
  }

  const settings: Record<string, Values> = {};
  for (const [id, values] of Object.entries(saved)) {
    if (isRecord(values)) settings[id] = values;
  }
  return {
    version: SETTINGS_VERSION,
    currentBackgroundId: parsed.currentBackgroundId,
    settings,
  };
};

/** What to write: the background that is up, and what was changed. */
export const toSaved = (
  currentBackgroundId: string,
  settings: Record<string, object>,
  defaults: Record<string, object>
): SavedBackgrounds => {
  const changed: Record<string, Values> = {};
  for (const [id, values] of Object.entries(settings)) {
    const overrides = overridesOf(
      values as Values,
      (defaults[id] ?? {}) as Values
    );
    if (Object.keys(overrides).length > 0) changed[id] = overrides;
  }
  return {
    version: SETTINGS_VERSION,
    currentBackgroundId,
    settings: changed,
  };
};
