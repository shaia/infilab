/**
 * MODEL SPECIFICATION
 *
 * System:        solution sets of the absolute-value inequalities of lesson 0.9, as unions of intervals with
 *                exact endpoints and open or closed ends: |x − a| ρ r and |x − a| + |x − b| ρ c, where ρ is one
 *                of <, ≤, >, ≥; and the two sides of the triangle inequality |x + y| ≤ |x| + |y|, its reverse
 *                form ||x| − |y|| ≤ |x − y|, and the two means (a + b)/2 and √(ab).
 * Dynamics:      none.
 * Boundary:      the solution sets are derived by cases, as the lesson solves them, not found numerically: the
 *                endpoints are a ± r and (a + b ± c)/2. The figure moves a, b, r, c, x, y on a grid of halves, so
 *                every endpoint is a multiple of 1/4 and exact in binary floating point; equality tests on them
 *                (an endpoint, the equality case of the triangle inequality) are exact.
 * Ignored:       inputs off the grid of halves. They work, but an endpoint like 0.1 + 0.2 then carries the
 *                usual rounding, and `contains` at such an endpoint can go either way.
 * Valid when:    every input is finite; r and c may be any real number (a negative radius gives ∅ or ℝ).
 * Failure modes: none known on the grid; `contains` is the definition (|x − a| ρ r evaluated directly) only
 *                up to rounding off the grid, which the tests compare against on dyadic points.
 */

export type Rel = '<' | '<=' | '>' | '>=';

/** An interval of ℝ. lo may be −∞ and hi +∞ (an infinite end is always open). lo ≤ hi; lo = hi only for [a, a]. */
export interface Interval {
  lo: number;
  hi: number;
  loClosed: boolean;
  hiClosed: boolean;
}

/** A finite union of pairwise disjoint, non-adjacent intervals, sorted left to right; [] is ∅. */
export type IntervalSet = Interval[];

export const REAL_LINE: IntervalSet = [{ lo: -Infinity, hi: Infinity, loClosed: false, hiClosed: false }];

const iv = (lo: number, hi: number, loClosed: boolean, hiClosed: boolean): Interval => ({
  lo,
  hi,
  loClosed: loClosed && Number.isFinite(lo),
  hiClosed: hiClosed && Number.isFinite(hi),
});

/** x ∈ I. */
export const inInterval = (I: Interval, x: number): boolean =>
  (I.loClosed ? x >= I.lo : x > I.lo) && (I.hiClosed ? x <= I.hi : x < I.hi);

/** x ∈ S. */
export const contains = (S: IntervalSet, x: number): boolean => S.some((I) => inInterval(I, x));

/**
 * ℝ ∖ S. Between two intervals the gap takes each shared endpoint with the opposite end type: the complement of
 * [−3, 1) ∪ (2, 5] is (−∞, −3) ∪ [1, 2] ∪ (5, ∞).
 */
export function complement(S: IntervalSet): IntervalSet {
  const out: IntervalSet = [];
  let lo = -Infinity;
  let loClosed = false;
  for (const I of S) {
    // the gap before I: from the previous end up to I.lo
    if (I.lo > lo || (I.lo === lo && loClosed && !I.loClosed)) out.push(iv(lo, I.lo, loClosed, !I.loClosed));
    lo = I.hi;
    loClosed = !I.hiClosed;
  }
  if (lo < Infinity) out.push(iv(lo, Infinity, loClosed, false));
  return out;
}

/** True when the relation holds between two numbers: holds(3, '<', 5). */
export const holds = (u: number, rel: Rel, v: number): boolean =>
  rel === '<' ? u < v : rel === '<=' ? u <= v : rel === '>' ? u > v : u >= v;

/**
 * The solution set of |x − a| ρ r, by the lesson's rule: |t| < r ⇔ −r < t < r (one interval, "and"),
 * |t| > r ⇔ t > r or t < −r (two intervals, "or"); the ≤, ≥ forms close the ends.
 * r < 0: |t| < r and |t| ≤ r have no solution, |t| > r and |t| ≥ r hold for every t.
 * r = 0: |t| < 0 is ∅, |t| ≤ 0 is {0}, |t| > 0 is t ≠ 0, |t| ≥ 0 is ℝ.
 */
