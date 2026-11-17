/**
 * MODEL SPECIFICATION
 *
 * System:        the sequences the figure `SequenceStrip` shows (lessons 2.2–2.6 and 2.10), each with the
 *                limit the lesson claims for it (or none), and the bookkeeping of the definitions it draws:
 *                - limit (2.2):     for all n > N, |aₙ − L| < ε;
 *                - bound (2.3.3):   |aₙ| ≤ M for every n, and the proof's bound max(|a₁|, …, |a_N|, |L| + 1);
 *                - combine (2.4):   cₙ = aₙ + bₙ, aₙ·bₙ, aₙ/bₙ of a pair, with the tolerances ε_a, ε_b the
 *                                   proofs of 2.4.1, 2.4.2, 2.4.4 put on aₙ and bₙ;
 *                - sandwich (2.5):  a triple lower ≤ middle ≤ upper and the N each one needs;
 *                - infinite (2.6):  for all n > N, aₙ > M (→ ∞) or aₙ < M (→ −∞);
 *                - cauchy (2.10):   the spread max − min of the tail aₙ, N < n ≤ T, against ε.
 * Dynamics:      none. Partial sums (Σ 1/k², Hₙ, Σ (−1)^(k+1)/k) are a cached running sum: sₙ = sₙ₋₁ + tₙ,
 *                each term added once, never re-summed per n.
 * Boundary:      every count runs over a finite window n ≤ horizon. `smallestN`, `smallestNBeyond` and
 *                `smallestCauchyN` are the definitions' N **on that window**: evidence that a proof's N is
 *                right, never a proof that one exists. A tail spread is measured up to a finite T: a sequence
 *                that is not Cauchy can look Cauchy if T is too close to N, which is why the figure checks up
 *                to T ≥ 4N + 100 (Hₙ: H_T − H_{N+1} ≥ ln((T+1)/(N+2)) > ln 4 for every N).
 * Ignored:       exact arithmetic. Terms are doubles, and for 1/n, 1 + (−1)ⁿ/n, (2n+1)/n or (3n+1)/(n+2) the
 *                distance to the limit is exactly 1/n or 5/(n+2), so every ε = 1/k puts a term exactly on the
 *                band edge, where plain `<` would let rounding decide (1 + 1/5 − 1 = 0.19999… < 0.2).
 *                `inBand` counts a distance within a relative 1e-9 of ε as on the edge, hence outside: the
 *                inequality is strict. `beyond` does the same for aₙ > M (a term equal to M is not beyond),
 *                and `spreadBelow` for spread < ε. ⌊n√2⌋ is computed in integers (m² ≤ 2n² < (m+1)²), exact
 *                for n ≤ 6·10⁷. √(n+1) − √n is evaluated as 1/(√(n+1) + √n), the same number without the
 *                cancellation.
 * Valid when:    the horizon is well past the N being checked (`smallestN` refuses a window whose second
 *                half is not inside the band, see `firstN`; `smallestNBeyond` likewise).
 * Failure modes: a sequence that leaves the band only after the horizon looks convergent; Σ 1/k² looks
 *                Cauchy and Hₙ does not, on any window, but only the lesson's proof (2.10.6, 2.10.7) decides.
 */

import type { Seq } from './analysis';

/** |v − L| < ε, with a term on the edge (up to rounding) counted outside, as the strict inequality says. */
export const inBand = (v: number, L: number, eps: number): boolean => Math.abs(v - L) < eps * (1 - 1e-9);

/**
 * The partial sums sₙ = t(1) + … + t(n) as a sequence, by a cached running sum: asking for sₙ adds the terms not
 * yet added, once each, so a search that walks n down from 200 000 costs 200 000 additions in all.
 */
export function partialSums(t: (k: number) => number): Seq {
  const s: number[] = [0];
  return (n: number) => {
    const k = Math.floor(n);
    if (k < 0) return NaN;
    while (s.length <= k) s.push(s[s.length - 1] + t(s.length));
    return s[k];
  };
}

/** ⌊n√2⌋ in integers: the m with m² ≤ 2n² < (m+1)² (√2 is irrational, so m² < 2n²). Exact while 2n² < 2⁵³. */
export function floorNSqrt2(n: number): number {
  const t = 2 * n * n;
  let m = Math.floor(Math.sqrt(t));
  while (m * m > t) m--;
  while ((m + 1) * (m + 1) <= t) m++;
  return m;
}

