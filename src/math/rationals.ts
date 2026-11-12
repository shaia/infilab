/**
 * MODEL SPECIFICATION
 *
 * System:        lesson 1.3's figure RationalProbe (naturals, integers, rationals), in three parts.
 *                (1) Candidate sets S ⊆ ℝ built from intervals and arithmetic progressions with step 1, and the two
 *                    conditions of an inductive set (definition 1.3.1): 1 ∈ S, and x ∈ S ⇒ x + 1 ∈ S, tested at
 *                    one point x at a time.
 *                (2) For n ∈ ℕ and a denominator q ∈ ℕ, the integer p closest to q·√n (decided by integers only:
 *                    p/q or (p+1)/q, whichever is nearer, by comparing (2p+1)² with 4nq²) and the integer
 *                    E = p² − n·q², which is 0 exactly when (p/q)² = n.
 *                (3) The descent of theorem 1.3.16: for a fraction a/b (a ≥ 0, b ∈ ℕ) divide a = m·b + r
 *                    (0 ≤ r < b) and, when r ≠ 0, pass to (n·b − m·a)/r. Then
 *                        (n·b − m·a)² − n·r² = −(n − m²)·(a² − n·b²),
 *                    so E = 0 is kept, and the new denominator r is smaller than b. For n = 2 and 1 < a/b < 2 this
 *                    is the map a/b ↦ (2b − a)/(a − b), and |E| is kept.
 * Dynamics:      none (a step of the descent is one application of the map; nothing moves on its own).
 * Boundary:      (1) membership is decided exactly for points on a grid of quarters (x = k/4), inside the window
 *                [−1, 9] the figure draws; a set's verdict "inductive or not" is a property of the preset, proved
 *                in the lesson, never inferred from a finite window. (2) q ≤ 1000 and n ≤ 100: every value is a
 *                safe integer. (3) chains stop after `maxSteps` steps or at an integer.
 * Ignored:       nothing numerical: all arithmetic is exact integer arithmetic; no square root is ever computed
 *                to decide anything (√n appears only as a drawn reference value).
 * Valid when:    inputs are safe integers with n ≥ 1, q ≥ 1, b ≥ 1, a ≥ 0; set points on the quarter grid.
 * Failure modes: `closestNumerator`, `pellError` and `descentStep` throw on a non-integer or unsafe input instead of
 *                guessing. A probe over q ≤ 1000 that finds no E = 0 is evidence, never a proof: theorem 1.3.15
 *                and 1.3.16 are the proof, and the figure's caption says so.
 */

function assertInt(v: number, what: string, min = -Infinity) {
  if (!Number.isSafeInteger(v)) throw new RangeError(`${what}: ${v} is not a safe integer`);
  if (v < min) throw new RangeError(`${what}: ${v} < ${min}`);
}

/* ---------------------------------------------------------------- inductive sets */

export type Piece =
  /** an interval; hi may be Infinity */
  | { kind: 'interval'; lo: number; hi: number; loClosed: boolean; hiClosed: boolean }
  /** the points start, start + 1, start + 2, …, `count` of them (Infinity: all) */
  | { kind: 'progression'; start: number; count: number };

export type SetId = 'ray' | 'pos' | 'gap' | 'nat' | 'nat-half' | 'short' | 'skip' | 'stray';

export interface CandidateSet {
  id: SetId;
  /** the set in TeX-free plain math (LTR), for readouts */
  text: string;
  /** a Hebrew name for the picker */
  name: string;
  pieces: Piece[];
  /** proved in the lesson (definition 1.3.1 examples, the proof of 1.3.6, example 1) */
  inductive: boolean;
}

const ray = (lo: number, closed = true): Piece => ({ kind: 'interval', lo, hi: Infinity, loClosed: closed, hiClosed: false });
const pts = (start: number, count = Infinity): Piece => ({ kind: 'progression', start, count });

