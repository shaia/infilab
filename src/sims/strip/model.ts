/**
 * The state, the text-step handling, the numbers and the task conditions of `SequenceStrip` (see the header of
 * ../SequenceStrip.tsx for the API). Pure: no DOM, no canvas, so the tick conditions are unit-tested
 * (tests/unit/sequence-strip.test.ts). Every number comes from src/math/sequences.ts.
 */

import type { Seq } from '~/math/analysis';
import {
  EPSILONS,
  PAIRS,
  SEQUENCES,
  TRIPLES,
  combineTolerances,
  combined,
  isPairId,
  isSequenceId,
  isTripleId,
  maxAbs,
  notBeyondAfter,
  opsOf,
  outsideAfter,
  proofBound,
  smallestCauchyN,
  smallestN,
  smallestNBeyond,
  spreadBelow,
  tailSpread,
  type CombineOp,
  type PairId,
  type SequenceId,
  type SequencePair,
  type SequencePreset,
  type SequenceTriple,
  type TailSpread,
  type TripleId,
} from '~/math/sequences';
import type { StepState } from '~/ui/steps';

export type StripMode = 'limit' | 'bound' | 'combine' | 'sandwich' | 'infinite' | 'cauchy';
export const STRIP_MODES: StripMode[] = ['limit', 'bound', 'combine', 'sandwich', 'infinite', 'cauchy'];
export type StripId = SequenceId | PairId | TripleId;

export interface SequenceStripProps {
  id: string;
  mode?: StripMode;
  /** the modes offered in a picker (none or one: no picker) */
  modes?: StripMode[];
  seq?: StripId;
  /** the presets offered in the picker; only those that fit the current mode are shown (none or one: no picker) */
  seqs?: StripId[];
  op?: CombineOp;
  M?: number;
  eps?: number;
  N?: number;
  showMin?: boolean;
  tasks?: string[];
}

export interface StripState {
  mode: StripMode;
  seq: StripId;
  /** index into EPSILONS */
  ei: number;
  N: number;
  /** the candidate limit (the claimed limit, or the student's choice when there is none) */
  L: number;
  /** the mode's helper: the smallest N (limit, infinite, cauchy), the proof's bound (bound), N₁ and N₂ (combine,
   *  sandwich) */
  showMin: boolean;
  op: CombineOp;
  /** the bound M (mode bound) or the level M (mode infinite) */
  M: number;
}

export const N_MAX = 500;
/** where the smallest N is searched: 1/√n at ε = 0.005 needs N = 40 000, and smallestN wants it in the first half */
export const SEARCH = 200_000;
/**
 * The terms the verdict checks, N < n ≤ checkUpTo(N): always far past N and past the drawn window, so N at the window's
 * edge is never "fitting" because nothing after it was looked at. Evidence on a finite range, as the caption says.
 */
export const checkUpTo = (N: number, win: number) => Math.max(2_000, win, 4 * N + 100);
/** the checked range of the Cauchy tail after N (the drawn window never exceeds N_MAX < 2000) */
export const cauchyRange = (N: number) => checkUpTo(N, N_MAX);

export const nearestEps = (e: number) =>
  EPSILONS.reduce((best, v, i) => (Math.abs(Math.log(v / e)) < Math.abs(Math.log(EPSILONS[best] / e)) ? i : best), 0);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------------------------------------------
// presets by mode

type Kind = 'single' | 'pair' | 'triple';
export const kindOf = (mode: StripMode): Kind => (mode === 'combine' ? 'pair' : mode === 'sandwich' ? 'triple' : 'single');

export const fitsMode = (id: unknown, mode: StripMode): id is StripId => {
  const k = kindOf(mode);
  return k === 'pair' ? isPairId(id) : k === 'triple' ? isTripleId(id) : isSequenceId(id);
};

const DEFAULT_SEQ: Record<StripMode, StripId> = {
  limit: 'recip',
  bound: 'ratio3',
  combine: 'pair-sum',
  sandwich: 'floor-x',
  infinite: 'sqrt-n',
  cauchy: 'inv-sq-sum',
};