export type SequenceId =
  // lesson 2.2
  | 'recip'
  | 'shifted'
  | 'alternating'
  | 'bumpy'
  | 'slow'
  | 'wild-start'
  | 'sign'
  // lesson 2.3
  | 'ratio3'
  | 'quad3'
  | 'root-diff'
  | 'sqrt-n'
  | 'alt-ratio'
  // lesson 2.6
  | 'lin'
  | 'zigzag'
  | 'neg-quad'
  | 'alt-lin'
  // lesson 2.10
  | 'inv-sq-sum'
  | 'harmonic'
  | 'alt-harmonic';

export interface SequencePreset {
  /** button label; a formula is wrapped in LRI … PDI so the RTL control panel does not reverse it */
  name: string;
  /** the formula as TeX-free text for captions and the aria label (LTR inside an isolate) */
  formula: string;
  a: Seq;
  /** the limit, or null for a divergent sequence (the figure then lets the student pick a candidate L) */
  limit: number | null;
  /** the candidate L shown first for a sequence without a (claimed) limit */
  candidate?: number;
  /** the candidate-L slider [min, max, step] (default [−1.5, 1.5, 0.1]) */
  lRange?: [number, number, number];
  /** +1: aₙ → ∞, −1: aₙ → −∞ (the lesson proves it); absent: neither (or not claimed) */
  tends?: 1 | -1;
  /** mode 'infinite': the M slider [min, max, step] and its start */
  mRange?: [number, number, number];
  m0?: number;
  /** n-axis window at the start, and the value window (widened by the figure when the terms leave it) */
  window: number;
  y: [number, number];
}

const harmonicSum = partialSums((k) => 1 / k);
const invSquareSum = partialSums((k) => 1 / (k * k));
const altHarmonicSum = partialSums((k) => (k % 2 === 1 ? 1 : -1) / k);

