/** The solution sets and inequalities behind lesson 0.7's figure, filed by accuracy category. */

import { describe, expect, it } from 'vitest';
import {
  REAL_LINE,
  complement,
  contains,
  fmtSet,
  holds,
  means,
  minSumDist,
  reverseTriangle,
  solveAbs,
  solveSumDist,
  triangle,
  type Rel,
} from '~/math/absval';

const RELS: Rel[] = ['<', '<=', '>', '>='];
/** the figure's grid: halves from −7 to 7 */
const HALVES = Array.from({ length: 29 }, (_, i) => -7 + i / 2);
/** probe points on a finer dyadic grid (eighths), so every endpoint the figure can produce is hit exactly */
const PROBES = Array.from({ length: 16 * 8 * 2 + 1 }, (_, i) => -16 + i / 8);

describe('exact identities: solution sets by cases agree with the definition at every probe point', () => {
  it('|x − a| ρ r, for every relation, centre and radius on the grid (negative and zero radii included)', () => {
    for (const a of HALVES.filter((_, i) => i % 3 === 0))
      for (const r of [-1, -0.5, 0, 0.5, 1, 2.5, 4])
        for (const rel of RELS) {
          const S = solveAbs(a, r, rel);
          for (const x of PROBES) expect(contains(S, x), `|${x} − ${a}| ${rel} ${r}`).toBe(holds(Math.abs(x - a), rel, r));
        }
  });
  it('|x − a| + |x − b| ρ c, including c below, at and above |a − b|', () => {
    for (const [a, b] of [[1, -2], [0, 2], [-1, 3.5], [2, 2], [-3, -0.5]])
      for (const c of [0, 1, 2.5, 3, 3.5, 5, 7])
        for (const rel of RELS) {
          const S = solveSumDist(a, b, c, rel);
          for (const x of PROBES) expect(contains(S, x), `|x−${a}|+|x−${b}| ${rel} ${c} at ${x}`).toBe(holds(Math.abs(x - a) + Math.abs(x - b), rel, c));
        }
  });
  it('the complement of a union of intervals swaps every end type, and complementing twice gives the set back', () => {
    const S = [...solveAbs(-1, 2, '<='), ...solveAbs(4, 0.5, '<')];
    expect(fmtSet(S)).toBe('[−3, 1] ∪ (3.5, 4.5)');
    expect(fmtSet(complement(S))).toBe('(−∞, −3) ∪ (1, 3.5] ∪ [4.5, ∞)');
    expect(complement(complement(S))).toEqual(S);
    expect(complement([])).toEqual(REAL_LINE);
    expect(complement(REAL_LINE)).toEqual([]);
  });
});

describe('exact identities: the numbers the lesson, its bank and its workbook quote', () => {
  it('|x − 3| < 2 is (1, 5), and |x + 2| ≤ 1 is [−3, −1] (the bank’s Q-0.7-abs-less, Q-0.7-abs-distance)', () => {
    expect(fmtSet(solveAbs(3, 2, '<'))).toBe('(1, 5)');
    expect(fmtSet(solveAbs(-2, 1, '<='))).toBe('[−3, −1]');
  });
  it('|2x + 1| ≥ 3 is |x + 1/2| ≥ 3/2: (−∞, −2] ∪ [1, ∞) (Q-0.7-abs-greater)', () => {
    expect(fmtSet(solveAbs(-0.5, 1.5, '>='))).toBe('(−∞, −2] ∪ [1, ∞)');
  });
  it('the band (−1, 5) of the figure’s task is centre 2, radius 3, strict', () => {
    expect(fmtSet(solveAbs(2, 3, '<'))).toBe('(−1, 5)');
    expect(fmtSet(solveAbs(2, 3, '<='))).toBe('[−1, 5]');
  });
  it('the hook: |x − 1| < 1 is (0, 2), on which |x − 3| takes exactly the values in (1, 3)', () => {
    expect(fmtSet(solveAbs(1, 1, '<'))).toBe('(0, 2)');
    const S = solveAbs(1, 1, '<');
    const dists = PROBES.filter((x) => contains(S, x)).map((x) => Math.abs(x - 3));
    expect(Math.max(...dists)).toBeLessThan(3);
    expect(Math.min(...dists)).toBeGreaterThan(1);
  });
  it('|x − 1| + |x + 2| < 5 is (−3, 2), of length 5 (Q-0.7-two-terms); ≤ 4 around ±1 is [−2, 2] (Q-0-exam-3)', () => {
    expect(fmtSet(solveSumDist(1, -2, 5, '<'))).toBe('(−3, 2)');
    expect(fmtSet(solveSumDist(1, -1, 4, '<='))).toBe('[−2, 2]');
  });
  it('|x| + |x − 2| = 2 exactly on [0, 2]: the sum is at least 2 = |0 − 2|, with equality between the points (Q-0-review-14)', () => {
    expect(minSumDist(0, 2)).toBe(2);
    expect(fmtSet(solveSumDist(0, 2, 2, '<='))).toBe('[0, 2]');
    expect(fmtSet(solveSumDist(0, 2, 2, '<'))).toBe('∅');
  });
  it('the largest c with an empty {|x − a| + |x − b| < c} is |a − b| (the figure’s two-distances task)', () => {
    for (const [a, b] of [[1, -2], [0, 2], [-1, 3.5]]) {
      const d = minSumDist(a, b);
      expect(solveSumDist(a, b, d, '<')).toEqual([]);
      expect(solveSumDist(a, b, d + 0.5, '<').length).toBe(1);
    }
  });
});

describe('analytic identities: the triangle inequality, its reverse form and the means', () => {
  it('|x + y| ≤ |x| + |y| on the grid, with equality exactly when xy ≥ 0', () => {
    for (const x of HALVES)
      for (const y of HALVES) {
        const t = triangle(x, y);
        expect(t.lhs).toBeLessThanOrEqual(t.rhs);
        expect(t.equal, `x = ${x}, y = ${y}`).toBe(t.sameSign);
      }
  });
  it('||x| − |y|| ≤ |x − y| on the grid, with equality exactly when xy ≥ 0', () => {
    for (const x of HALVES)
      for (const y of HALVES) {
        const t = reverseTriangle(x, y);
        expect(t.lhs).toBeLessThanOrEqual(t.rhs);
        expect(t.lhs === t.rhs, `x = ${x}, y = ${y}`).toBe(x * y >= 0);
      }
  });
  it('(a + b)/2 ≥ √(ab) for a, b ≥ 0 on the grid, with equality exactly when a = b; negative inputs are refused', () => {
    for (const a of HALVES.filter((v) => v >= 0))
      for (const b of HALVES.filter((v) => v >= 0)) {
        const { am, gm } = means(a, b);
        if (a === b) expect(gm).toBeCloseTo(am, 12);
        else expect(am - gm).toBeGreaterThan(1e-9);
      }
    // a = b = −1: ab = 1 ≥ 0 but (a + b)/2 = −1 < 1 = √(ab) (Q-0.7-amgm-sign)
    expect(() => means(-1, -1)).toThrow(RangeError);
  });
  it('x + 9/x ≥ 6 for x > 0, with equality at x = 3 (Q-0.7-amgm-min)', () => {
    for (let k = 1; k <= 400; k++) {
      const x = k / 40;
      expect(x + 9 / x).toBeGreaterThanOrEqual(6 - 1e-12);
    }
    expect(3 + 9 / 3).toBe(6);
  });
});