/** the first offered preset that fits the mode, else the mode's default */
export const defaultSeq = (mode: StripMode, offered?: StripId[]): StripId => offered?.find((id) => fitsMode(id, mode)) ?? DEFAULT_SEQ[mode];

export const single = (id: StripId): SequencePreset => SEQUENCES[(isSequenceId(id) ? id : 'recip') as SequenceId];
export const pair = (id: StripId): SequencePair => PAIRS[(isPairId(id) ? id : 'pair-sum') as PairId];
export const triple = (id: StripId): SequenceTriple => TRIPLES[(isTripleId(id) ? id : 'floor-x') as TripleId];

/** an op the pair defines: the given one, else the pair's first */
export function opFor(seq: StripId, op: CombineOp): CombineOp {
  if (!isPairId(seq)) return op;
  const ops = opsOf(PAIRS[seq]);
  return ops.includes(op) ? op : ops[0];
}

/** the claimed limit of what the verdict is about, or null */
export function claimedLimit(mode: StripMode, seq: StripId, op: CombineOp): number | null {
  const k = kindOf(mode);
  if (k === 'pair') return pair(seq).limits[opFor(seq, op)] ?? null;
  if (k === 'triple') return triple(seq).limit;
  return single(seq).limit;
}

/** the L the figure starts from: the claimed limit, else the preset's candidate, else 0 */
export function limitOf(mode: StripMode, seq: StripId, op: CombineOp): number {
  const k = kindOf(mode);
  const c = k === 'pair' ? pair(seq).candidate : k === 'triple' ? triple(seq).candidate : single(seq).candidate;
  return claimedLimit(mode, seq, op) ?? c ?? 0;
}

/** the candidate-L slider [min, max, step] */
export function lRangeOf(mode: StripMode, seq: StripId): [number, number, number] {
  const k = kindOf(mode);
  const r = k === 'pair' ? pair(seq).lRange : k === 'triple' ? triple(seq).lRange : single(seq).lRange;
  return r ?? [-1.5, 1.5, 0.1];
}

/** the M slider [min, max, step]: per preset in mode infinite, from the value window in mode bound */
export function mRangeOf(mode: StripMode, seq: StripId): [number, number, number] {
  const p = single(seq);
  if (mode === 'infinite') return p.mRange ?? [p.y[0], p.y[1], (p.y[1] - p.y[0]) / 100];
  const Y = Math.max(Math.abs(p.y[0]), Math.abs(p.y[1]));
  const step = Y <= 10 ? 0.05 : 1;
  return [0, Math.ceil((1.1 * Y) / step) * step, step];
}

export const snapTo = (v: number, [lo, hi, step]: [number, number, number]) =>
  clamp(Number((lo + Math.round((v - lo) / step) * step).toFixed(6)), lo, hi);

export function defaultM(mode: StripMode, seq: StripId): number {
  if (mode === 'infinite') {
    const p = single(seq);
    return p.m0 ?? snapTo((p.y[0] + p.y[1]) / 2, mRangeOf(mode, seq));
  }
  const r = mRangeOf(mode, seq);
  return snapTo(0.6 * (r[1] / 1.1), r);
}

/** the direction of mode infinite: −1 for a sequence → −∞, +1 otherwise (aₙ > M is asked) */
export const dirOf = (seq: StripId): 1 | -1 => (single(seq).tends === -1 ? -1 : 1);

// ---------------------------------------------------------------------------------------------------------------
// state

export function fresh(p: SequenceStripProps): StripState {
  const mode: StripMode = p.mode && STRIP_MODES.includes(p.mode) ? p.mode : 'limit';
  const seq = fitsMode(p.seq, mode) ? p.seq : defaultSeq(mode, p.seqs);
  const op = opFor(seq, p.op ?? 'sum');
  const M = typeof p.M === 'number' && (mode === 'bound' || mode === 'infinite') ? snapTo(p.M, mRangeOf(mode, seq)) : defaultM(mode, seq);
  return {
    mode,
    seq,
    ei: nearestEps(p.eps ?? 0.1),
    N: clamp(Math.round(p.N ?? 0), 0, N_MAX),
    L: limitOf(mode, seq, op),
    showMin: p.showMin ?? false,
    op,
    M,
  };
}