export const SEQUENCES: Record<SequenceId, SequencePreset> = {
  recip: { name: '⁦1/n⁩', formula: 'aₙ = 1/n', a: (n) => 1 / n, limit: 0, window: 40, y: [-0.4, 1.1] },
  shifted: { name: '⁦(2n+1)/n⁩', formula: 'aₙ = (2n+1)/n', a: (n) => (2 * n + 1) / n, limit: 2, window: 40, y: [1.6, 3.1] },
  alternating: {
    name: '⁦1 + (−1)ⁿ/n⁩',
    formula: 'aₙ = 1 + (−1)ⁿ/n',
    a: (n) => 1 + (-1) ** n / n,
    limit: 1,
    window: 40,
    y: [-0.1, 1.6],
  },
  // converges although a term is often farther from the limit than the one before it (a₂ = 1.5 > a₁ = 1)
  bumpy: { name: '⁦(2 + (−1)ⁿ)/n⁩', formula: 'aₙ = (2 + (−1)ⁿ)/n', a: (n) => (2 + (-1) ** n) / n, limit: 0, window: 50, y: [-0.4, 1.7] },
  slow: { name: '⁦1/√n⁩', formula: 'aₙ = 1/√n', a: (n) => 1 / Math.sqrt(n), limit: 0, window: 120, y: [-0.4, 1.1] },
  // ten wild terms, then 1/n: the first terms cannot change the limit
  'wild-start': {
    name: 'התחלה פרועה',
    formula: 'aₙ = (−1)ⁿ·3 עד n = 10, ואחר כך aₙ = 1/n',
    a: (n) => (n <= 10 ? (-1) ** n * 3 : 1 / n),
    limit: 0,
    window: 40,
    y: [-3.4, 3.4],
  },
  sign: { name: '⁦(−1)ⁿ⁩', formula: 'aₙ = (−1)ⁿ', a: (n) => (-1) ** n, limit: null, candidate: 1, window: 40, y: [-1.8, 2.2] },

  // |aₙ − 3| = 5/(n+2): the estimate of lesson 2.3, N(ε) = ⌊5/ε − 2⌋
  ratio3: { name: '⁦(3n+1)/(n+2)⁩', formula: 'aₙ = (3n+1)/(n+2)', a: (n) => (3 * n + 1) / (n + 2), limit: 3, window: 40, y: [1, 3.3] },
  // aₙ − 3 = (n − 3)/(n² + 1): below 3 for n < 3, equal at n = 3, above after; the largest term is a₆ = 114/37
  quad3: { name: '⁦(3n² + n)/(n² + 1)⁩', formula: 'aₙ = (3n² + n)/(n² + 1)', a: (n) => (3 * n * n + n) / (n * n + 1), limit: 3, window: 40, y: [1.6, 3.4] },
  // √(n+1) − √n = 1/(√(n+1) + √n), evaluated in the second form (no cancellation)
  'root-diff': {
    name: '⁦√(n+1) − √n⁩',
    formula: 'aₙ = √(n+1) − √n',
    a: (n) => 1 / (Math.sqrt(n + 1) + Math.sqrt(n)),
    limit: 0,
    window: 60,
    y: [-0.15, 0.55],
  },
  // unbounded, so divergent (2.3.3); → ∞ (2.6): √n > M ⇔ n > M²
  'sqrt-n': {
    name: '⁦√n⁩',
    formula: 'aₙ = √n',
    a: (n) => Math.sqrt(n),
    limit: null,
    candidate: 3,
    lRange: [0, 10, 0.5],
    tends: 1,
    mRange: [0, 20, 0.5],
    m0: 4,
    window: 40,
    y: [0, 7],
  },
  'alt-ratio': {
    name: '⁦(−1)ⁿ n/(n+1)⁩',
    formula: 'aₙ = (−1)ⁿ n/(n+1)',
    a: (n) => ((-1) ** n * n) / (n + 1),
    limit: null,
    candidate: 1,
    window: 40,
    y: [-1.6, 1.8],
  },

  lin: { name: '⁦n⁩', formula: 'aₙ = n', a: (n) => n, limit: null, candidate: 0, lRange: [0, 40, 1], tends: 1, mRange: [0, 300, 5], m0: 20, window: 40, y: [0, 45] },
  // unbounded and not → ∞: the odd terms stay at 0
  zigzag: {
    name: 'זיגזג ⁦0, 2, 0, 4, …⁩',
    formula: 'aₙ = n כש-n זוגי, aₙ = 0 כש-n אי-זוגי',
    a: (n) => (n % 2 === 0 ? n : 0),
    limit: null,
    candidate: 0,
    lRange: [0, 40, 1],
    mRange: [0, 300, 5],
    m0: 10,
    window: 40,
    y: [-2, 45],
  },
  // → −∞: 10n − n² < M ⇔ n > 5 + √(25 − M) (for M ≤ 25)
  'neg-quad': {
    name: '⁦10n − n²⁩',
    formula: 'aₙ = 10n − n²',
    a: (n) => 10 * n - n * n,
    limit: null,
    candidate: 0,
    lRange: [-100, 30, 5],
    tends: -1,
    mRange: [-3000, 0, 50],
    m0: -500,
    window: 40,
    y: [-1250, 100],
  },
  // unbounded in both directions, not → ±∞
  'alt-lin': {
    name: '⁦(−1)ⁿ n⁩',
    formula: 'aₙ = (−1)ⁿ n',
    a: (n) => (-1) ** n * n,
    limit: null,
    candidate: 0,
    lRange: [-40, 40, 1],
    mRange: [0, 300, 5],
    m0: 10,
    window: 40,
    y: [-45, 45],
  },

  // increasing and bounded (by 2 − 1/n, telescoping); its value is not claimed in chapter 2
  'inv-sq-sum': {
    name: '⁦1 + 1/4 + … + 1/n²⁩',
    formula: 'aₙ = 1 + 1/2² + … + 1/n²',
    a: invSquareSum,
    limit: null,
    candidate: 1.5,
    lRange: [0.5, 2, 0.05],
    window: 60,
    y: [0.9, 1.75],
  },
  // H₂ₙ − Hₙ ≥ 1/2: not Cauchy, → ∞ (2.10.6)
  harmonic: {
    name: '⁦Hₙ = 1 + 1/2 + … + 1/n⁩',
    formula: 'Hₙ = 1 + 1/2 + … + 1/n',
    a: harmonicSum,
    limit: null,
    candidate: 3,
    lRange: [0, 8, 0.25],
    tends: 1,
    mRange: [0, 6, 0.25],
    m0: 3,
    // 160, not 60: the N slider ends at the window, and lesson 2.10's task asks for N ≥ 100 (H₁₆₀ ≈ 5.65)
    window: 160,
    y: [0.8, 6.2],
  },
  // |aₙ₊ₚ − aₙ| ≤ 1/(n+1): Cauchy; its value is not claimed in chapter 2
  'alt-harmonic': {
    name: '⁦1 − 1/2 + 1/3 − … ± 1/n⁩',
    formula: 'aₙ = 1 − 1/2 + 1/3 − … + (−1)ⁿ⁺¹/n',
    a: altHarmonicSum,
    limit: null,
    candidate: 0.7,
    lRange: [0, 1.5, 0.05],
    window: 60,
    y: [0.4, 1.1],
  },
};

