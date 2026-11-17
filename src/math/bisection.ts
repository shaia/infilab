/**
 * MODEL SPECIFICATION
 *
 * System:        the bisection proof of the Bolzano–Weierstrass theorem (lesson 2.9, משפט 2.9.8) on a bounded
 *                sequence: a closed interval I₀ = [α₀, β₀] holding every term, halved again and again into two closed
 *                halves; the kept half I_{k+1} is the one the student (or the proof's rule) picks; the indices
 *                n₁ < n₂ < … with a_{n_k} ∈ I_k are chosen greedily (the smallest admissible index, as in the proof).
 *                Also the peaks of lemma 2.9.9: places m with a_m ≥ aₙ for every n > m.
 * Dynamics:      none. A path is a string of choices, '0' = the lower half [α, m], '1' = the upper half [m, β].
 * Boundary:      every count runs over the finite window 1 ≤ n ≤ W (W = WINDOW = 100 000). "Infinitely many terms
 *                in I" cannot be seen on a window; the figure shows two numbers instead: how many n ≤ W have aₙ ∈ I,
 *                and how many of them lie in the second half of the window, W/2 < n ≤ W (`late`). A half with
 *                late = 0 *looks* finite. This is evidence, never proof: (−1)ⁿ + 1/n has exactly 2^{k−3} terms in
 *                the upper half of I_k on the path toward −1 (all with n < 2^{k−1}), and the lesson proves why.
 *                Peaks likewise are peaks of the window: a_m ≥ aₙ for m < n ≤ W.
 * Ignored:       exact arithmetic for the fractional part of n√2 (a double; its error, about n·10⁻¹⁶, can move a
 *                term across a dyadic endpoint, which changes a count by one and nothing else). The endpoints are
 *                dyadic rationals of I₀'s endpoints and are exact in floating point, as are the terms of the other
 *                presets that sit on an endpoint (1 + 1/2ʲ, 0, 1, 2), so a closed interval contains its endpoints
 *                exactly.
 * Valid when:    the depth k ≤ K_MAX = 10: then the late half of the window still holds terms of every half that
 *                holds infinitely many (tested for the n√2 preset on all 2048 dyadic intervals of length 2⁻¹¹).
 * Failure modes: a half whose terms all come after n = W looks empty; a sequence whose terms enter a half only
 *                after the window looks finite there. The window is large so that neither happens in the presets.
 */

export type BisectionId = 'alt-recip' | 'frac-sqrt2' | 'mod3';

export interface Interval {
  lo: number;
  hi: number;
}

export interface BisectionPreset {
  /** button label; a formula is wrapped in LRI … PDI so the RTL control panel does not reverse it */
  name: string;
  /** the formula as plain text for captions and the aria label */
  formula: string;
  a: (n: number) => number;
  /** the first interval: it holds every term (a bound of the sequence, made closed) */
  I0: Interval;
  /** the value axis of the graph */
  y: [number, number];
}

export const WINDOW = 100_000;
export const K_MAX = 10;

/** the fractional part x − ⌊x⌋ */
const frac = (x: number) => x - Math.floor(x);

export const PRESETS: Record<BisectionId, BisectionPreset> = {
  // partial limits −1 and 1; |aₙ| ≤ 3/2 ≤ 2
  'alt-recip': {
    name: '⁦(−1)ⁿ + 1/n⁩',
    formula: 'aₙ = (−1)ⁿ + 1/n',
    a: (n) => (-1) ** n + 1 / n,
    I0: { lo: -2, hi: 2 },
    y: [-2.15, 2.15],
  },
  // the window suggests that every point of [0, 1] is a partial limit; the course does not prove it (Kronecker's
  // theorem, a later course), and the lesson presents it only as evidence and uses it nowhere
  'frac-sqrt2': {
    name: 'החלק השברי של ⁦n√2⁩',
    formula: 'aₙ = n√2 − ⌊n√2⌋',
    a: (n) => frac(n * Math.SQRT2),
    I0: { lo: 0, hi: 1 },
    y: [-0.08, 1.08],
  },
  // the remainder of n on division by 3: 1, 2, 0, 1, 2, 0, … ; partial limits 0, 1, 2
  mod3: {
    name: 'השארית של n בחלוקה ב-3',
    formula: 'aₙ = השארית של n בחלוקה ב-3',
    a: (n) => n % 3,
    I0: { lo: 0, hi: 2 },
    y: [-0.15, 2.15],
  },
};

