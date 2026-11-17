/**
 * MODEL SPECIFICATION
 *
 * System:        the sequences of lesson 2.8's growth ladder (ln n, √n, n, n², n¹⁰, 1.1ⁿ, 2ⁿ, n!, nⁿ) and three
 *                quotients the lesson studies with the ratio test (100ⁿ/n!, n¹⁰/2ⁿ, n!/nⁿ). For each: log₁₀ aₙ,
 *                the ratio aₙ₊₁/aₙ in closed form, the limit of that ratio, and (for the tests) the exact
 *                rational value of aₙ where there is one.
 * Dynamics:      none.
 * Boundary:      every comparison runs over a finite window first ≤ n ≤ horizon. `overtakeFrom` is the point
 *                from which one sequence stays above the other **on that window**, `ratioBelowFrom` the point
 *                from which the ratio stays below 1 **on that window**: evidence for a claim about the tail,
 *                never a proof of it (the lesson's 2.8.4–2.8.7 are the proofs).
 * Ignored:       exact arithmetic in the figure. Terms are compared through log₁₀, so n! = 10^2567.6 at n = 1000
 *                never overflows a double; log₁₀ n! is a cached running sum of log₁₀ k, never re-summed per n.
 *                Two logarithms within a relative 1e-10 of each other count as equal (n² = 2ⁿ at n = 4 must
 *                not be decided by rounding: 4·log₁₀2 and 2·log₁₀4 differ in the last bit).
 * Valid when:    n ≤ 10⁵ (the cache), and the two sequences compared are not equal-to-within-1e-10 at a point
 *                where they are in fact different. For the presets this holds: the tests compare every
 *                crossing found through logarithms with the exact crossing found with BigInt.
 * Failure modes: a sequence that is overtaken again after the horizon looks like the winner (that is why the
 *                lesson proves 2.8.5 instead of trusting the window).
 */

export type GrowthId =
  | 'ln'
  | 'sqrt'
  | 'n'
  | 'n2'
  | 'n10'
  | 'pow11'
  | 'pow2'
  | 'fact'
  | 'nn'
  | 'pow100-fact'
  | 'n10-pow2'
  | 'fact-nn';

export interface GrowthPreset {
  /** button label: a formula wrapped in LRI … PDI so the RTL control panel does not reverse it */
  name: string;
  /** TeX-free text for the aria label and the live line */
  formula: string;
  /** the first index where aₙ > 0 and the ratio aₙ₊₁/aₙ is defined (ln 1 = 0, so ln n starts at 2) */
  first: number;
  /** log₁₀ aₙ for n ≥ first */
  log10: (n: number) => number;
  /** aₙ₊₁/aₙ in closed form, for n ≥ first */
  ratio: (n: number) => number;
  /** lim aₙ₊₁/aₙ (Infinity when the ratio tends to infinity) */
  ratioLimit: number;
  /** aₙ exactly, as num/den, where aₙ is rational (the tests check the figure's comparisons against it) */
  exact?: (n: number) => { num: bigint; den: bigint };
}

/** log₁₀ k! for k = 0, 1, 2, …: a running sum, extended on demand and cached. */
const LOG10_FACT: number[] = [0];
export function log10Factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`log10Factorial: ${n} is not a natural number`);
  for (let k = LOG10_FACT.length; k <= n; k++) LOG10_FACT.push(LOG10_FACT[k - 1] + Math.log10(k));
  return LOG10_FACT[n];
}

const L2 = Math.log10(2);
const L11 = Math.log10(1.1);
const B = BigInt;
const one = (num: bigint) => ({ num, den: 1n });
function bigFact(n: number): bigint {
  let f = 1n;
  for (let k = 2; k <= n; k++) f *= B(k);
  return f;
}

