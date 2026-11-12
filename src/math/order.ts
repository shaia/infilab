/**
 * MODEL SPECIFICATION
 *
 * System:        the order axioms of lesson 1.2 at work on two numbers a < b of an ordered field (here: floats on a
 *                grid standing for real numbers). Five maps x ↦ x + c, x ↦ cx, x ↦ 1/x, x ↦ x², x ↦ |x| send a, b to
 *                f(a), f(b), and the module reports whether the order is kept (f(a) < f(b)), reversed (f(a) > f(b)),
 *                collapsed (f(a) = f(b)) or undefined (1/0). Beside the direct comparison, `predictedEffect` gives
 *                the answer the lesson's numbered results give from signs alone (1.2.3, 1.2.4, 1.2.7, 1.2.8, 1.2.12),
 *                so the tests can check that the theorems predict every case the figure can show.
 *                Second part: finite structures, for the evidence behind 1.2.9 and 1.2.10. Every ranking (strict
 *                total order) of ℤ_n = {0, …, n−1} is tested against the axioms (ס3) and (ס4); and the
 *                lexicographic ranking of pairs (a, b) standing for a + bi is tested against (ס4).
 * Dynamics:      none.
 * Boundary:      the figure moves a, b, c on a grid of halves in [−4, 4] (c in [−3, 3]). Sums, products and squares
 *                of halves are multiples of 1/4, and 1/x for x a nonzero half is 2/k for an integer k: every
 *                comparison the figure makes is between numbers that floats hold exactly, or (for 1/x) between
 *                2/k and 2/m, whose order is decided correctly by IEEE division (correctly rounded, monotone).
 * Ignored:       inputs off the grid; they work, but an equality like 0.1 + 0.2 = 0.3 then carries rounding.
 *                ℤ_n arithmetic is exact (integers).
 * Valid when:    every input is finite. The ranking search enumerates n! rankings: n ≤ 7 (5040) is instant.
 * Failure modes: none known on the grid. A numerical comparison here is evidence for the lesson's figure and
 *                tests, never a step of a proof (CLAUDE.md, "A numerical probe never proves").
 */

export type OrderOp = 'add' | 'mul' | 'recip' | 'square' | 'abs';
export type Effect = 'kept' | 'reversed' | 'equal' | 'undefined';

/** f(x) for the chosen map; null where it is undefined (1/0). The parameter c is used by 'add' and 'mul' only. */
export function apply(op: OrderOp, x: number, c = 0): number | null {
  switch (op) {
    case 'add':
      return x + c;
    case 'mul':
      // 0 · x is 0, never −0 (1.1.7): keeps the readout free of "−0"
      return c === 0 || x === 0 ? 0 : c * x;
    case 'recip':
      return x === 0 ? null : 1 / x;
    case 'square':
      return x * x;
    case 'abs':
      return Math.abs(x);
  }
}

/** The relation between two numbers by trichotomy (ס1): −1 for u < v, 0 for u = v, 1 for u > v. */
export const compare = (u: number, v: number): -1 | 0 | 1 => (u < v ? -1 : u > v ? 1 : 0);

export interface OrderResult {
  fa: number | null;
  fb: number | null;
  effect: Effect;
}

/**
 * What the map does to a pair a < b, by direct computation. For a ≥ b the question is not asked: the effect is
 * reported for the pair sorted (min, max), and `sorted` says whether the input was already a < b.
 */
export function orderEffect(op: OrderOp, a: number, b: number, c = 0): OrderResult {
  const fa = apply(op, a, c);
  const fb = apply(op, b, c);
  if (fa === null || fb === null) return { fa, fb, effect: 'undefined' };
  const r = compare(fa, fb);
  return { fa, fb, effect: r < 0 ? 'kept' : r > 0 ? 'reversed' : 'equal' };
}

/** The numbered result of lesson 1.2 that decides the case, and its answer, from signs only. a < b is assumed. */
export function predictedEffect(op: OrderOp, a: number, b: number, c = 0): { effect: Effect; reason: string } {
  if (!(a < b)) throw new RangeError('predictedEffect is about a pair a < b');
  switch (op) {
    case 'add':
      return { effect: 'kept', reason: '(ס3)' };
    case 'mul':
      if (c > 0) return { effect: 'kept', reason: '(ס4)' };
      if (c < 0) return { effect: 'reversed', reason: '1.2.4(א)' };
      return { effect: 'equal', reason: '1.1.7' };
    case 'recip':
      if (a === 0 || b === 0) return { effect: 'undefined', reason: '1.1.7' };
      if (a > 0) return { effect: 'reversed', reason: '1.2.7(ב)' };
      if (b < 0) return { effect: 'reversed', reason: '1.2.7(ג)' };
      return { effect: 'kept', reason: '1.2.7(ד)' };
    case 'square':
    case 'abs': {
      // both reduce to comparing |a| and |b|: 1.2.8(ב),(ג) on |a|, |b| ≥ 0, with |x|² = x² (1.2.12)
      const r = compare(Math.abs(a), Math.abs(b));
      const reason = op === 'square' ? '1.2.8' : '1.2.12';
      return { effect: r < 0 ? 'kept' : r > 0 ? 'reversed' : 'equal', reason };
    }
  }
}

