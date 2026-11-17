/**
 * MODEL SPECIFICATION
 *
 * System:        recursive sequences a₁ given, aₙ₊₁ = f(aₙ), for the five maps lesson 2.7 studies
 *                (√(2 + x), Heron's (x + 2/x)/2, 1 + 1/x, 2x, x(2 − x)); and the two sequences that squeeze e,
 *                eₙ = (1 + 1/n)ⁿ and fₙ = (1 + 1/n)ⁿ⁺¹.
 * Dynamics:      iteration of f, one term per step. Nothing moves in time.
 * Boundary:      every orbit is a finite window a₁, …, a_K. `monotoneFrom` and the e-searches report what holds
 *                **on that window**: evidence for what the lesson proves (2.7.1, 2.7.3, 2.7.4, 2.7.6), never a
 *                proof that it holds beyond the window.
 * Ignored:       exact arithmetic. Terms are doubles: a fixed point reached up to rounding (Heron hits √2 to the
 *                last bit after five steps) counts as "constant" through the tolerance `TIE`, so the window's
 *                verdict is not decided by the last bit. Exact claims (Heron's rational terms, f₅ < 3 < f₄) are
 *                checked in integers (`heronExact`, `ePowerFraction`).
 * Valid when:    the orbit stays in the domain of f (√ needs 2 + x ≥ 0, the rational maps need x ≠ 0); `orbit`
 *                stops at the first term that is undefined or not finite and returns the terms before it.
 *                eₙ, fₙ are computed as exp(n·log1p(1/n)), accurate to a few ulps for every n ≤ 10⁹.
 * Failure modes: a sequence that turns only after the window looks monotone; a divergent orbit (2x) leaves the
 *                drawn view after a few steps (the figure clips it and says so).
 */

/** Two terms closer than this (relative) are treated as equal by the window's monotonicity verdict. */
export const TIE = 1e-12;

export type MapId = 'sqrt2' | 'heron' | 'golden' | 'double' | 'logistic';

export interface RecursionMap {
  /** button label; a formula is wrapped in LRI … PDI so the RTL control panel does not reverse it */
  name: string;
  /** the rule as text for captions and the aria label */
  formula: string;
  f: (x: number) => number;
  /** the fixed points of f that lie in the drawn view: the candidates of 2.7.3 (exact values) */
  fixed: number[];
  /** the a₁ slider: its range and step (the slider works in whole steps, so 0 is hit exactly) */
  a1: { min: number; max: number; step: number; start: number };
  /** the cobweb view (the same range on both axes, so y = x is the diagonal) and the terms panel's value range */
  view: [number, number];
  y: [number, number];
}

const PHI = (1 + Math.sqrt(5)) / 2;

export const MAPS: Record<MapId, RecursionMap> = {
  sqrt2: {
    name: '⁦√(2 + x)⁩',
    formula: 'aₙ₊₁ = √(2 + aₙ)',
    f: (x) => (2 + x >= 0 ? Math.sqrt(2 + x) : Number.NaN),
    fixed: [2],
    a1: { min: -2, max: 4, step: 0.05, start: 0 },
    view: [-2.2, 4.2],
    y: [-2.2, 4.2],
  },
  heron: {
    name: 'הרון ⁦(x + 2/x)/2⁩',
    formula: 'aₙ₊₁ = (aₙ + 2/aₙ)/2',
    f: (x) => (x !== 0 ? (x + 2 / x) / 2 : Number.NaN),
    fixed: [Math.SQRT2],
    a1: { min: 0.2, max: 4, step: 0.05, start: 2 },
    view: [0, 4.2],
    y: [0, 4.2],
  },
  golden: {
    name: '⁦1 + 1/x⁩',
    formula: 'aₙ₊₁ = 1 + 1/aₙ',
    f: (x) => (x !== 0 ? 1 + 1 / x : Number.NaN),
    fixed: [PHI],
    a1: { min: 0.2, max: 4, step: 0.05, start: 1 },
    view: [0, 4.2],
    y: [0, 4.2],
  },
  double: {
    name: '⁦2x⁩',
    formula: 'aₙ₊₁ = 2aₙ',
    f: (x) => 2 * x,
    fixed: [0],
    a1: { min: -1, max: 1, step: 0.05, start: 1 },
    view: [-2.2, 8.2],
    y: [-12, 40],
  },
  logistic: {
    name: '⁦x(2 − x)⁩',
    formula: 'aₙ₊₁ = aₙ(2 − aₙ)',
    f: (x) => x * (2 - x),
    fixed: [0, 1],
    a1: { min: -0.5, max: 2.5, step: 0.05, start: 0.2 },
    view: [-0.6, 2.6],
    y: [-1.6, 2.6],
  },
};

/** The a₁ value at slider position i (whole steps from the minimum, rounded to the step's decimals). */
export function a1At(id: MapId, i: number): number {
  const { min, step } = MAPS[id].a1;
  return Math.round((min + i * step) * 1e6) / 1e6;
}

/** The slider position of a₁ (the nearest whole step), and the number of positions. */
export function a1Index(id: MapId, a1: number): number {
  const { min, max, step } = MAPS[id].a1;
  return Math.max(0, Math.min(Math.round((max - min) / step), Math.round((a1 - min) / step)));
}
export const a1Positions = (id: MapId) => Math.round((MAPS[id].a1.max - MAPS[id].a1.min) / MAPS[id].a1.step) + 1;