export const GROWTH: Record<GrowthId, GrowthPreset> = {
  ln: {
    name: '⁦ln n⁩',
    formula: 'aₙ = ln n',
    first: 2,
    log10: (n) => Math.log10(Math.log(n)),
    ratio: (n) => Math.log(n + 1) / Math.log(n),
    ratioLimit: 1,
  },
  sqrt: { name: '⁦√n⁩', formula: 'aₙ = √n', first: 1, log10: (n) => 0.5 * Math.log10(n), ratio: (n) => Math.sqrt((n + 1) / n), ratioLimit: 1 },
  n: { name: '⁦n⁩', formula: 'aₙ = n', first: 1, log10: (n) => Math.log10(n), ratio: (n) => (n + 1) / n, ratioLimit: 1, exact: (n) => one(B(n)) },
  n2: { name: '⁦n²⁩', formula: 'aₙ = n²', first: 1, log10: (n) => 2 * Math.log10(n), ratio: (n) => ((n + 1) / n) ** 2, ratioLimit: 1, exact: (n) => one(B(n) ** 2n) },
  n10: {
    name: '⁦n¹⁰⁩',
    formula: 'aₙ = n¹⁰',
    first: 1,
    log10: (n) => 10 * Math.log10(n),
    ratio: (n) => ((n + 1) / n) ** 10,
    ratioLimit: 1,
    exact: (n) => one(B(n) ** 10n),
  },
  pow11: {
    name: '⁦1.1ⁿ⁩',
    formula: 'aₙ = 1.1ⁿ',
    first: 1,
    log10: (n) => n * L11,
    ratio: () => 1.1,
    ratioLimit: 1.1,
    exact: (n) => ({ num: 11n ** B(n), den: 10n ** B(n) }),
  },
  pow2: { name: '⁦2ⁿ⁩', formula: 'aₙ = 2ⁿ', first: 1, log10: (n) => n * L2, ratio: () => 2, ratioLimit: 2, exact: (n) => one(2n ** B(n)) },
  fact: { name: '⁦n!⁩', formula: 'aₙ = n!', first: 1, log10: log10Factorial, ratio: (n) => n + 1, ratioLimit: Infinity, exact: (n) => one(bigFact(n)) },
  nn: {
    name: '⁦nⁿ⁩',
    formula: 'aₙ = nⁿ',
    first: 1,
    log10: (n) => n * Math.log10(n),
    // (n+1)^(n+1)/nⁿ = (n+1)·(1 + 1/n)ⁿ
    ratio: (n) => (n + 1) * (1 + 1 / n) ** n,
    ratioLimit: Infinity,
    exact: (n) => one(B(n) ** B(n)),
  },
  'pow100-fact': {
    name: '⁦100ⁿ/n!⁩',
    formula: 'aₙ = 100ⁿ/n!',
    first: 1,
    log10: (n) => 2 * n - log10Factorial(n),
    ratio: (n) => 100 / (n + 1),
    ratioLimit: 0,
    exact: (n) => ({ num: 100n ** B(n), den: bigFact(n) }),
  },
  'n10-pow2': {
    name: '⁦n¹⁰/2ⁿ⁩',
    formula: 'aₙ = n¹⁰/2ⁿ',
    first: 1,
    log10: (n) => 10 * Math.log10(n) - n * L2,
    ratio: (n) => ((n + 1) / n) ** 10 / 2,
    ratioLimit: 0.5,
    exact: (n) => ({ num: B(n) ** 10n, den: 2n ** B(n) }),
  },
  'fact-nn': {
    name: '⁦n!/nⁿ⁩',
    formula: 'aₙ = n!/nⁿ',
    first: 1,
    log10: (n) => log10Factorial(n) - n * Math.log10(n),
    // nⁿ/(n+1)ⁿ = 1/(1 + 1/n)ⁿ → 1/e
    ratio: (n) => 1 / (1 + 1 / n) ** n,
    ratioLimit: 1 / Math.E,
    exact: (n) => ({ num: bigFact(n), den: B(n) ** B(n) }),
  },
};

export const GROWTH_IDS = Object.keys(GROWTH) as GrowthId[];

/** −1, 0, 1 as la <, =, > lb, with a relative tolerance of 1e-10 for equality (see Ignored). */
export function cmpLog(la: number, lb: number): -1 | 0 | 1 {
  const tol = 1e-10 * Math.max(1, Math.abs(la), Math.abs(lb));
  if (Math.abs(la - lb) <= tol) return 0;
  return la < lb ? -1 : 1;
}

/**
 * The point from which b stays strictly above a on the window: the smallest m ≥ (both firsts) such that
 * bₙ > aₙ for every m ≤ n ≤ horizon. Null when b is not above a at the horizon itself.
 * For a = n¹⁰, b = 2ⁿ it is 59 (2⁵⁸ < 58¹⁰, 2⁵⁹ > 59¹⁰); for a = n¹⁰, b = 1.1ⁿ it is 686.
 */
export function overtakeFrom(a: GrowthPreset, b: GrowthPreset, horizon: number): number | null {
  const start = Math.max(a.first, b.first);
  if (horizon < start || cmpLog(b.log10(horizon), a.log10(horizon)) <= 0) return null;
  let m = horizon;
  while (m > start && cmpLog(b.log10(m - 1), a.log10(m - 1)) > 0) m--;
  return m;
}

/** Which of the two is larger at n: 1 for a, −1 for b, 0 for equal (within the tolerance). */
export const larger = (a: GrowthPreset, b: GrowthPreset, n: number): -1 | 0 | 1 => cmpLog(a.log10(n), b.log10(n));

/**
 * The point from which the ratio aₙ₊₁/aₙ stays strictly below r on the window: the smallest m ≥ first with
 * ratio(n) < r for every m ≤ n ≤ horizon. Null when ratio(horizon) ≥ r. For 100ⁿ/n! and r = 1 it is 100:
 * the ratio is 100/(n + 1), exactly 1 at n = 99.
 */
export function ratioBelowFrom(p: GrowthPreset, horizon: number, r = 1): number | null {
  const below = (n: number) => p.ratio(n) < r * (1 - 1e-12);
  if (horizon < p.first || !below(horizon)) return null;
  let m = horizon;
  while (m > p.first && below(m - 1)) m--;
  return m;
}

/** log₁₀ x as mantissa·10^exponent with 1 ≤ mantissa < 10, for a readout of a number too large for a double. */
export function fromLog10(l: number): { mant: number; exp: number } {
  let exp = Math.floor(l);
  let mant = 10 ** (l - exp);
  // 10^(0.99999999999) rounds to 10 at three figures: carry it into the exponent
  if (Number(mant.toPrecision(3)) >= 10) {
    mant /= 10;
    exp += 1;
  }
  return { mant, exp };
}

/** The window lengths the figure offers. */
export const WINDOWS = [20, 40, 60, 80, 100, 150, 200, 300, 500, 700, 1000];