export const isSequenceId = (id: unknown): id is SequenceId => typeof id === 'string' && Object.hasOwn(SEQUENCES, id);

/**
 * The definition's N on a window: the smallest N ≥ 0 such that |aₙ − L| < ε for every N < n ≤ horizon.
 * Null when the band does not hold over at least the second half of the window: (−1)ⁿ sits inside the band
 * around 1 at every even n, and that is no evidence of anything. For 1/n and ε = 0.01 it is 100.
 */
export function smallestN(a: Seq, L: number, eps: number, horizon = 100_000): number | null {
  let N = horizon;
  while (N > 0 && inBand(a(N), L, eps)) N--;
  return N <= horizon / 2 ? N : null;
}

/** The indices N < n ≤ horizon whose terms lie outside the band: what a student's N leaves behind. */
export function outsideAfter(a: Seq, L: number, eps: number, N: number, horizon: number): number[] {
  const out: number[] = [];
  for (let n = Math.max(1, Math.floor(N) + 1); n <= horizon; n++) if (!inBand(a(n), L, eps)) out.push(n);
  return out;
}

/** The ε values the figure offers, widest first. Many are 1/k, so terms land on the edge: see `inBand`. */
export const EPSILONS = [0.5, 0.3, 0.2, 0.1, 0.05, 0.03, 0.02, 0.01, 0.005];

// ---------------------------------------------------------------------------------------------------------------
// bound (2.3.3)

/** max |aₙ| over n0 ≤ n ≤ n1 (0 for an empty range). */
export function maxAbs(a: Seq, n0: number, n1: number): number {
  let m = 0;
  for (let n = Math.max(1, n0); n <= n1; n++) m = Math.max(m, Math.abs(a(n)));
  return m;
}

/**
 * The bound of 2.3.3: max(|a₁|, …, |a_N|, |L| + 1). It bounds every term when N fits ε = 1 (then |aₙ| < |L| + 1 for
 * n > N by the triangle inequality); with an N that does not fit, it is just a number.
 */
export const proofBound = (a: Seq, L: number, N: number): number => Math.max(maxAbs(a, 1, N), Math.abs(L) + 1);

// ---------------------------------------------------------------------------------------------------------------
// combine (2.4)

export type CombineOp = 'sum' | 'product' | 'quotient';
export const COMBINE_OPS: CombineOp[] = ['sum', 'product', 'quotient'];

export const combine = (op: CombineOp, x: number, y: number): number => (op === 'sum' ? x + y : op === 'product' ? x * y : x / y);

export type PairId = 'pair-sum' | 'pair-cancel';

export interface SequencePair {
  name: string;
  /** both formulas, TeX-free, for captions and the aria label */
  formula: string;
  a: Seq;
  b: Seq;
  aLimit: number | null;
  bLimit: number | null;
  /** a proven bound K ≥ |aₙ| for every n (the product proof needs one); only for a convergent aₙ */
  aBound?: number;
  /** the limit of cₙ for each operation defined on the pair (null: cₙ diverges). An op absent here is undefined
   *  (bₙ has zeros), and the figure does not offer it. */
  limits: Partial<Record<CombineOp, number | null>>;
  /** candidate L when cₙ has no limit, and its slider */
  candidate?: number;
  lRange?: [number, number, number];
  window: number;
  y: [number, number];
}

export const PAIRS: Record<PairId, SequencePair> = {
  // sum → 3, product → 2, quotient → 1/2; |aₙ| ≤ 2
  'pair-sum': {
    name: '⁦1 + 1/n⁩ ו-⁦2 − 1/√n⁩',
    formula: 'aₙ = 1 + 1/n, bₙ = 2 − 1/√n',
    a: (n) => 1 + 1 / n,
    b: (n) => 2 - 1 / Math.sqrt(n),
    aLimit: 1,
    bLimit: 2,
    aBound: 2,
    limits: { sum: 3, product: 2, quotient: 0.5 },
    window: 50,
    y: [0, 3.3],
  },
  // two divergent sequences whose sum is the constant 1; the product (−1)ⁿ − 1 is 0, −2, 0, −2, …; bₙ = 0 for even n
  'pair-cancel': {
    name: '⁦(−1)ⁿ⁩ ו-⁦1 − (−1)ⁿ⁩',
    formula: 'aₙ = (−1)ⁿ, bₙ = 1 − (−1)ⁿ',
    a: (n) => (-1) ** n,
    b: (n) => 1 - (-1) ** n,
    aLimit: null,
    bLimit: null,
    limits: { sum: 1, product: null },
    candidate: 0,
    lRange: [-2.5, 2.5, 0.1],
    window: 40,
    y: [-2.4, 2.4],
  },
};

