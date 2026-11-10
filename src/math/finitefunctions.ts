/**
 * MODEL SPECIFICATION
 *
 * System:        finite sets A = {0, …, m−1}, B = {0, …, n−1} (and C for a composition), shown with labels,
 *                and a relation from A to B given as a list of arrows (pairs (a, b)). Lesson 0.8's figure asks
 *                of such a relation: is it a function (every element of A has exactly one arrow)? Is the
 *                function injective, surjective? What is its image, the preimage of a point, g∘f, f⁻¹?
 * Dynamics:      none; the learner adds and removes arrows.
 * Boundary:      finite sets only. Every answer here is exact (integer bookkeeping), so on a finite set it is
 *                a complete check, not a probe. It says nothing about an infinite set: a function from ℕ to ℕ
 *                can be injective and not onto (n ↦ 2n), which no function from a finite set to itself can be.
 * Ignored:       nothing numerical; there is no rounding.
 * Valid when:    every arrow (a, b) has 0 ≤ a < m and 0 ≤ b < n.
 * Failure modes: none known; the tests check the counts of all functions, injections, surjections and
 *                bijections between small sets against the closed formulas.
 *
 * Use it to recompute every claim the lesson, the bank or the workbook makes about a finite function, and
 * to drive the figure ArrowDiagram.
 */

/** An arrow from element a of the first set to element b of the second (indices). */
export type Pair = readonly [number, number];

/** A function on {0, …, m−1} as the list of its values: f[i] is the index of f(i) in the target set. */
export type FiniteFn = number[];

const same = (p: Pair, q: Pair) => p[0] === q[0] && p[1] === q[1];

/** A canonical key of a relation: the same arrows in any order give the same key. */
export const relationKey = (pairs: readonly Pair[]): string =>
  [...pairs]
    .map(([a, b]) => `${a}>${b}`)
    .sort()
    .join(',');

/** Add the arrow if it is missing, remove it if it is there (a relation never holds an arrow twice). */
export function toggleArrow(pairs: readonly Pair[], p: Pair): Pair[] {
  return pairs.some((q) => same(p, q)) ? pairs.filter((q) => !same(p, q)) : [...pairs, p];
}

/** How many arrows leave each element of the first set (size m). */
export function outCount(pairs: readonly Pair[], m: number): number[] {
  const c = new Array<number>(m).fill(0);
  for (const [a] of pairs) c[a]++;
  return c;
}

/** How many arrows reach each element of the second set (size n). */
export function inCount(pairs: readonly Pair[], n: number): number[] {
  const c = new Array<number>(n).fill(0);
  for (const [, b] of pairs) c[b]++;
  return c;
}

export interface FunctionCheck {
  /** every element of the first set has exactly one arrow */
  ok: boolean;
  /** elements with no arrow: the rule says nothing about them */
  none: number[];
  /** elements with two arrows or more: the rule gives them more than one value */
  many: number[];
}

/** Is the relation a function from the first set (size m)? And if not, which elements break it, and how. */
export function checkFunction(pairs: readonly Pair[], m: number): FunctionCheck {
  const c = outCount(pairs, m);
  const none = c.flatMap((k, i) => (k === 0 ? [i] : []));
  const many = c.flatMap((k, i) => (k > 1 ? [i] : []));
  return { ok: none.length === 0 && many.length === 0, none, many };
}

/** The relation as a function (its list of values), or null when it is not a function from a set of size m. */
export function asFunction(pairs: readonly Pair[], m: number): FiniteFn | null {
  if (!checkFunction(pairs, m).ok) return null;
  const f = new Array<number>(m).fill(-1);
  for (const [a, b] of pairs) f[a] = b;
  return f;
}

/** The arrows of a function given by its values. */
export const arrowsOf = (f: FiniteFn): Pair[] => f.map((b, a) => [a, b] as const);

/** Every pair i < j with f(i) = f(j): each one is a witness that f is not injective. */
export function collisions(f: FiniteFn): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) if (f[i] === f[j]) out.push([i, j]);
  return out;
}

/** f(i) = f(j) ⇒ i = j, for all i, j. */
export const isInjective = (f: FiniteFn): boolean => collisions(f).length === 0;

/** The image f(A) = { f(x) : x ∈ A }, sorted, without repeats. */
export const image = (f: FiniteFn): number[] => [...new Set(f)].sort((a, b) => a - b);

/** The image of a part S of the domain: f(S) = { f(x) : x ∈ S }. */
export const imageOf = (f: FiniteFn, S: readonly number[]): number[] => [...new Set(S.map((x) => f[x]))].sort((a, b) => a - b);

/** The elements of the target set (size n) that f never reaches: each one is a witness that f is not onto. */
export function missed(f: FiniteFn, n: number): number[] {
  const hit = new Set(f);
  return Array.from({ length: n }, (_, y) => y).filter((y) => !hit.has(y));
}

