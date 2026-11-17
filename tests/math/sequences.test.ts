/**
 * The bookkeeping behind SequenceStrip, filed by accuracy category: lesson 2.2's ε-N first, then the bounds, pairs,
 * triples, M-N and Cauchy tails of lessons 2.3–2.6 and 2.10.
 */

import { describe, expect, it } from 'vitest';
import {
  EPSILONS,
  PAIRS,
  SEQUENCES,
  TRIPLES,
  beyond,
  combineTolerances,
  combined,
  floorNSqrt2,
  inBand,
  maxAbs,
  notBeyondAfter,
  opsOf,
  outsideAfter,
  partialSums,
  proofBound,
  smallestCauchyN,
  smallestN,
  smallestNBeyond,
  spreadBelow,
  tailSpread,
} from '~/math/sequences';

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

// ---------------------------------------------------------------------------------------------------------------
// lessons 2.3–2.6 and 2.10: the presets, pairs and triples added for SequenceStrip's other modes

/** the ε ladder as exact fractions p/q, for integer closed forms */
const EPS_FRACTIONS: [number, number][] = [
  [1, 2],
  [3, 10],
  [1, 5],
  [1, 10],
  [1, 20],
  [3, 100],
  [1, 50],
  [1, 100],
  [1, 200],
];
/** the figure's checked range after N (SequenceStrip's checkUpTo with a window below 2000) */
const T = (N: number) => Math.max(2000, 4 * N + 100);
const SEARCH = 200_000;

describe('exact identities (2.3–2.10 presets)', () => {
  it('the fractions match the ε ladder', () => {
    expect(EPS_FRACTIONS.map(([p, q]) => p / q)).toEqual(EPSILONS);
  });
  it('ratio3: aₙ − 3 = −5/(n+2), and quad3: aₙ − 3 = (n − 3)/(n² + 1)', () => {
    for (let n = 1; n <= 5000; n++) {
      expect(SEQUENCES.ratio3.a(n) - 3).toBeCloseTo(-5 / (n + 2), 13);
      expect(SEQUENCES.quad3.a(n) - 3).toBeCloseTo((n - 3) / (n * n + 1), 13);
    }
  });
  it('quad3 reaches 3 at n = 3 and its largest term is a₆ = 114/37 (the max |aₙ| of the bound task)', () => {
    expect(SEQUENCES.quad3.a(3)).toBe(3);
    expect(maxAbs(SEQUENCES.quad3.a, 1, 500)).toBe(SEQUENCES.quad3.a(6));
    expect(SEQUENCES.quad3.a(6)).toBeCloseTo(114 / 37, 14);
  });
  it('root-diff is evaluated by the conjugate: the same number as √(n+1) − √n', () => {
    for (const n of [1, 2, 10, 100, 1000]) expect(SEQUENCES['root-diff'].a(n)).toBeCloseTo(Math.sqrt(n + 1) - Math.sqrt(n), 12);
  });
  it('the partial sums are running sums: they match a sum from scratch, asked in any order', () => {
    const direct = (t: (k: number) => number, n: number) => {
      let s = 0;
      for (let k = 1; k <= n; k++) s += t(k);
      return s;
    };
    for (const n of [1, 2, 3, 10, 57, 1000]) {
      expect(SEQUENCES.harmonic.a(n)).toBe(direct((k) => 1 / k, n));
      expect(SEQUENCES['inv-sq-sum'].a(n)).toBe(direct((k) => 1 / (k * k), n));
      expect(SEQUENCES['alt-harmonic'].a(n)).toBe(direct((k) => (k % 2 ? 1 : -1) / k, n));
    }
    const s = partialSums((k) => k);
    expect([s(10), s(3), s(0), s(4)]).toEqual([55, 6, 0, 10]);
  });
  it('⌊n√2⌋ in integers: m² < 2n² < (m+1)² for every n in the search window', () => {
    for (let n = 1; n <= SEARCH; n++) {
      const m = floorNSqrt2(n);
      if (!(m * m < 2 * n * n && 2 * n * n < (m + 1) * (m + 1))) throw new Error(`⌊n√2⌋ wrong at n = ${n}`);
    }
  });
  it('the triples are ordered lower ≤ middle ≤ upper on the whole search window', () => {
    for (const [id, t] of Object.entries(TRIPLES)) {
      for (let n = 1; n <= SEARCH; n++) {
        const [l, m, u] = [t.lower(n), t.middle(n), t.upper(n)];
        if (!(l <= m && m <= u)) throw new Error(`${id}: order fails at n = ${n}`);
      }
    }
  });
  it('osc-squeeze: the middle equals the lower sequence at odd n and the upper one at even n', () => {
    const t = TRIPLES['osc-squeeze'];
    for (let n = 1; n <= 1000; n++) expect(t.middle(n)).toBe(n % 2 ? t.lower(n) : t.upper(n));
  });
  it('pair-cancel: aₙ + bₙ = 1 for every n, aₙbₙ alternates −2, 0, and bₙ = 0 at even n (no quotient offered)', () => {
    const p = PAIRS['pair-cancel'];
    for (let n = 1; n <= 1000; n++) {
      expect(combined(p, 'sum')(n)).toBe(1);
      expect(combined(p, 'product')(n)).toBe(n % 2 ? -2 : 0);
      if (n % 2 === 0) expect(p.b(n)).toBe(0);
    }
    expect(opsOf(p)).toEqual(['sum', 'product']);
    expect(opsOf(PAIRS['pair-sum'])).toEqual(['sum', 'product', 'quotient']);
  });
  it('pair-sum: |aₙ| ≤ K = 2 for every n, the bound the product proof uses', () => {
    const p = PAIRS['pair-sum'];
    expect(maxAbs(p.a, 1, SEARCH)).toBe(p.aBound);
  });
  it('the proofs of 2.4 work: with their tolerances on aₙ and bₙ, N = max(N₁, N₂) fits cₙ for every op and ε', () => {
    const p = PAIRS['pair-sum'];
    for (const op of opsOf(p)) {
      for (const eps of EPSILONS.slice(0, 6)) {
        const tol = combineTolerances(p, op, eps)!;
        const N1 = smallestN(p.a, p.aLimit!, tol.epsA, SEARCH)!;
        const N2 = smallestN(p.b, p.bLimit!, tol.epsB, SEARCH)!;
        const N = Math.max(N1, N2);
        expect(outsideAfter(combined(p, op), p.limits[op]!, eps, N, Math.max(4 * N, 4000)), `${op} ε=${eps}`).toEqual([]);
        // the proof's N is enough, not the smallest: the smallest one for cₙ is never larger
        expect(smallestN(combined(p, op), p.limits[op]!, eps, SEARCH)!).toBeLessThanOrEqual(N);
      }
    }
    expect(combineTolerances(PAIRS['pair-cancel'], 'sum', 0.1)).toBeNull();
  });
  it('the bound of 2.3.3 bounds every term once N fits ε = 1, for every convergent preset', () => {
    for (const s of Object.values(SEQUENCES)) {
      if (s.limit === null) continue;
      const N = smallestN(s.a, s.limit, 1, SEARCH)!;
      expect(maxAbs(s.a, 1, 5000)).toBeLessThanOrEqual(proofBound(s.a, s.limit, N));
    }
    // ratio3: |aₙ − 3| = 5/(n+2) < 1 ⇔ n > 3, so N = 3 and the bound is max(4/3, 7/4, 2, |3| + 1) = 4
    expect(smallestN(SEQUENCES.ratio3.a, 3, 1, SEARCH)).toBe(3);
    expect(proofBound(SEQUENCES.ratio3.a, 3, 3)).toBe(4);
  });
  it('a term equal to M is not beyond M (the inequality aₙ > M is strict)', () => {
    expect(beyond(SEQUENCES.lin.a(10), 10, 1)).toBe(false);
    expect(beyond(SEQUENCES['sqrt-n'].a(100), 10, 1)).toBe(false);
    expect(beyond(SEQUENCES['sqrt-n'].a(101), 10, 1)).toBe(true);
    expect(beyond(SEQUENCES['neg-quad'].a(10), 0, -1)).toBe(false);
  });
});