export const isPairId = (id: unknown): id is PairId => typeof id === 'string' && Object.hasOwn(PAIRS, id);

/** The operations defined on a pair, in the order sum, product, quotient. */
export const opsOf = (p: SequencePair): CombineOp[] => COMBINE_OPS.filter((op) => op in p.limits);

/** cₙ = aₙ ∘ bₙ. */
export const combined = (p: SequencePair, op: CombineOp): Seq => (n) => combine(op, p.a(n), p.b(n));

/**
 * The tolerances the proofs of 2.4 put on aₙ and bₙ so that n > max(N₁, N₂) gives |cₙ − c| < ε:
 *   sum (2.4.1):      ε/2 and ε/2;
 *   product (2.4.2):  |aₙbₙ − ab| ≤ |aₙ||bₙ − b| + |b||aₙ − a| ≤ K|bₙ − b| + |b||aₙ − a|, so ε/(2(|b| + 1)) on aₙ and
 *                     ε/(2K) on bₙ, with K ≥ |aₙ| for every n;
 *   quotient (2.4.4): |aₙ/bₙ − a/b| ≤ (|b||aₙ − a| + |a||bₙ − b|) · 2/b² once |bₙ| > |b|/2, so ε|b|/4 on aₙ and
 *                     min(|b|/2, εb²/(4(|a| + 1))) on bₙ (the first keeps |bₙ| > |b|/2, lemma 2.4.3).
 * Null when aₙ or bₙ has no limit (the theorems say nothing then), or the op is undefined on the pair.
 */
export function combineTolerances(p: SequencePair, op: CombineOp, eps: number): { epsA: number; epsB: number } | null {
  const a = p.aLimit;
  const b = p.bLimit;
  if (a === null || b === null || !(op in p.limits)) return null;
  if (op === 'sum') return { epsA: eps / 2, epsB: eps / 2 };
  if (op === 'product') {
    if (p.aBound === undefined) return null;
    return { epsA: eps / (2 * (Math.abs(b) + 1)), epsB: eps / (2 * p.aBound) };
  }
  if (b === 0) return null;
  return { epsA: (eps * Math.abs(b)) / 4, epsB: Math.min(Math.abs(b) / 2, (eps * b * b) / (4 * (Math.abs(a) + 1))) };
}

// ---------------------------------------------------------------------------------------------------------------
// sandwich (2.5)

export type TripleId = 'floor-x' | 'osc-squeeze' | 'zero-bounded' | 'outer-differ';

export interface SequenceTriple {
  name: string;
  /** the three formulas, TeX-free */
  formula: string;
  lower: Seq;
  middle: Seq;
  upper: Seq;
  lowerLimit: number;
  upperLimit: number;
  /** the common limit of the outer sequences (and so of the middle), or null when the outer limits differ */
  limit: number | null;
  candidate?: number;
  lRange?: [number, number, number];
  window: number;
  y: [number, number];
}

export const TRIPLES: Record<TripleId, SequenceTriple> = {
  // √2 − 1/n < ⌊n√2⌋/n < √2 (1.6.6; √2 irrational, so the right inequality is strict)
  'floor-x': {
    name: '⁦⌊n√2⌋/n⁩',
    formula: '√2 − 1/n ≤ ⌊n√2⌋/n ≤ √2',
    lower: (n) => Math.SQRT2 - 1 / n,
    middle: (n) => floorNSqrt2(n) / n,
    upper: () => Math.SQRT2,
    lowerLimit: Math.SQRT2,
    upperLimit: Math.SQRT2,
    limit: Math.SQRT2,
    window: 40,
    y: [0.3, 1.6],
  },
  // the middle equals the lower sequence at odd n and the upper one at even n
  'osc-squeeze': {
    name: '⁦(n + (−1)ⁿ)/n⁩',
    formula: '(n−1)/n ≤ (n + (−1)ⁿ)/n ≤ (n+1)/n',
    lower: (n) => (n - 1) / n,
    middle: (n) => (n + (-1) ** n) / n,
    upper: (n) => (n + 1) / n,
    lowerLimit: 1,
    upperLimit: 1,
    limit: 1,
    window: 40,
    y: [-0.1, 2.1],
  },
  // |sin n| ≤ 1 (a school fact)
  'zero-bounded': {
    name: '⁦sin(n)/n⁩',
    formula: '−1/n ≤ sin(n)/n ≤ 1/n',
    lower: (n) => -1 / n,
    middle: (n) => Math.sin(n) / n,
    upper: (n) => 1 / n,
    lowerLimit: 0,
    upperLimit: 0,
    limit: 0,
    window: 40,
    y: [-1.1, 1.1],
  },
  // the outer limits differ: the sandwich says nothing, and the middle (−1)ⁿ diverges
  'outer-differ': {
    name: 'גבולות חיצוניים שונים',
    formula: '−1 ≤ (−1)ⁿ ≤ 1',
    lower: () => -1,
    middle: (n) => (-1) ** n,
    upper: () => 1,
    lowerLimit: -1,
    upperLimit: 1,
    limit: null,
    candidate: 0,
    window: 40,
    y: [-1.6, 1.6],
  },
};