/**
 * A text step's state applied to the figure. Keys: mode, seq, op, eps, N, L, M, showMin; unknown keys and values
 * that do not fit are ignored. A new mode keeps the preset if it fits, else takes the first offered one that does;
 * a new preset (or mode) resets L to its limit (or candidate) and M to its default, unless the step gives them.
 */
export function applyStep(prev: StripState, st: StepState, props: SequenceStripProps): StripState {
  const next = { ...prev };
  let reset = false;
  if (typeof st.mode === 'string' && (STRIP_MODES as string[]).includes(st.mode) && st.mode !== prev.mode) {
    next.mode = st.mode as StripMode;
    if (!fitsMode(next.seq, next.mode)) next.seq = defaultSeq(next.mode, props.seqs);
    reset = true;
  }
  if (fitsMode(st.seq, next.mode)) {
    next.seq = st.seq;
    reset = true;
  }
  if (typeof st.op === 'string' && ['sum', 'product', 'quotient'].includes(st.op)) next.op = st.op as CombineOp;
  next.op = opFor(next.seq, next.op);
  // as in lesson 2.2: naming a preset resets L to its limit; an op names a new cₙ, so it does too
  if (reset || typeof st.op === 'string') next.L = limitOf(next.mode, next.seq, next.op);
  if (reset) next.M = defaultM(next.mode, next.seq);
  if (typeof st.eps === 'number') next.ei = nearestEps(st.eps);
  if (typeof st.N === 'number') next.N = clamp(Math.round(st.N), 0, N_MAX);
  if (typeof st.L === 'number') next.L = st.L;
  if (typeof st.M === 'number') next.M = next.mode === 'bound' || next.mode === 'infinite' ? snapTo(st.M, mRangeOf(next.mode, next.seq)) : st.M;
  if (typeof st.showMin === 'boolean') next.showMin = st.showMin;
  return next;
}

/** what a task looks at: a text step's state, remembered, is skipped exactly (never a boolean "from step" flag) */
export const taskKey = (s: StripState) => JSON.stringify([s.mode, s.seq, s.ei, s.N, Number(s.L.toFixed(6)), s.op, s.M]);

// ---------------------------------------------------------------------------------------------------------------
// the numbers of one state

export interface Analysis {
  /** the drawn n-window, and the end of the checked range after N */
  win: number;
  upTo: number;
  /** the value window */
  y: [number, number];
  eps: number;
  L: number;
  /** the verdict's sequence: the preset (limit, bound, infinite, cauchy), cₙ (combine), the middle (sandwich) */
  main: Seq;
  formula: string;
  /** the limit is the claimed one (true) or a candidate the student moves (false) */
  claimed: boolean;
  /** the smallest N of the mode on the window (bound: the N fitting ε = 1 for the proof), null if none */
  minN: number | null;
  /** the indices after N (up to upTo) that fail the mode's condition: outside the band, not beyond M; in mode
   *  bound the indices n ≤ win with |aₙ| > M */
  bad: number[];
  /** the student's N (or M) works on the checked range */
  works: boolean;
  bound?: { max: number; proof: number | null; fits1: boolean };
  combine?: {
    p: SequencePair;
    op: CombineOp;
    tol: { epsA: number; epsB: number } | null;
    N1: number | null;
    N2: number | null;
  };
  sandwich?: { t: SequenceTriple; Nlow: number | null; Nup: number | null; lowerOk: boolean; upperOk: boolean };
  infinite?: { dir: 1 | -1 };
  cauchy?: TailSpread & { below: boolean };
}

type Cache = Map<string, number | null>;

/** a memo for the window searches (each walks up to 200 000 terms): they do not depend on N */
function memo(cache: Cache | undefined, key: string, f: () => number | null): number | null {
  if (!cache) return f();
  if (!cache.has(key)) cache.set(key, f());
  return cache.get(key)!;
}

function windowOf(base: number, N: number, need: (number | null)[]): number {
  const m = Math.max(N, ...need.map((v) => v ?? 0));
  return Math.min(N_MAX, Math.max(base, Math.ceil(m * 1.35) + 5));
}

