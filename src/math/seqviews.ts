/**
 * MODEL SPECIFICATION
 *
 * System:        the sequences of lesson 2.1 (sequences: boundedness and monotonicity), each with the exact facts
 *                the lesson proves about it: its sup and inf (null when there is none), whether they are attained,
 *                from which place on it is monotone and how, whether its set of values is finite and whether it is
 *                eventually constant. The figure SequenceViews draws the first terms in two views (the values on a
 *                number line, with repeated values stacked; the points (n, aₙ)), bound lines the student drags,
 *                and a mark for each step up or down between consecutive terms.
 * Dynamics:      none. Recursive presets are evaluated once into a cached array (never re-run per n).
 * Boundary:      the window functions (`stepSigns`, `monotoneFrom`, `outside`, `valueStacks`) see only n ≤ the
 *                window: evidence, never proof. The exact facts (`sup`, `inf`, `mono`, `valuesFinite`,
 *                `eventuallyConstant`) are theorems of the lesson, and the figure's tasks are checked against them,
 *                so a student is never rewarded for a "bound" that only the drawn terms respect (n/(n+1) with
 *                U = 0.99 bounds the first 98 terms and is no bound).
 * Ignored:       exact arithmetic. Terms are doubles. Every preset is chosen so that on its window consecutive terms
 *                that differ in exact arithmetic also differ as doubles (the tests check the step signs against the
 *                exact ones), and equal values are exactly equal doubles (integers, ±1).
 * Valid when:    n ≤ the preset's `winMax` (rec-half reaches 2 as a double near n = 55, so its window stops at 50).
 * Failure modes: a sequence whose behaviour changes after the window looks like its first terms (n¹⁰/2ⁿ rises
 *                for 13 steps): that is the lesson's point, and the caption says it.
 */

export type ViewSeqId =
  | 'ratio'
  | 'alt-recip'
  | 'root-diff'
  | 'rec-half'
  | 'pow2'
  | 'quad10'
  | 'sign'
  | 'sign-shift'
  | 'floor10'
  | 'n-pow-alt'
  | 'ratio10';

/** How a sequence is monotone from its place `from` on (the smallest such place): weak or strict, up or down. */
export interface Monotone {
  dir: 'inc' | 'dec';
  strict: boolean;
  from: number;
}

export interface ViewPreset {
  /** button label; a formula is wrapped in LRI … PDI so the RTL control panel does not reverse it */
  name: string;
  /** the formula as TeX-free text for captions and the aria label */
  formula: string;
  a: (n: number) => number;
  /** n-axis window at the start, and the largest window offered */
  window: number;
  winMax: number;
  /** the value range drawn (both panels); null: computed from the window's terms */
  y: [number, number] | null;
  /** the grid of the bound lines */
  step: number;
  /** exact facts, proved in the lesson (or in 1.6.3 for n/(n+1)); exception: the unattained inf 0 of root-diff,
   *  n-pow-alt and ratio10 is true but not proved in 2.1, and no task reads it (only `isUpperBound` is used) */
  sup: number | null;
  supAttained: boolean;
  inf: number | null;
  infAttained: boolean;
  /** from where it is monotone, or null if it is monotone from no place on */
  mono: Monotone | null;
  valuesFinite: boolean;
  eventuallyConstant: boolean;
}

/** a₁ = c, aₙ₊₁ = f(aₙ), evaluated once up to `max` and then read from the cache */
function recursive(c: number, f: (x: number) => number, max: number): (n: number) => number {
  const cache = [Number.NaN, c];
  for (let n = 1; n < max; n++) cache.push(f(cache[n]));
  return (n) => cache[n];
}

const REC_HALF_MAX = 50;