/**
 * a₁, a₂, …, a_K with aₙ₊₁ = f(aₙ). Stops before the first term that is undefined (outside the domain of f)
 * or not finite, so the result may be shorter than K.
 */
export function orbit(f: (x: number) => number, a1: number, K: number): number[] {
  const out: number[] = [];
  let x = a1;
  for (let n = 1; n <= K; n++) {
    if (!Number.isFinite(x)) break;
    out.push(x);
    x = f(x);
  }
  return out;
}

/**
 * The cobweb of an orbit, as a polyline: (a₁, a₁) on the diagonal, then up or down to the graph at (a₁, a₂),
 * across to the diagonal at (a₂, a₂), and so on, ending at (a_K, a_K).
 */
export function cobwebPath(terms: number[]): [number, number][] {
  if (terms.length === 0) return [];
  const pts: [number, number][] = [[terms[0], terms[0]]];
  for (let k = 1; k < terms.length; k++) {
    pts.push([terms[k - 1], terms[k]]);
    pts.push([terms[k], terms[k]]);
  }
  return pts;
}

export type Trend = 'up' | 'down' | 'flat';

/** The sign of one step aₙ₊₁ − aₙ, with differences below TIE (relative) counted as flat. */
export function trend(a: number, b: number): Trend {
  const d = b - a;
  if (Math.abs(d) <= TIE * Math.max(1, Math.abs(a), Math.abs(b))) return 'flat';
  return d > 0 ? 'up' : 'down';
}

export interface MonotoneVerdict {
  /** 'up': increasing (≤) from `from` on; 'down': decreasing; 'flat': constant; 'none': no monotone tail of length ≥ 3 */
  kind: 'up' | 'down' | 'flat' | 'none';
  /** the first index of the monotone tail (1-based); null when kind is 'none' */
  from: number | null;
  /** strictly monotone on that tail */
  strict: boolean;
}

/**
 * On the window a₁ … a_K: the smallest n₀ such that a_{n₀}, a_{n₀+1}, …, a_K is monotone (all steps up or flat, or
 * all down or flat), and which way. A tail shorter than three terms says nothing ("none"). Evidence only.
 */
export function monotoneFrom(terms: number[]): MonotoneVerdict {
  const K = terms.length;
  if (K < 3) return { kind: 'none', from: null, strict: false };
  const steps = terms.slice(1).map((v, i) => trend(terms[i], v));
  let best: MonotoneVerdict = { kind: 'none', from: null, strict: false };
  for (const dir of ['up', 'down'] as const) {
    // walk back from the end while every step goes `dir` or is flat
    let i = steps.length - 1;
    while (i >= 0 && (steps[i] === dir || steps[i] === 'flat')) i--;
    const from = i + 2; // the tail starts at term index i + 1 (0-based), i.e. n = i + 2
    if (K - from + 1 < 3) continue;
    const tail = steps.slice(from - 1);
    const kind = tail.every((s) => s === 'flat') ? 'flat' : dir;
    const strict = tail.every((s) => s === dir);
    if (best.from === null || from < best.from) best = { kind, from, strict };
  }
  return best;
}

/* ------------------------------------------------------------------ the number e */

/** eₙ = (1 + 1/n)ⁿ, as exp(n·log1p(1/n)). */
export const eSeq = (n: number): number => Math.exp(n * Math.log1p(1 / n));
/** fₙ = (1 + 1/n)ⁿ⁺¹ = eₙ·(1 + 1/n). */
export const fSeq = (n: number): number => Math.exp((n + 1) * Math.log1p(1 / n));

/** (n + 1)ⁿ and nⁿ as exact integers: eₙ = num/den. With extra = 1, fₙ = (n + 1)ⁿ⁺¹ / nⁿ⁺¹. */
export function ePowerFraction(n: number, extra: 0 | 1 = 0): { num: bigint; den: bigint } {
  const p = BigInt(n + extra);
  return { num: BigInt(n + 1) ** p, den: BigInt(n) ** p };
}

/** The smallest n ≤ horizon satisfying `ok`, or null. A search on a window (evidence). */
export function firstN(ok: (n: number) => boolean, horizon = 1_000_000): number | null {
  for (let n = 1; n <= horizon; n++) if (ok(n)) return n;
  return null;
}

/** The smallest n with eₙ > lo and fₙ < hi: the first n whose interval (eₙ, fₙ) proves lo < e < hi (2.7.6). */
export const squeezeN = (lo: number, hi: number, horizon = 1_000_000) => firstN((n) => eSeq(n) > lo && fSeq(n) < hi, horizon);

/* ------------------------------------------------------------------ exact Heron terms */

/**
 * Heron's iteration aₙ₊₁ = (aₙ + 2/aₙ)/2 from a₁ = 2, in exact fractions p/q: (p/q + 2q/p)/2 = (p² + 2q²)/(2pq).
 * Returns the first K terms as [p, q] in lowest terms.
 */
export function heronExact(K: number): [bigint, bigint][] {
  const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));
  const out: [bigint, bigint][] = [[2n, 1n]];
  while (out.length < K) {
    const [p, q] = out[out.length - 1];
    const [P, Q] = [p * p + 2n * q * q, 2n * p * q];
    const g = gcd(P, Q);
    out.push([P / g, Q / g]);
  }
  return out;
}