/** For every y in the target set (size n) there is x with f(x) = y. */
export const isSurjective = (f: FiniteFn, n: number): boolean => missed(f, n).length === 0;

/** Every x with f(x) = y: the preimages (מקורות) of the point y. */
export const preimage = (f: FiniteFn, y: number): number[] => f.flatMap((v, x) => (v === y ? [x] : []));

/** The preimage of a set: f⁻¹(Y) = { x : f(x) ∈ Y }. Defined for every function, invertible or not. */
export const preimageOf = (f: FiniteFn, Y: readonly number[]): number[] => f.flatMap((v, x) => (Y.includes(v) ? [x] : []));

/** g∘f: first f, then g. Needs every value of f to lie in the domain of g. */
export function compose(g: FiniteFn, f: FiniteFn): FiniteFn {
  return f.map((y) => {
    if (y < 0 || y >= g.length) throw new Error(`compose: f takes the value ${y}, outside the domain of g`);
    return g[y];
  });
}

/** The identity of a set of size m. */
export const identity = (m: number): FiniteFn => Array.from({ length: m }, (_, i) => i);

/** Every arrow reversed: the relation from the second set back to the first. */
export const flip = (pairs: readonly Pair[]): Pair[] => pairs.map(([a, b]) => [b, a] as const);

/**
 * The inverse of f: A → B (|B| = n), or null when it has none. The reversed arrows form a function from B
 * exactly when every y ∈ B has exactly one preimage, i.e. when f is injective (at most one) and onto (at least
 * one); this is that check.
 */
export function inverse(f: FiniteFn, n: number): FiniteFn | null {
  return asFunction(flip(arrowsOf(f)), n);
}

/** Every function from a set of size m to a set of size n, as lists of values (nᵐ of them). */
export function* allFunctions(m: number, n: number): Generator<FiniteFn> {
  if (n === 0) {
    if (m === 0) yield [];
    return;
  }
  const f = new Array<number>(m).fill(0);
  while (true) {
    yield [...f];
    let i = m - 1;
    while (i >= 0 && f[i] === n - 1) f[i--] = 0;
    if (i < 0) return;
    f[i]++;
  }
}

/* ------------------------------------------------------------------ presets of the figure */

export type DiagramId = 'not-function' | 'square' | 'square-half' | 'three-four' | 'four-three' | 'bijection' | 'compose';

export interface DiagramPreset {
  /** button label; a formula is wrapped in LRI … PDI so the RTL control panel does not reverse it */
  name: string;
  /** labels of the elements of A, B (and C), top to bottom */
  A: string[];
  B: string[];
  C?: string[];
  /** the arrows the preset starts with: f from A to B, g from B to C */
  f: Pair[];
  g?: Pair[];
}

export const DIAGRAMS: Record<DiagramId, DiagramPreset> = {
  // 1 has two arrows and 2 has none: two ways a rule fails to be a function
  'not-function': { name: 'לא פונקציה', A: ['1', '2', '3'], B: ['a', 'b', 'c', 'd'], f: [[0, 0], [0, 1], [2, 2]] },
  // x ↦ x² from {−2, …, 2} to {0, …, 4}: neither injective (−1, 1 ↦ 1) nor onto (2, 3 are missed)
  square: {
    name: '⁦x²⁩',
    A: ['−2', '−1', '0', '1', '2'],
    B: ['0', '1', '2', '3', '4'],
    f: [[0, 4], [1, 1], [2, 0], [3, 1], [4, 4]],
  },
  // the same rule on {0, 1, 2}: injective now, still not onto
  'square-half': { name: '⁦x²⁩ על {0,1,2}', A: ['0', '1', '2'], B: ['0', '1', '2', '3', '4'], f: [[0, 0], [1, 1], [2, 4]] },
  // three elements into four: a function, not injective; an injective one can never be onto
  'three-four': { name: '3 אל 4', A: ['1', '2', '3'], B: ['a', 'b', 'c', 'd'], f: [[0, 0], [1, 0], [2, 2]] },
  // four into three: a function, neither injective nor onto; an onto one can never be injective
  'four-three': { name: '4 אל 3', A: ['1', '2', '3', '4'], B: ['a', 'b', 'c'], f: [[0, 0], [1, 1], [2, 0], [3, 1]] },
  // three into three, neither injective nor onto: fix it into a bijection and flip it
  bijection: { name: '3 אל 3', A: ['1', '2', '3'], B: ['a', 'b', 'c'], f: [[0, 1], [1, 1], [2, 0]] },
  // f: A → B injective, g: B → C onto and never injective (|B| > |C|); g∘f sends 1 and 2 both to p
  compose: {
    name: 'הרכבה',
    A: ['1', '2'],
    B: ['a', 'b', 'c'],
    C: ['p', 'q'],
    f: [[0, 0], [1, 1]],
    g: [[0, 0], [1, 0], [2, 1]],
  },
};
