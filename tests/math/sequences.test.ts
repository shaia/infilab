/** The ε-N bookkeeping behind lesson 2.2's figure, filed by accuracy category. */

import { describe, expect, it } from 'vitest';
import { EPSILONS, SEQUENCES, inBand, outsideAfter, smallestN } from '~/math/sequences';

/** long enough for 1/√n at the narrowest ε: N = 1/ε² = 40000 */
const H = 100_000;

describe('analytic limits', () => {
  it('for 1/n the definition’s N is ⌊1/ε⌋ (1/n < ε ⇔ n > 1/ε), so N = 100 for ε = 0.01', () => {
    expect(smallestN(SEQUENCES.recip.a, 0, 0.01)).toBe(100);
    // |aₙ| < ε ⇔ n > 1/ε; at n = 1/ε the term is on the edge and counts as outside
    for (const k of [2, 5, 10, 20, 50, 100, 200]) expect(smallestN(SEQUENCES.recip.a, 0, 1 / k)).toBe(k);
  });
  it('for (2n+1)/n and ε = 0.003 the definition’s N is 333 (the bank’s Q-2.2-N2)', () => {
    expect(smallestN(SEQUENCES.shifted.a, 2, 0.003)).toBe(333);
  });
  it('for 1/√n and ε = 0.1 the definition’s N is 100, since 1/√n < 0.1 ⇔ n > 100', () => {
    expect(smallestN(SEQUENCES.slow.a, 0, 0.1)).toBe(100);
  });
  it('the alternating sequence 1 + (−1)ⁿ/n has |aₙ − 1| = 1/n, so ε = 0.2 gives N = 5 although it is not monotone', () => {
    expect(smallestN(SEQUENCES.alternating.a, 1, 0.2)).toBe(5);
  });
  it('(2 + (−1)ⁿ)/n converges to 0 although its distance to 0 is not monotone; ε = 0.1 needs N = 30, set by the even terms 3/n', () => {
    const a = SEQUENCES.bumpy.a;
    expect(Math.abs(a(2))).toBeGreaterThan(Math.abs(a(1)));
    expect(smallestN(a, 0, 0.1)).toBe(30);
  });
  it('ten wild first terms do not change the limit: for ε = 0.05 the N is 20, set by the 1/n tail', () => {
    expect(smallestN(SEQUENCES['wild-start'].a, 0, 0.05)).toBe(20);
    expect(smallestN(SEQUENCES['wild-start'].a, 0, 0.5)).toBe(10);
  });
  it('1/√n at the narrowest ε needs N = 40 000: the figure searches far enough to find it (200 000)', () => {
    expect(smallestN(SEQUENCES.slow.a, 0, 0.005, 200_000)).toBe(40_000);
    // a search window too short to hold N in its first half reports no evidence, never a wrong N
    expect(smallestN(SEQUENCES.slow.a, 0, 0.005, 20_000)).toBeNull();
  });
  it('(−1)ⁿ around 1 still has terms outside the band after N = 500, the end of the drawn window', () => {
    expect(outsideAfter(SEQUENCES.sign.a, 1, 0.5, 500, 4 * 500 + 100).length).toBeGreaterThan(0);
  });
  it('(−1)ⁿ has no N for ε = 1/2 around any candidate limit', () => {
    for (const L of [-1, 0, 0.5, 1]) expect(smallestN(SEQUENCES.sign.a, L, 0.5, 1000)).toBeNull();
  });
});

describe('exact identities', () => {
  it('a term exactly on the band edge counts as outside, whatever rounding says', () => {
    // 1 + 1/5 − 1 rounds to 0.19999999999999996, below 0.2
    expect(Math.abs(SEQUENCES.alternating.a(5) - 1) < 0.2).toBe(true);
    expect(inBand(SEQUENCES.alternating.a(5), 1, 0.2)).toBe(false);
    expect(inBand(SEQUENCES.alternating.a(6), 1, 0.2)).toBe(true);
  });
  it('any N larger than the smallest one also works, and N − 1 leaves a term outside', () => {
    for (const id of ['recip', 'shifted', 'alternating', 'bumpy', 'slow', 'wild-start'] as const) {
      const s = SEQUENCES[id];
      for (const eps of EPSILONS) {
        const N = smallestN(s.a, s.limit!, eps, H)!;
        expect(outsideAfter(s.a, s.limit!, eps, N, H), `${id} ε=${eps}`).toEqual([]);
        expect(outsideAfter(s.a, s.limit!, eps, N + 37, H)).toEqual([]);
        if (N > 0) expect(outsideAfter(s.a, s.limit!, eps, N - 1, H)).toEqual([N]);
      }
    }
  });
  it('a smaller ε never needs a smaller N (N depends on ε, and grows as the band narrows)', () => {
    for (const id of ['recip', 'shifted', 'alternating', 'bumpy', 'slow', 'wild-start'] as const) {
      const s = SEQUENCES[id];
      const Ns = EPSILONS.map((e) => smallestN(s.a, s.limit!, e, H)!);
      for (let i = 1; i < Ns.length; i++) expect(Ns[i]).toBeGreaterThanOrEqual(Ns[i - 1]);
    }
  });
});