const cache = new Map<BisectionId, Float64Array>();

/** The terms a₁ … a_W in an array indexed by n (index 0 unused), computed once per preset. */
export function termsOf(id: BisectionId): Float64Array {
  let v = cache.get(id);
  if (!v) {
    const a = PRESETS[id].a;
    v = new Float64Array(WINDOW + 1);
    for (let n = 1; n <= WINDOW; n++) v[n] = a(n);
    cache.set(id, v);
  }
  return v;
}

export const inInterval = (x: number, I: Interval) => I.lo <= x && x <= I.hi;
export const midpoint = (I: Interval) => (I.lo + I.hi) / 2;
export const lengthOf = (I: Interval) => I.hi - I.lo;

/** The two closed halves [lo, m] and [m, hi]; they share the midpoint m. */
export function halves(I: Interval): [Interval, Interval] {
  const m = midpoint(I);
  return [
    { lo: I.lo, hi: m },
    { lo: m, hi: I.hi },
  ];
}

/** A path is valid when it is made of '0' (lower half) and '1' (upper half) and is at most K_MAX long. */
export const validPath = (path: string) => /^[01]*$/.test(path) && path.length <= K_MAX;

/** I₀, I₁, …, I_k for a path of k choices. */
export function intervalsOf(I0: Interval, path: string): Interval[] {
  const out = [I0];
  for (const c of path) out.push(halves(out[out.length - 1])[c === '1' ? 1 : 0]);
  return out;
}

export interface Count {
  /** #{n ≤ W : aₙ ∈ I} */
  total: number;
  /** #{W/2 < n ≤ W : aₙ ∈ I}: zero means "looks finite" */
  late: number;
  /** the largest n ≤ W with aₙ ∈ I, or null */
  last: number | null;
}

/** How many terms of the window lie in the closed interval I, how many of them late, and the last one. */
export function countIn(terms: Float64Array, I: Interval): Count {
  const W = terms.length - 1;
  const half = Math.floor(W / 2);
  let total = 0;
  let late = 0;
  let last: number | null = null;
  for (let n = 1; n <= W; n++) {
    if (inInterval(terms[n], I)) {
      total++;
      if (n > half) late++;
      last = n;
    }
  }
  return { total, late, last };
}

/** The window's evidence for "infinitely many": some term in the second half of the window. */
export const looksInfinite = (c: Count) => c.late > 0;

/**
 * The indices of the proof: n₁ is the smallest n with aₙ ∈ I₁, and n_{k+1} the smallest n > n_k with aₙ ∈ I_{k+1}.
 * `intervals` is I₀, I₁, …, I_k (I₀ is skipped: it holds every term). An index that does not exist in the window is
 * null, and so is every one after it.
 */
export function pickIndices(terms: Float64Array, intervals: Interval[]): (number | null)[] {
  const W = terms.length - 1;
  const out: (number | null)[] = [];
  let prev = 0;
  for (let k = 1; k < intervals.length; k++) {
    let found: number | null = null;
    for (let n = prev + 1; n <= W; n++) {
      if (inInterval(terms[n], intervals[k])) {
        found = n;
        break;
      }
    }
    out.push(found);
    if (found === null) {
      for (let j = k + 1; j < intervals.length; j++) out.push(null);
      break;
    }
    prev = found;
  }
  return out;
}

/** The proof's rule on the window: keep the lower half when it looks infinite, otherwise the upper half. */
export function proofPath(terms: Float64Array, I0: Interval, depth: number): string {
  let path = '';
  let I = I0;
  for (let k = 0; k < depth; k++) {
    const [lo, hi] = halves(I);
    const c = looksInfinite(countIn(terms, lo)) ? '0' : '1';
    path += c;
    I = c === '0' ? lo : hi;
  }
  return path;
}

/**
 * Peaks of the window (lemma 2.9.9): m ≤ upTo is a peak when a_m ≥ aₙ for every m < n ≤ W. One pass from the end
 * keeps the running maximum of the later terms.
 */
export function windowPeaks(terms: Float64Array, upTo: number): boolean[] {
  const W = terms.length - 1;
  const peak: boolean[] = new Array(upTo + 1).fill(false);
  let laterMax = -Infinity;
  for (let m = W; m >= 1; m--) {
    if (m <= upTo) peak[m] = terms[m] >= laterMax;
    laterMax = Math.max(laterMax, terms[m]);
  }
  return peak;
}