export const SETS: Record<SetId, CandidateSet> = {
  ray: { id: 'ray', text: '[1, ∞)', name: 'הקרן מ-1', pieces: [ray(1)], inductive: true },
  pos: { id: 'pos', text: '(0, ∞)', name: 'החיוביים', pieces: [ray(0, false)], inductive: true },
  gap: { id: 'gap', text: '{1} ∪ [2, ∞)', name: '1 ועוד הקרן מ-2', pieces: [pts(1, 1), ray(2)], inductive: true },
  nat: { id: 'nat', text: 'ℕ', name: 'הטבעיים', pieces: [pts(1)], inductive: true },
  'nat-half': { id: 'nat-half', text: 'ℕ ∪ {n + ½ : n ∈ ℕ}', name: 'טבעיים וחצאים', pieces: [pts(1), pts(1.5)], inductive: true },
  short: { id: 'short', text: '[1, 5]', name: 'הקטע מ-1 עד 5', pieces: [{ kind: 'interval', lo: 1, hi: 5, loClosed: true, hiClosed: true }], inductive: false },
  skip: { id: 'skip', text: '{1} ∪ [3, ∞)', name: '1 ועוד הקרן מ-3', pieces: [pts(1, 1), ray(3)], inductive: false },
  stray: { id: 'stray', text: 'ℕ ∪ {3/2}', name: 'טבעיים ועוד 3/2', pieces: [pts(1), pts(1.5, 1)], inductive: false },
};

/** x lies on the grid of quarters the figure uses (so every membership test below is exact in floating point). */
export const onQuarterGrid = (x: number) => Number.isFinite(x) && Number.isInteger(x * 4) && Math.abs(x) <= 1e6;

/** Exact membership of a quarter-grid point in a piece. */
export function inPiece(p: Piece, x: number): boolean {
  if (!onQuarterGrid(x)) throw new RangeError(`inPiece: ${x} is not on the quarter grid`);
  if (p.kind === 'interval') {
    const aboveLo = p.loClosed ? x >= p.lo : x > p.lo;
    const belowHi = p.hi === Infinity || (p.hiClosed ? x <= p.hi : x < p.hi);
    return aboveLo && belowHi;
  }
  const k = x - p.start;
  return Number.isInteger(k) && k >= 0 && k < p.count;
}

export const inSet = (s: CandidateSet, x: number) => s.pieces.some((p) => inPiece(p, x));

export interface StepCheck {
  /** 1 ∈ S */
  hasOne: boolean;
  xIn: boolean;
  nextIn: boolean;
  /** x ∈ S and x + 1 ∉ S: x witnesses that S is not inductive */
  breaks: boolean;
}

/** The two conditions of definition 1.3.1, at one point x. */
export function checkAt(s: CandidateSet, x: number): StepCheck {
  const xIn = inSet(s, x);
  const nextIn = inSet(s, x + 1);
  return { hasOne: inSet(s, 1), xIn, nextIn, breaks: xIn && !nextIn };
}

/** The first quarter-grid point of [lo, hi] at which the step x ∈ S ⇒ x + 1 ∈ S fails, or null (a finite probe). */
export function firstBreak(s: CandidateSet, lo = -1, hi = 9): number | null {
  for (let k = Math.ceil(lo * 4); k <= Math.floor(hi * 4); k++) if (checkAt(s, k / 4).breaks) return k / 4;
  return null;
}

/* ---------------------------------------------------------------- p² − n q² */

/** ⌊√N⌋ for a safe integer N ≥ 0, exact (floating estimate, then corrected by integer comparisons). */
export function isqrt(N: number): number {
  assertInt(N, 'isqrt', 0);
  let s = Math.floor(Math.sqrt(N));
  while (s * s > N) s--;
  while ((s + 1) * (s + 1) <= N) s++;
  return s;
}

/** N is the square of an integer. */
export const isSquare = (N: number) => {
  const s = isqrt(N);
  return s * s === N;
};