/** the value window: the preset's, widened (with a margin) where the given values leave it */
function yRange(base: [number, number], values: number[]): [number, number] {
  let [lo, hi] = base;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const pad = 0.05 * (hi - lo);
  return [lo < base[0] ? lo - pad : lo, hi > base[1] ? hi + pad : hi];
}

const termsOf = (a: Seq, win: number) => Array.from({ length: win }, (_, i) => a(i + 1));

export function analyse(s: StripState, cache?: Cache): Analysis {
  const eps = EPSILONS[s.ei];
  const key = (...parts: unknown[]) => JSON.stringify([s.mode, s.seq, ...parts]);

  if (s.mode === 'combine') {
    const p = pair(s.seq);
    const op = opFor(s.seq, s.op);
    const c = combined(p, op);
    const claimed = p.limits[op] ?? null;
    const L = claimed ?? s.L;
    const minN = memo(cache, key('c', op, L, eps), () => smallestN(c, L, eps, SEARCH));
    const tol = combineTolerances(p, op, eps);
    const N1 = tol && p.aLimit !== null ? memo(cache, key('a', op, eps), () => smallestN(p.a, p.aLimit!, tol.epsA, SEARCH)) : null;
    const N2 = tol && p.bLimit !== null ? memo(cache, key('b', op, eps), () => smallestN(p.b, p.bLimit!, tol.epsB, SEARCH)) : null;
    const win = windowOf(p.window, s.N, s.showMin ? [minN, N1, N2] : [minN]);
    const upTo = checkUpTo(s.N, win);
    const bad = outsideAfter(c, L, eps, s.N, upTo);
    const extra = s.showMin && tol ? [p.aLimit! - tol.epsA, p.aLimit! + tol.epsA, p.bLimit! - tol.epsB, p.bLimit! + tol.epsB] : [];
    const y = yRange(p.y, [...termsOf(p.a, win), ...termsOf(p.b, win), ...termsOf(c, win), L, ...extra]);
    const formula = `${p.formula}, ${OP_FORMULA[op]}`;
    return { win, upTo, y, eps, L, main: c, formula, claimed: claimed !== null, minN, bad, works: bad.length === 0, combine: { p, op, tol, N1, N2 } };
  }

  if (s.mode === 'sandwich') {
    const t = triple(s.seq);
    const L = t.limit ?? s.L;
    const minN = memo(cache, key('m', L, eps), () => smallestN(t.middle, L, eps, SEARCH));
    const Nlow = memo(cache, key('l', L, eps), () => smallestN(t.lower, L, eps, SEARCH));
    const Nup = memo(cache, key('u', L, eps), () => smallestN(t.upper, L, eps, SEARCH));
    const win = windowOf(t.window, s.N, s.showMin ? [minN, Nlow, Nup] : [minN]);
    const upTo = checkUpTo(s.N, win);
    const bad = outsideAfter(t.middle, L, eps, s.N, upTo);
    const lowerOk = outsideAfter(t.lower, L, eps, s.N, upTo).length === 0;
    const upperOk = outsideAfter(t.upper, L, eps, s.N, upTo).length === 0;
    const y = yRange(t.y, [...termsOf(t.lower, win), ...termsOf(t.middle, win), ...termsOf(t.upper, win), L]);
    return { win, upTo, y, eps, L, main: t.middle, formula: t.formula, claimed: t.limit !== null, minN, bad, works: bad.length === 0, sandwich: { t, Nlow, Nup, lowerOk, upperOk } };
  }

  const p = single(s.seq);

  if (s.mode === 'bound') {
    const L = p.limit ?? s.L;
    const minN = p.limit === null ? null : memo(cache, key('one'), () => smallestN(p.a, p.limit!, 1, SEARCH));
    const win = windowOf(p.window, s.N, s.showMin ? [minN] : []);
    const upTo = checkUpTo(s.N, win);
    const terms = termsOf(p.a, win);
    const bad: number[] = [];
    terms.forEach((v, i) => {
      if (Math.abs(v) > s.M + 1e-12) bad.push(i + 1);
    });
    const max = maxAbs(p.a, 1, win);
    const fits1 = p.limit !== null && outsideAfter(p.a, p.limit, 1, s.N, upTo).length === 0;
    const proof = p.limit === null ? null : proofBound(p.a, p.limit, s.N);
    const Y = Math.max(Math.abs(p.y[0]), Math.abs(p.y[1]), s.M, max, s.showMin && proof !== null ? proof : 0) * 1.06;
    return { win, upTo, y: [-Y, Y], eps, L, main: p.a, formula: p.formula, claimed: p.limit !== null, minN, bad, works: bad.length === 0, bound: { max, proof, fits1 } };
  }

  if (s.mode === 'infinite') {
    const dir = dirOf(s.seq);
    const minN = memo(cache, key('M', s.M), () => smallestNBeyond(p.a, s.M, dir, SEARCH));
    const win = windowOf(p.window, s.N, [minN]);
    const upTo = checkUpTo(s.N, win);
    const bad = notBeyondAfter(p.a, s.M, dir, s.N, upTo);
    const y = yRange(p.y, [...termsOf(p.a, win), s.M]);
    return { win, upTo, y, eps, L: s.L, main: p.a, formula: p.formula, claimed: false, minN, bad, works: bad.length === 0, infinite: { dir } };
  }

  if (s.mode === 'cauchy') {
    const minN = memo(cache, key('cauchy', eps), () => smallestCauchyN(p.a, eps, cauchyRange, N_MAX));
    const win = windowOf(p.window, s.N, [minN]);
    const upTo = cauchyRange(s.N);
    const tail = tailSpread(p.a, s.N, upTo);
    const below = spreadBelow(tail.spread, eps);
    const y = yRange(p.y, [...termsOf(p.a, win), tail.min, tail.max]);
    return { win, upTo, y, eps, L: s.L, main: p.a, formula: p.formula, claimed: false, minN, bad: [], works: below, cauchy: { ...tail, below } };
  }

  // limit: lesson 2.2's figure
  const minN = memo(cache, key('lim', s.L, eps), () => smallestN(p.a, s.L, eps, SEARCH));
  const win = windowOf(p.window, s.N, [minN]);
  const upTo = checkUpTo(s.N, win);
  const bad = outsideAfter(p.a, s.L, eps, s.N, upTo);
  const y = yRange(p.y, [...termsOf(p.a, win), s.L]);
  return { win, upTo, y, eps, L: s.L, main: p.a, formula: p.formula, claimed: p.limit !== null, minN, bad, works: bad.length === 0 };
}