export const VIEW_SEQUENCES: Record<ViewSeqId, ViewPreset> = {
  ratio: {
    name: '⁦n/(n+1)⁩',
    formula: 'aₙ = n/(n+1)',
    a: (n) => n / (n + 1),
    window: 30,
    winMax: 400,
    y: [0, 1.2],
    step: 0.005,
    sup: 1,
    supAttained: false,
    inf: 0.5,
    infAttained: true,
    mono: { dir: 'inc', strict: true, from: 1 },
    valuesFinite: false,
    eventuallyConstant: false,
  },
  'alt-recip': {
    name: '⁦(−1)ⁿ/n⁩',
    formula: 'aₙ = (−1)ⁿ/n',
    a: (n) => (-1) ** n / n,
    window: 30,
    winMax: 200,
    y: [-1.2, 0.8],
    step: 0.01,
    sup: 0.5,
    supAttained: true,
    inf: -1,
    infAttained: true,
    mono: null,
    valuesFinite: false,
    eventuallyConstant: false,
  },
  'root-diff': {
    name: '⁦√(n+1) − √n⁩',
    formula: 'aₙ = √(n+1) − √n',
    // the conjugate form 1/(√(n+1) + √n): the same number, without the cancellation of a difference of close roots
    a: (n) => 1 / (Math.sqrt(n + 1) + Math.sqrt(n)),
    window: 30,
    winMax: 400,
    y: [-0.05, 0.5],
    step: 0.005,
    sup: Math.SQRT2 - 1,
    supAttained: true,
    inf: 0,
    infAttained: false,
    mono: { dir: 'dec', strict: true, from: 1 },
    valuesFinite: false,
    eventuallyConstant: false,
  },
  'rec-half': {
    name: '⁦aₙ₊₁ = aₙ/2 + 1⁩',
    formula: 'a₁ = 0, aₙ₊₁ = aₙ/2 + 1',
    a: recursive(0, (x) => x / 2 + 1, REC_HALF_MAX),
    window: 15,
    winMax: REC_HALF_MAX,
    y: [-0.2, 2.4],
    step: 0.01,
    sup: 2,
    supAttained: false,
    inf: 0,
    infAttained: true,
    mono: { dir: 'inc', strict: true, from: 1 },
    valuesFinite: false,
    eventuallyConstant: false,
  },
  pow2: {
    name: '⁦2ⁿ⁩',
    formula: 'aₙ = 2ⁿ',
    a: (n) => 2 ** n,
    window: 8,
    winMax: 12,
    y: null,
    step: 1,
    sup: null,
    supAttained: false,
    inf: 2,
    infAttained: true,
    mono: { dir: 'inc', strict: true, from: 1 },
    valuesFinite: false,
    eventuallyConstant: false,
  },
  quad10: {
    name: '⁦n² − 10n⁩',
    formula: 'aₙ = n² − 10n',
    a: (n) => n * n - 10 * n,
    window: 15,
    winMax: 40,
    y: null,
    step: 1,
    sup: null,
    supAttained: false,
    inf: -25,
    infAttained: true,
    mono: { dir: 'inc', strict: true, from: 5 },
    valuesFinite: false,
    eventuallyConstant: false,
  },
  sign: {
    name: '⁦(−1)ⁿ⁩',
    formula: 'aₙ = (−1)ⁿ',
    a: (n) => (n % 2 === 0 ? 1 : -1),
    window: 12,
    winMax: 200,
    y: [-1.6, 1.6],
    step: 0.05,
    sup: 1,
    supAttained: true,
    inf: -1,
    infAttained: true,
    mono: null,
    valuesFinite: true,
    eventuallyConstant: false,
  },
  'sign-shift': {
    name: '⁦(−1)ⁿ⁺¹⁩',
    formula: 'aₙ = (−1)ⁿ⁺¹',
    a: (n) => (n % 2 === 0 ? -1 : 1),
    window: 12,
    winMax: 200,
    y: [-1.6, 1.6],
    step: 0.05,
    sup: 1,
    supAttained: true,
    inf: -1,
    infAttained: true,
    mono: null,
    valuesFinite: true,
    eventuallyConstant: false,
  },
  floor10: {
    name: '⁦⌊10/n⌋⁩',
    formula: 'aₙ = ⌊10/n⌋',
    a: (n) => Math.floor(10 / n),
    window: 15,
    winMax: 200,
    y: [-1, 11],
    step: 0.1,
    sup: 10,
    supAttained: true,
    inf: 0,
    infAttained: true,
    mono: { dir: 'dec', strict: false, from: 1 },
    valuesFinite: true,
    eventuallyConstant: true,
  },
  'n-pow-alt': {
    name: '⁦n^((−1)ⁿ)⁩',
    formula: 'aₙ = n^((−1)ⁿ): n במקומות הזוגיים, 1/n באי-זוגיים',
    a: (n) => (n % 2 === 0 ? n : 1 / n),
    window: 20,
    winMax: 200,
    y: null,
    step: 0.5,
    sup: null,
    supAttained: false,
    inf: 0,
    infAttained: false,
    mono: null,
    valuesFinite: false,
    eventuallyConstant: false,
  },
  ratio10: {
    name: '⁦n¹⁰/2ⁿ⁩',
    formula: 'aₙ = n¹⁰/2ⁿ',
    a: (n) => n ** 10 / 2 ** n,
    window: 10,
    winMax: 80,
    y: null,
    step: 1e5,
    sup: 14 ** 10 / 2 ** 14,
    supAttained: true,
    inf: 0,
    infAttained: false,
    mono: { dir: 'dec', strict: true, from: 14 },
    valuesFinite: false,
    eventuallyConstant: false,
  },
};