const gcd = (p: number, q: number): number => (q === 0 ? Math.abs(p) : gcd(q, p % q));

/** A number as the figure prints it: −3, 2.5, 0.25; a value 1/x of a half x = k/2 is the exact fraction 2/k. */
export function fmtValue(op: OrderOp, x: number, value: number | null): string {
  if (value === null) return 'לא מוגדר';
  const minus = (s: string) => s.replace(/^-/, '−');
  if (op === 'recip' && Number.isInteger(2 * x)) {
    const k = 2 * x;
    const g = gcd(2, Math.abs(k));
    const num = (k < 0 ? -2 : 2) / g;
    const den = Math.abs(k) / g;
    if (den === 1) return minus(String(num));
    // a fraction with a terminating decimal of at most two places reads better as a decimal (1/2, 1/4)
    if (100 % den === 0) return minus(String(num / den));
    return minus(`${num}/${den}`);
  }
  return minus(String(Number(value.toFixed(4))));
}

/* ---------------------------------------------------------------- absolute value, max, min (definition 1.2.11) */

/** |x| by definition 1.2.11: x for x ≥ 0, −x for x < 0. */
export const absDef = (x: number): number => (x >= 0 ? x : -x);
/** max(a, b) by definition 1.2.11: a when a ≥ b, otherwise b. */
export const maxDef = (a: number, b: number): number => (a >= b ? a : b);
/** min(a, b) by definition 1.2.11: b when a ≥ b, otherwise a. */
export const minDef = (a: number, b: number): number => (a >= b ? b : a);

/* ---------------------------------------------------------------- finite structures: ℤ_n and pairs */

/** r_n(m): the remainder of m on division by n, in {0, …, n−1} (lesson 1.1, definition 1.1.14). */
export const mod = (m: number, n: number): number => ((m % n) + n) % n;

/** All permutations of [0, …, n−1]; a permutation p lists the elements from smallest to largest. */
export function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const p of permutations(n - 1))
    for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
}

/**
 * Does the ranking `p` of ℤ_n (p[0] smallest) satisfy (ס3) and (ס4) with ⊕ and ⊙ mod n? A ranking always satisfies
 * (ס1) and (ס2): it is a list. Returns the first violated axiom with a witness, or null.
 */
export function rankingViolation(n: number, p: number[]): { axiom: 'ס3' | 'ס4'; a: number; b: number; c: number } | null {
  const rank = new Array<number>(n);
  p.forEach((v, i) => (rank[v] = i));
  const lt = (x: number, y: number) => rank[x] < rank[y];
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      if (!lt(a, b)) continue;
      for (let c = 0; c < n; c++) if (!lt(mod(a + c, n), mod(b + c, n))) return { axiom: 'ס3', a, b, c };
      for (let c = 0; c < n; c++) if (lt(0, c) && !lt(mod(a * c, n), mod(b * c, n))) return { axiom: 'ס4', a, b, c };
    }
  return null;
}

/** How many of the n! rankings of ℤ_n satisfy all four order axioms (1.2.10: none, for every n ≥ 2). */
export const compatibleRankings = (n: number): number => permutations(n).filter((p) => rankingViolation(n, p) === null).length;

/** The elements x of ℤ_n with x ⊙ x = n − 1, the square roots of −1 (1.2.9 applies when there is one). */
export const sqrtMinusOne = (n: number): number[] => Array.from({ length: n }, (_, x) => x).filter((x) => mod(x * x, n) === n - 1);

/** k·1 in ℤ_n by the recursion 1·1 = 1, (k+1)·1 = k·1 ⊕ 1 (corollary 1.2.10): equals r_n(k). */
export function multipleOfOne(k: number, n: number): number {
  let s = 1 % n;
  for (let j = 1; j < k; j++) s = mod(s + 1, n);
  return s;
}

/** A pair (re, im) standing for re + im·i; the product follows i² = −1. */
export type Pair = [number, number];
export const pairMul = ([a, b]: Pair, [c, d]: Pair): Pair => [a * c - b * d, a * d + b * c];
/** Lexicographic ranking: first by re, then by im. Satisfies (ס1)–(ס3); 1.2.9 says it cannot satisfy (ס4). */
export const lexLess = ([a, b]: Pair, [c, d]: Pair): boolean => a < c || (a === c && b < d);