// ---------------------------------------------------------------------------------------------------------------
// tasks

export const TASK_LABEL: Record<string, string> = {
  // lesson 2.2
  'find-N': 'בסדרה ⁦1/n⁩, עם ⁦ε = 0.1⁩ או קטן יותר, הזיזו את N אל ה-N הקטן ביותר שמתאים: מימינו אין אף איבר מחוץ לסביבה.',
  narrow: 'צמצמו את הסביבה עד ⁦ε = 0.02⁩ או פחות, ומצאו שוב N שמתאים.',
  wild: 'בסדרה עם ההתחלה הפרועה, עם ⁦ε = 0.1⁩ או פחות, מצאו N שמתאים.',
  'no-N': 'בסדרה ⁦(−1)ⁿ⁩ נסו למצוא N שמתאים לסביבה של 1: הזיזו את N לפחות עד 30.',
  // lesson 2.3
  estimate: 'בסדרה ⁦(3n+1)/(n+2)⁩, עם ⁦ε = 0.01⁩ או קטן יותר, הזיזו את N אל ה-N הקטן ביותר שמתאים, והשוו להערכה ⁦|aₙ − 3| = 5/(n+2)⁩.',
  'no-limit': 'בסדרה ⁦(−1)ⁿ⁩ או ⁦(−1)ⁿ n/(n+1)⁩, עם ⁦ε = 0.5⁩ או קטן יותר, נסו לפחות שלושה ערכים שונים של L, ולכל אחד הזיזו את N לפחות עד 30: אף N אינו מתאים.',
  'bound-all': 'בסדרה מתכנסת, הזיזו את M כך שכל האיברים שבחלון נמצאים בין ⁦−M⁩ ל-M, ו-M גדול לכל היותר ב-⁦0.05⁩ מהערך המוחלט הגדול ביותר שבחלון.',
  // lesson 2.4
  'sum-N': 'בפעולת הסכום, עם ⁦ε = 0.05⁩ או קטן יותר, מצאו N שמתאים לסדרה ⁦cₙ = aₙ + bₙ⁩.',
  'product-N': 'בפעולת המכפלה, עם ⁦ε = 0.05⁩ או קטן יותר, מצאו N שמתאים לסדרה ⁦cₙ = aₙ·bₙ⁩.',
  cancel: 'בזוג ⁦(−1)ⁿ⁩ ו-⁦1 − (−1)ⁿ⁩, בפעולת הסכום, עם ⁦ε = 0.1⁩ או קטן יותר, הזיזו את N ומצאו שהוא מתאים לסכום, אף ששתי הסדרות מתבדרות.',
  // lesson 2.5
  squeeze: 'עם ⁦ε = 0.05⁩ או קטן יותר, מצאו N שמתאים לשתי הסדרות החיצוניות, וראו שהסדרה האמצעית נמצאת אחריו בתוך הסביבה גם היא.',
  'outer-differ': 'בשלשה שבה לסדרות החיצוניות גבולות שונים, עם ⁦ε = 0.2⁩ או קטן יותר, הזיזו את N לפחות עד 30: אף N אינו מתאים לסדרה האמצעית.',
  // lesson 2.6
  'find-N-M': 'בסדרה ⁦√n⁩, עם ⁦M = 10⁩ או יותר, הזיזו את N אל ה-N הקטן ביותר שמתאים: כל האיברים שמימינו גדולים מ-M.',
  'no-N-M': 'בסדרת הזיגזג, עם ⁦M = 5⁩ או יותר, הזיזו את N לפחות עד 30: אף N אינו מתאים.',
  // lesson 2.10
  'cauchy-N': 'בסדרה ⁦1 + 1/4 + … + 1/n²⁩, עם ⁦ε = 0.05⁩ או קטן יותר, הזיזו את N אל ה-N הקטן ביותר שבו רוחב הזנב (המרחק בין האיבר הגדול לקטן שאחרי N) קטן מ-ε.',
  'harmonic-grows': 'בסדרה ⁦Hₙ⁩, עם ⁦ε = 0.5⁩ או קטן יותר, הזיזו את N עד 100 או יותר, וראו שרוחב הזנב אינו יורד מתחת ל-ε.',
};