export const isTripleId = (id: unknown): id is TripleId => typeof id === 'string' && Object.hasOwn(TRIPLES, id);

// ---------------------------------------------------------------------------------------------------------------
// infinite (2.6)

/** aₙ beyond M in the direction dir: aₙ > M (dir +1) or aₙ < M (dir −1), strictly; a term equal to M (up to
 *  rounding) is not beyond. */
export const beyond = (v: number, M: number, dir: 1 | -1): boolean => {
  const tol = 1e-12 * Math.max(1, Math.abs(M));
  return dir > 0 ? v > M + tol : v < M - tol;
};

/**
 * The N of 2.6.1 on a window: the smallest N ≥ 0 with aₙ beyond M for every N < n ≤ horizon. Null when that does
 * not hold over at least the second half of the window (the zigzag is beyond M at every large even n only).
 * For √n and M = 10 it is 100 (√n > 10 ⇔ n > 100); in general ⌊M²⌋ for M ≥ 0.
 */
export function smallestNBeyond(a: Seq, M: number, dir: 1 | -1, horizon = 100_000): number | null {
  let N = horizon;
  while (N > 0 && beyond(a(N), M, dir)) N--;
  return N <= horizon / 2 ? N : null;
}

/** The indices N < n ≤ horizon whose terms are not beyond M. */
export function notBeyondAfter(a: Seq, M: number, dir: 1 | -1, N: number, horizon: number): number[] {
  const out: number[] = [];
  for (let n = Math.max(1, Math.floor(N) + 1); n <= horizon; n++) if (!beyond(a(n), M, dir)) out.push(n);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// cauchy (2.10)

export interface TailSpread {
  min: number;
  max: number;
  spread: number;
  nMin: number;
  nMax: number;
}

/** min, max and max − min of aₙ over N < n ≤ T: the largest |aₘ − aₙ| for N < m, n ≤ T. */
export function tailSpread(a: Seq, N: number, T: number): TailSpread {
  let min = Infinity;
  let max = -Infinity;
  let nMin = 0;
  let nMax = 0;
  for (let n = Math.max(1, Math.floor(N) + 1); n <= T; n++) {
    const v = a(n);
    if (v < min) [min, nMin] = [v, n];
    if (v > max) [max, nMax] = [v, n];
  }
  return { min, max, spread: max - min, nMin, nMax };
}

/** spread < ε, with a spread on the edge (up to rounding) counted as not below, as the strict inequality says. */
export const spreadBelow = (spread: number, eps: number): boolean => spread < eps * (1 - 1e-9);

/**
 * The Cauchy N on a window: the smallest 0 ≤ N ≤ nMax whose tail N < n ≤ T(N) has spread < ε, where T(N) is the
 * checked range (the figure's: max(2000, 4N + 100)). Null when no N up to nMax has. Each N stops scanning as soon
 * as its tail's spread reaches ε.
 */
export function smallestCauchyN(a: Seq, eps: number, T: (N: number) => number, nMax: number): number | null {
  for (let N = 0; N <= nMax; N++) {
    let min = Infinity;
    let max = -Infinity;
    let ok = true;
    const end = T(N);
    for (let n = N + 1; n <= end; n++) {
      const v = a(n);
      if (v < min) min = v;
      if (v > max) max = v;
      if (!spreadBelow(max - min, eps)) {
        ok = false;
        break;
      }
    }
    if (ok) return N;
  }
  return null;
}