export function solveAbs(a: number, r: number, rel: Rel): IntervalSet {
  if (rel === '<') return r > 0 ? [iv(a - r, a + r, false, false)] : [];
  if (rel === '<=') return r >= 0 ? [iv(a - r, a + r, true, true)] : [];
  // |x − a| > r is the complement of |x − a| ≤ r, and |x − a| ≥ r the complement of |x − a| < r
  return complement(solveAbs(a, r, rel === '>' ? '<=' : '<'));
}

/** The minimum over x of |x − a| + |x − b|: |a − b|, attained at every x between a and b. */
export const minSumDist = (a: number, b: number) => Math.abs(a - b);

/**
 * The solution set of |x − a| + |x − b| ρ c, by cases on the points a and b. With lo = min(a, b), hi = max(a, b):
 * for x < lo the sum is lo + hi − 2x, between them it is the constant hi − lo, for x > hi it is 2x − lo − hi.
 * So the sublevel set {sum < c} is the open interval ((a + b − c)/2, (a + b + c)/2) when c > |a − b| and empty
 * otherwise; {sum ≤ c} is the closed one when c ≥ |a − b| (when c = |a − b| it is exactly [lo, hi]).
 */
export function solveSumDist(a: number, b: number, c: number, rel: Rel): IntervalSet {
  const d = minSumDist(a, b);
  const lo = (a + b - c) / 2;
  const hi = (a + b + c) / 2;
  const below = (strict: boolean): IntervalSet => (strict ? (c > d ? [iv(lo, hi, false, false)] : []) : c >= d ? [iv(lo, hi, true, true)] : []);
  if (rel === '<') return below(true);
  if (rel === '<=') return below(false);
  return complement(rel === '>' ? below(false) : below(true));
}

/** The two sides of the triangle inequality, and whether it is an equality. Equality ⇔ xy ≥ 0 (the lesson's theorem). */
export function triangle(x: number, y: number) {
  const lhs = Math.abs(x + y);
  const rhs = Math.abs(x) + Math.abs(y);
  return { lhs, rhs, equal: lhs === rhs, sameSign: x * y >= 0 };
}

/** The two sides of the reverse triangle inequality ||x| − |y|| ≤ |x − y|. */
export function reverseTriangle(x: number, y: number) {
  return { lhs: Math.abs(Math.abs(x) - Math.abs(y)), rhs: Math.abs(x - y) };
}

/** The arithmetic and geometric means of a, b ≥ 0 (AM ≥ GM, with equality ⇔ a = b). */
export function means(a: number, b: number) {
  if (a < 0 || b < 0) throw new RangeError('the AM-GM inequality is about a, b ≥ 0');
  return { am: (a + b) / 2, gm: Math.sqrt(a * b) };
}

/** A typographic number: −3, 2.5, 0.25 (the figure's endpoints are multiples of 1/4, so this is exact). */
export function fmtNum(v: number): string {
  if (v === Infinity) return '∞';
  if (v === -Infinity) return '−∞';
  const s = String(Number(v.toFixed(4)));
  return s.replace(/^-/, '−');
}

/** An interval in the course's notation: (−1, 5), [−3, −1], (−∞, 1], {2}. */
export function fmtInterval(I: Interval): string {
  if (I.lo === I.hi) return `{${fmtNum(I.lo)}}`;
  return `${I.loClosed ? '[' : '('}${fmtNum(I.lo)}, ${fmtNum(I.hi)}${I.hiClosed ? ']' : ')'}`;
}

/** A union of intervals: ∅, ℝ, or the intervals joined by ∪. */
export function fmtSet(S: IntervalSet): string {
  if (S.length === 0) return '∅';
  if (S.length === 1 && S[0].lo === -Infinity && S[0].hi === Infinity) return 'ℝ';
  return S.map(fmtInterval).join(' ∪ ');
}

/** The relation as printed: <, ≤, >, ≥. */
export const REL_SIGN: Record<Rel, string> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' };