describe('convergence (2.3–2.10 presets): the smallest N against the closed form', () => {
  it('ratio3: |aₙ − 3| = 5/(n+2) < p/q ⇔ p(n+2) > 5q, so N = ⌊5q/p⌋ − 2 (498 for ε = 0.01)', () => {
    for (const [p, q] of EPS_FRACTIONS) expect(smallestN(SEQUENCES.ratio3.a, 3, p / q, SEARCH)).toBe(Math.floor((5 * q) / p) - 2);
    expect(smallestN(SEQUENCES.ratio3.a, 3, 0.01, SEARCH)).toBe(498);
  });
  it('quad3: |n − 3|/(n² + 1) < p/q decided in integers gives the same N', () => {
    for (const [p, q] of EPS_FRACTIONS) {
      let N = 0;
      for (let n = 1; n <= 10_000; n++) if (!(q * Math.abs(n - 3) < p * (n * n + 1))) N = n;
      expect(smallestN(SEQUENCES.quad3.a, 3, p / q, SEARCH)).toBe(N);
    }
  });
  it('root-diff: 1/(2√(n+1)) < aₙ < 1/(2√n), so N lies between ⌊1/(4ε²)⌋ − 1 and ⌊1/(4ε²)⌋', () => {
    for (const eps of EPSILONS) {
      const N = smallestN(SEQUENCES['root-diff'].a, 0, eps, SEARCH)!;
      const k = Math.floor(1 / (4 * eps * eps) + 1e-9);
      expect(N).toBeGreaterThanOrEqual(k - 1);
      expect(N).toBeLessThanOrEqual(k);
    }
  });
  it('sqrt-n: √n > M ⇔ n > M², so the N of 2.6.1 is ⌊M²⌋ (100 for M = 10, 110 for M = 10.5)', () => {
    const [m0, m1, step] = SEQUENCES['sqrt-n'].mRange!;
    for (let M = m0; M <= m1; M += step) expect(smallestNBeyond(SEQUENCES['sqrt-n'].a, M, 1), `M=${M}`).toBe(Math.floor(M * M));
    expect(smallestNBeyond(SEQUENCES['sqrt-n'].a, 10, 1)).toBe(100);
    expect(smallestNBeyond(SEQUENCES['sqrt-n'].a, 10.5, 1)).toBe(110);
  });
  it('lin: n > M ⇔ N = ⌊M⌋; neg-quad: 10n − n² < M ⇔ n > 5 + √(25 − M), so N = ⌊5 + √(25 − M)⌋', () => {
    for (let M = 0; M <= 300; M += 5) expect(smallestNBeyond(SEQUENCES.lin.a, M, 1)).toBe(M);
    for (let M = -3000; M <= 0; M += 50) expect(smallestNBeyond(SEQUENCES['neg-quad'].a, M, -1), `M=${M}`).toBe(Math.floor(5 + Math.sqrt(25 - M)));
  });
  it('zigzag and (−1)ⁿ n have no N for any M ≥ 0: their odd terms stay at or below 0', () => {
    for (let M = 0; M <= 300; M += 5) {
      expect(smallestNBeyond(SEQUENCES.zigzag.a, M, 1)).toBeNull();
      expect(smallestNBeyond(SEQUENCES['alt-lin'].a, M, 1)).toBeNull();
    }
    expect(notBeyondAfter(SEQUENCES.zigzag.a, 5, 1, 500, 2100).length).toBeGreaterThan(0);
  });
  it('the sandwich: the middle never needs a larger N than the larger of the outer ones', () => {
    for (const t of Object.values(TRIPLES)) {
      if (t.limit === null) continue;
      for (const eps of EPSILONS.slice(0, 8)) {
        const Nl = smallestN(t.lower, t.limit, eps, SEARCH)!;
        const Nu = smallestN(t.upper, t.limit, eps, SEARCH)!;
        expect(smallestN(t.middle, t.limit, eps, SEARCH)!).toBeLessThanOrEqual(Math.max(Nl, Nu));
      }
    }
  });
  it('floor-x: the lower sequence √2 − 1/n enters the band exactly when n > 1/ε', () => {
    for (const [p, q] of EPS_FRACTIONS) expect(smallestN(TRIPLES['floor-x'].lower, Math.SQRT2, p / q, SEARCH)).toBe(Math.floor(q / p));
  });
  it('outer-differ: the middle (−1)ⁿ has no N for any candidate L when ε ≤ 0.2', () => {
    for (let L = -1.5; L <= 1.5; L += 0.1) expect(smallestN(TRIPLES['outer-differ'].middle, L, 0.2, 2000)).toBeNull();
  });
  it('Σ 1/k²: the Cauchy N on the window is at most the telescoping proof’s ⌈1/ε⌉ − 1, and N − 1 fails', () => {
    const a = SEQUENCES['inv-sq-sum'].a;
    for (const eps of EPSILONS) {
      const N = smallestCauchyN(a, eps, T, 500)!;
      expect(N).toBeLessThanOrEqual(Math.ceil(1 / eps - 1e-9) - 1);
      expect(spreadBelow(tailSpread(a, N, T(N)).spread, eps)).toBe(true);
      if (N > 0) expect(spreadBelow(tailSpread(a, N - 1, T(N - 1)).spread, eps)).toBe(false);
    }
    expect(smallestCauchyN(a, 0.05, T, 500)).toBe(19);
  });
  it('Σ 1/k² ≤ 2 − 1/n (1/k² ≤ 1/(k−1) − 1/k), and Σ (−1)^(k+1)/k has |aₙ₊ₚ − aₙ| ≤ 1/(n+1)', () => {
    for (let n = 1; n <= 5000; n++) expect(SEQUENCES['inv-sq-sum'].a(n)).toBeLessThanOrEqual(2 - 1 / n + 1e-15);
    const h = SEQUENCES['alt-harmonic'].a;
    for (const n of [1, 5, 20, 100]) for (const p of [1, 2, 7, 50, 999]) expect(Math.abs(h(n + p) - h(n))).toBeLessThanOrEqual(1 / (n + 1) + 1e-15);
  });
  it('Hₙ: H₂ₙ − Hₙ ≥ 1/2, so no Cauchy N for ε = 1/2, and the tail spread up to 4N + 100 stays above ln 4', () => {
    const H = SEQUENCES.harmonic.a;
    for (const n of [1, 10, 100, 1000, 50_000]) expect(H(2 * n) - H(n)).toBeGreaterThanOrEqual(0.5);
    expect(smallestCauchyN(H, 0.5, T, 500)).toBeNull();
    for (const N of [100, 250, 500]) expect(tailSpread(H, N, T(N)).spread).toBeGreaterThan(Math.log(4));
  });
});