export const OP_FORMULA: Record<CombineOp, string> = { sum: 'cₙ = aₙ + bₙ', product: 'cₙ = aₙ·bₙ', quotient: 'cₙ = aₙ/bₙ' };
export const OP_NAME: Record<CombineOp, string> = { sum: 'סכום', product: 'מכפלה', quotient: 'מנה' };
export const MODE_NAME: Record<StripMode, string> = {
  limit: 'גבול',
  bound: 'חסם',
  combine: 'חשבון גבולות',
  sandwich: 'סנדוויץ׳',
  infinite: 'שאיפה לאינסוף',
  cauchy: 'קושי',
};

export interface TaskContext {
  tasks: string[];
  /** the taskKey of the last text step's state, or null */
  stepKey: string | null;
  /** mode limit, task no-limit: the candidate L values tried per preset */
  triedL: Map<string, Set<string>>;
}

/**
 * The tasks a student's own change ticks: `prev` the state before, `patch` the change, `next` the state after and
 * `an` its numbers. Lesson 2.2's four tasks keep their conditions exactly; every other task also skips the state of
 * the last text step, and never ticks on a change of preset or mode (picking resets N).
 */
export function tasksFor(prev: StripState, patch: Partial<StripState>, next: StripState, an: Analysis, ctx: TaskContext): string[] {
  const out: string[] = [];
  const has = (t: string) => ctx.tasks.includes(t);
  const e = an.eps;

  if (next.mode === 'limit') {
    const movedN = patch.N !== undefined;
    const movedNorEps = movedN || patch.ei !== undefined;
    const p = single(next.seq);
    if (has('find-N') && movedN && next.seq === 'recip' && e <= 0.1 && an.minN !== null && next.N === an.minN) out.push('find-N');
    if (has('narrow') && movedNorEps && p.limit !== null && e <= 0.02 && an.works) out.push('narrow');
    if (has('wild') && movedNorEps && next.seq === 'wild-start' && e <= 0.1 && an.works) out.push('wild');
    if (has('no-N') && movedN && next.seq === 'sign' && Math.abs(next.L - 1) < 1e-9 && next.N >= 30) out.push('no-N');
  }

  if (ctx.stepKey === taskKey(next)) return out;
  if (patch.seq !== undefined || patch.mode !== undefined) return out;
  const moved = (...ks: (keyof StripState)[]) => ks.some((k) => patch[k] !== undefined && patch[k] !== prev[k]);
  const tiny = 1e-9;

  if (next.mode === 'limit') {
    if (has('estimate') && moved('N', 'ei') && next.seq === 'ratio3' && e <= 0.01 + tiny && an.minN !== null && next.N === an.minN) out.push('estimate');
    if (has('no-limit') && moved('N', 'ei', 'L') && (next.seq === 'sign' || next.seq === 'alt-ratio') && e <= 0.5 + tiny && next.N >= 30 && an.minN === null && !an.works) {
      const tried = ctx.triedL.get(next.seq) ?? new Set<string>();
      tried.add(next.L.toFixed(6));
      ctx.triedL.set(next.seq, tried);
      if (tried.size >= 3) out.push('no-limit');
    }
  }
  if (next.mode === 'bound' && an.bound) {
    const { max } = an.bound;
    if (has('bound-all') && moved('M') && single(next.seq).limit !== null && max <= next.M + tiny && next.M <= max + 0.05 + tiny) out.push('bound-all');
  }
  if (next.mode === 'combine' && an.combine) {
    const { p, op } = an.combine;
    const bothConverge = p.aLimit !== null && p.bLimit !== null;
    if (has('sum-N') && moved('N', 'ei') && op === 'sum' && bothConverge && e <= 0.05 + tiny && an.claimed && an.works) out.push('sum-N');
    if (has('product-N') && moved('N', 'ei') && op === 'product' && bothConverge && e <= 0.05 + tiny && an.claimed && an.works) out.push('product-N');
    if (has('cancel') && moved('N') && next.seq === 'pair-cancel' && op === 'sum' && e <= 0.1 + tiny && an.claimed && an.works) out.push('cancel');
  }
  if (next.mode === 'sandwich' && an.sandwich) {
    const { t, lowerOk, upperOk } = an.sandwich;
    if (has('squeeze') && moved('N', 'ei') && t.limit !== null && e <= 0.05 + tiny && lowerOk && upperOk) out.push('squeeze');
    if (has('outer-differ') && moved('N', 'ei', 'L') && next.seq === 'outer-differ' && e <= 0.2 + tiny && next.N >= 30 && an.minN === null && !an.works) out.push('outer-differ');
  }
  if (next.mode === 'infinite') {
    if (has('find-N-M') && moved('N', 'M') && next.seq === 'sqrt-n' && next.M >= 10 - tiny && an.minN !== null && next.N === an.minN) out.push('find-N-M');
    if (has('no-N-M') && moved('N', 'M') && next.seq === 'zigzag' && next.M >= 5 - tiny && next.N >= 30 && an.minN === null && !an.works) out.push('no-N-M');
  }
  if (next.mode === 'cauchy' && an.cauchy) {
    if (has('cauchy-N') && moved('N', 'ei') && next.seq === 'inv-sq-sum' && e <= 0.05 + tiny && an.minN !== null && next.N === an.minN) out.push('cauchy-N');
    if (has('harmonic-grows') && moved('N') && next.seq === 'harmonic' && e <= 0.5 + tiny && next.N >= 100 && !an.cauchy.below) out.push('harmonic-grows');
  }
  return out;
}