/** E = p² − n q², exactly. */
export function pellError(p: number, q: number, n: number): number {
  assertInt(p, 'pellError p');
  assertInt(q, 'pellError q', 1);
  assertInt(n, 'pellError n', 1);
  const E = p * p - n * q * q;
  assertInt(E, 'pellError value');
  return E;
}

/**
 * The integer p ≥ 0 for which p/q is nearest to √n: with p₀ = ⌊q√n⌋ = isqrt(n q²), p₀/q lies at or below √n and
 * (p₀+1)/q above it, and (p₀+1)/q is nearer exactly when the midpoint (p₀ + ½)/q is below √n, i.e. (2p₀+1)² < 4nq².
 * (Equality is impossible: the left side is odd, the right side even.)
 */
export function closestNumerator(q: number, n: number): number {
  assertInt(q, 'closestNumerator q', 1);
  assertInt(n, 'closestNumerator n', 1);
  if (q > 1000 || n > 100) throw new RangeError('closestNumerator: q ≤ 1000 and n ≤ 100');
  const p0 = isqrt(n * q * q);
  return (2 * p0 + 1) ** 2 < 4 * n * q * q ? p0 + 1 : p0;
}

export interface Probe {
  q: number;
  p: number;
  E: number;
}

/** For q = 1 … qMax: the nearest fraction p/q to √n and its E = p² − n q². */
export function probe(n: number, qMax: number): Probe[] {
  const out: Probe[] = [];
  for (let q = 1; q <= qMax; q++) {
    const p = closestNumerator(q, n);
    out.push({ q, p, E: pellError(p, q, n) });
  }
  return out;
}

/* ---------------------------------------------------------------- the descent of 1.3.16 */

export interface DescentStep {
  a: number;
  b: number;
  /** a = m b + r, 0 ≤ r < b */
  m: number;
  r: number;
  E: number;
}

/** Division with remainder for a ≥ 0, b ≥ 1 (theorem 1.3.11), exact. */
export function divmod(a: number, b: number): { m: number; r: number } {
  assertInt(a, 'divmod a', 0);
  assertInt(b, 'divmod b', 1);
  const m = Math.floor(a / b);
  const r = a - m * b;
  if (r < 0 || r >= b) throw new RangeError('divmod: remainder out of range');
  return { m, r };
}

/**
 * One step of the descent: a/b ↦ (n b − m a)/r with a = m b + r. Returns null when r = 0 (a/b is the integer m) or
 * when the new numerator is not positive (a/b is too far above √n for the step to make sense in the figure).
 */
export function descentStep(a: number, b: number, n: number): { a: number; b: number } | null {
  assertInt(n, 'descentStep n', 1);
  const { m, r } = divmod(a, b);
  if (r === 0) return null;
  const na = n * b - m * a;
  assertInt(na, 'descentStep numerator');
  return na > 0 ? { a: na, b: r } : null;
}

/** The chain a/b, then each descent step, until an integer, a non-positive numerator, or `maxSteps` steps. */
export function descentChain(a: number, b: number, n: number, maxSteps = 40): DescentStep[] {
  const out: DescentStep[] = [];
  let cur: { a: number; b: number } | null = { a, b };
  while (cur && out.length <= maxSteps) {
    const { m, r } = divmod(cur.a, cur.b);
    out.push({ a: cur.a, b: cur.b, m, r, E: pellError(cur.a, cur.b, n) });
    cur = descentStep(cur.a, cur.b, n);
  }
  return out;
}

/** The starting fractions the figure offers for each n (each has |p² − n q²| = 1). */
export const DESCENT_STARTS: Record<number, [number, number][]> = {
  2: [[577, 408], [99, 70], [41, 29]],
  3: [[97, 56], [26, 15]],
};

/** gcd of two non-negative safe integers (for "reduced" readouts). */
export function gcd(a: number, b: number): number {
  assertInt(a, 'gcd a');
  assertInt(b, 'gcd b');
  let [x, y] = [Math.abs(a), Math.abs(b)];
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}
