/** The integer arithmetic behind lesson 1.3's figure RationalProbe, filed by accuracy category. */

import { describe, expect, it } from 'vitest';
import {
  DESCENT_STARTS,
  SETS,
  checkAt,
  closestNumerator,
  descentChain,
  descentStep,
  divmod,
  firstBreak,
  gcd,
  inSet,
  isSquare,
  isqrt,
  pellError,
  probe,
  type SetId,
} from '~/math/rationals';

/** the quarter grid the figure uses, over its window */
const GRID = Array.from({ length: 41 }, (_, i) => -1 + i / 4);

describe('exact identities: the descent of theorem 1.3.16', () => {
  it('(n b − m a)² − n r² = −(n − m²)(a² − n b²) for every a/b with a = m b + r, n ≤ 12, b ≤ 40', () => {
    for (let n = 1; n <= 12; n++)
      for (let b = 1; b <= 40; b++)
        for (let a = 0; a <= 6 * b; a++) {
          const { m, r } = divmod(a, b);
          const lhs = (n * b - m * a) ** 2 - n * r * r;
          // `+ 0` turns −0 into 0: the identity is between integers
          expect(lhs, `n=${n} a/b=${a}/${b}`).toBe(-(n - m * m) * (a * a - n * b * b) + 0);
        }
  });
  it('the step keeps the value of a/b exactly when a² = n b² (the hypothesis of the theorem)', () => {
    for (let n = 1; n <= 12; n++)
      for (let b = 1; b <= 30; b++)
        for (let a = 1; a <= 5 * b; a++) {
          const { m, r } = divmod(a, b);
          if (r === 0) continue;
          const same = (n * b - m * a) * b === a * r;
          expect(same, `n=${n} ${a}/${b}`).toBe(a * a === n * b * b);
        }
  });
  it('for n = 2 and 1 < a/b < 2 the step is a/b ↦ (2b − a)/(a − b) and keeps |a² − 2b²|', () => {
    for (let b = 2; b <= 60; b++)
      for (let a = b + 1; a < 2 * b; a++) {
        const next = descentStep(a, b, 2)!;
        expect(next).toEqual({ a: 2 * b - a, b: a - b });
        expect(Math.abs(pellError(next.a, next.b, 2))).toBe(Math.abs(pellError(a, b, 2)));
      }
  });
});

describe('analytic results: the chains the lesson quotes', () => {
  it('577/408 descends through the convergents of √2 to the integer 1, E alternating ±1', () => {
    const chain = descentChain(577, 408, 2);
    expect(chain.map((s) => `${s.a}/${s.b}`)).toEqual(['577/408', '239/169', '99/70', '41/29', '17/12', '7/5', '3/2', '1/1']);
    expect(chain.map((s) => s.E)).toEqual([1, -1, 1, -1, 1, -1, 1, -1]);
    expect(chain.at(-1)!.r).toBe(0);
  });
  it('26/15 for n = 3 descends to the integer 2 with E multiplied by −2 at each step', () => {
    const chain = descentChain(26, 15, 3);
    expect(chain.map((s) => `${s.a}/${s.b}`)).toEqual(['26/15', '19/11', '14/8', '10/6', '8/4']);
    expect(chain.map((s) => s.E)).toEqual([1, -2, 4, -8, 16]);
  });
  it('every offered start has |p² − n q²| = 1 and a strictly decreasing chain of denominators ending in an integer', () => {
    for (const [n, starts] of Object.entries(DESCENT_STARTS))
      for (const [a, b] of starts) {
        expect(Math.abs(pellError(a, b, Number(n)))).toBe(1);
        expect(gcd(a, b)).toBe(1);
        const chain = descentChain(a, b, Number(n));
        for (let i = 1; i < chain.length; i++) expect(chain[i].b).toBeLessThan(chain[i - 1].b);
        expect(chain.at(-1)!.r).toBe(0);
      }
  });
  it('(577/408)² = 2 + 1/166464: the hook', () => {
    expect(577 * 577).toBe(332929);
    expect(2 * 408 * 408).toBe(332928);
    expect(408 * 408).toBe(166464);
  });
});

describe('convergence of the probe: p² − n q² over q ≤ 1000 (evidence, not proof)', () => {
  it('for n = 2, 3, 5, 8 no q ≤ 1000 gives E = 0 (theorem 1.3.15 and corollary 1.3.17 are the proof)', () => {
    for (const n of [2, 3, 5, 8]) expect(probe(n, 1000).some((s) => s.E === 0), `n=${n}`).toBe(false);
  });
  it('for the squares n = 1, 4, 9 every q gives E = 0, with p = q·√n', () => {
    for (const [n, k] of [[1, 1], [4, 2], [9, 3]]) for (const s of probe(n, 200)) expect([s.p, s.E]).toEqual([k * s.q, 0]);
  });
  it('the q ≤ 60 with |p² − 2q²| = 1 are exactly 1, 2, 5, 12, 29 (the figure\'s task)', () => {
    expect(probe(2, 60).filter((s) => Math.abs(s.E) === 1).map((s) => s.q)).toEqual([1, 2, 5, 12, 29]);
  });
  it('the nearest numerator is nearest: no other p beats it, compared exactly through (2p + 1)² against 4 n q²', () => {
    for (const n of [2, 3, 5, 7]) {
      for (let q = 1; q <= 300; q++) {
        const p = closestNumerator(q, n);
        expect(Math.abs(p / q - Math.sqrt(n))).toBeLessThanOrEqual(1 / (2 * q) + 1e-12);
      }
    }
  });
  it('isqrt is the exact floor of the square root, and isSquare agrees with it', () => {
    for (let N = 0; N <= 20000; N++) {
      const s = isqrt(N);
      expect(s * s <= N && (s + 1) * (s + 1) > N).toBe(true);
    }
    expect([1, 2, 3, 4, 5, 8, 9, 12, 16].map(isSquare)).toEqual([true, false, false, true, false, false, true, false, true]);
  });
});

describe('exact identities: inductive sets at the figure\'s points', () => {
  it('1 belongs to every preset', () => {
    for (const s of Object.values(SETS)) expect(inSet(s, 1), s.id).toBe(true);
  });
  it('the presets proved inductive never break the step on the grid; the others break where the lesson says', () => {
    const expected: Record<SetId, number | null> = { ray: null, pos: null, gap: null, nat: null, 'nat-half': null, short: 4.25, skip: 1, stray: 1.5 };
    for (const s of Object.values(SETS)) {
      expect(firstBreak(s), s.id).toBe(expected[s.id]);
      expect(firstBreak(s) === null, s.id).toBe(s.inductive);
    }
  });
  it('membership: ℕ ∪ {3/2} has 3/2 but not 5/2; [1, 5] has 5 and 4.5 but not 6 or 5.5; {1} ∪ [2, ∞) misses (1, 2)', () => {
    expect(checkAt(SETS.stray, 1.5)).toEqual({ hasOne: true, xIn: true, nextIn: false, breaks: true });
    expect(checkAt(SETS.short, 5).breaks && checkAt(SETS.short, 4.5).breaks).toBe(true);
    expect(checkAt(SETS.short, 4).breaks).toBe(false);
    for (const x of GRID.filter((t) => t > 1 && t < 2)) expect(inSet(SETS.gap, x)).toBe(false);
    for (const x of GRID) if (inSet(SETS.nat, x)) expect(inSet(SETS.gap, x) && inSet(SETS.ray, x) && inSet(SETS['nat-half'], x)).toBe(true);
  });
});