export const VIEW_IDS = Object.keys(VIEW_SEQUENCES) as ViewSeqId[];
export const isViewSeq = (x: unknown): x is ViewSeqId => typeof x === 'string' && x in VIEW_SEQUENCES;

/** a₁, …, a_win (index 0 holds a₁). */
export function termsOf(p: ViewPreset, win: number): number[] {
  const out: number[] = [];
  for (let n = 1; n <= Math.min(win, p.winMax); n++) out.push(p.a(n));
  return out;
}

/** For each n = 1 … len − 1, the sign of aₙ₊₁ − aₙ: 1 up, −1 down, 0 equal (index 0 is the step from a₁ to a₂). */
export function stepSigns(values: number[]): (1 | 0 | -1)[] {
  const out: (1 | 0 | -1)[] = [];
  for (let i = 0; i + 1 < values.length; i++) out.push(values[i + 1] > values[i] ? 1 : values[i + 1] < values[i] ? -1 : 0);
  return out;
}

export interface WindowMonotone {
  /** aₙ ≤ aₙ₊₁ for every n0 ≤ n < window end; likewise the other three */
  inc: boolean;
  dec: boolean;
  strictInc: boolean;
  strictDec: boolean;
  /** the first n ≥ n0 with aₙ₊₁ > aₙ (a step up), and with aₙ₊₁ < aₙ; null if none in the window */
  firstUp: number | null;
  firstDown: number | null;
}

/** How the terms aₙ0, aₙ0+1, … of the window move: evidence for "monotone from n0 on". */
export function monotoneFrom(values: number[], n0: number): WindowMonotone {
  const s = stepSigns(values);
  let firstUp: number | null = null;
  let firstDown: number | null = null;
  let eq = false;
  for (let n = Math.max(1, n0); n < values.length; n++) {
    const d = s[n - 1];
    if (d === 1 && firstUp === null) firstUp = n;
    if (d === -1 && firstDown === null) firstDown = n;
    if (d === 0) eq = true;
  }
  return {
    inc: firstDown === null,
    dec: firstUp === null,
    strictInc: firstDown === null && !eq,
    strictDec: firstUp === null && !eq,
    firstUp,
    firstDown,
  };
}

/** The places n ≤ window with aₙ > U (upper) or aₙ < m (lower): what the drawn bound lines leave outside. */
export function outside(values: number[], U: number | null, m: number | null): { above: number[]; below: number[] } {
  const above: number[] = [];
  const below: number[] = [];
  values.forEach((v, i) => {
    if (U !== null && v > U) above.push(i + 1);
    if (m !== null && v < m) below.push(i + 1);
  });
  return { above, below };
}

/** Exact: U is an upper bound of every term (U ≥ sup), from the lesson's facts, not from the window. */
export const isUpperBound = (p: ViewPreset, U: number): boolean => p.sup !== null && U >= p.sup - 1e-12;
/** Exact: m is a lower bound of every term (m ≤ inf). */
export const isLowerBound = (p: ViewPreset, m: number): boolean => p.inf !== null && m <= p.inf + 1e-12;

/** The values of the window grouped: each distinct value with the places n where it occurs (the number line's stacks). */
export function valueStacks(values: number[]): { value: number; places: number[] }[] {
  const map = new Map<number, number[]>();
  values.forEach((v, i) => {
    const list = map.get(v);
    if (list) list.push(i + 1);
    else map.set(v, [i + 1]);
  });
  return [...map.entries()].map(([value, places]) => ({ value, places })).sort((x, y) => x.value - y.value);
}

/** The value range of a preset's drawing: its own, or the window's terms with a margin (for unbounded presets). */
export function rangeOf(p: ViewPreset, win: number): [number, number] {
  if (p.y) return p.y;
  const v = termsOf(p, win);
  const lo = Math.min(0, ...v);
  const hi = Math.max(...v);
  const pad = (hi - lo) * 0.08 || 1;
  return [lo - pad, hi + pad];
}

/** The smallest even n with n > U: the term of n^((−1)ⁿ) that beats a candidate bound U (proof of 2.1.6). */
export function evenBeyond(U: number): number {
  let k = Math.max(1, Math.floor(U / 2) + 1);
  if (2 * k <= U) k++;
  return 2 * k;
}
