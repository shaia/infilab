import { describe, expect, it } from 'vitest';
import {
  VIEW_IDS,
  VIEW_SEQUENCES,
  evenBeyond,
  isLowerBound,
  isUpperBound,
  monotoneFrom,
  outside,
  rangeOf,
  stepSigns,
  termsOf,
  valueStacks,
} from '../../src/math/seqviews';

const P = VIEW_SEQUENCES;
const exactSign = (x: bigint): number => (x > 0n ? 1 : x < 0n ? -1 : 0);

describe('exact identities: the step signs of the window equal the exact signs of aₙ₊₁ − aₙ', () => {
  it('n/(n+1): aₙ₊₁ − aₙ = 1/((n+1)(n+2)) > 0', () => {
    const s = stepSigns(termsOf(P.ratio, 400));
    expect(s.every((d) => d === 1)).toBe(true);
  });
  it('(−1)ⁿ/n: up from odd n, down from even n', () => {
    const s = stepSigns(termsOf(P['alt-recip'], 200));
    s.forEach((d, i) => expect(d).toBe((i + 1) % 2 === 1 ? 1 : -1));
  });
  it('√(n+1) − √n = 1/(√(n+1) + √n) strictly decreases (the denominators increase)', () => {
    expect(stepSigns(termsOf(P['root-diff'], 400)).every((d) => d === -1)).toBe(true);
    // the conjugate form is the same number as the difference, to rounding
    for (const n of [1, 2, 10, 100]) expect(P['root-diff'].a(n)).toBeCloseTo(Math.sqrt(n + 1) - Math.sqrt(n), 12);
  });
  it('a₁ = 0, aₙ₊₁ = aₙ/2 + 1 equals 2 − 2^(2−n) exactly and strictly increases on its whole window', () => {
    const v = termsOf(P['rec-half'], 50);
    v.forEach((x, i) => expect(x).toBe(2 - 2 ** (2 - (i + 1))));
    expect(stepSigns(v).every((d) => d === 1)).toBe(true);
    expect(v.every((x) => x < 2)).toBe(true);
  });
  it('n² − 10n: aₙ₊₁ − aₙ = 2n − 9, down for n ≤ 4, up from n = 5', () => {
    const s = stepSigns(termsOf(P.quad10, 40));
    s.forEach((d, i) => expect(d).toBe(exactSign(BigInt(2 * (i + 1) - 9))));
  });
  it('⌊10/n⌋: never up, and equal at n = 4 (2, 2): decreasing, not strictly', () => {
    const v = termsOf(P.floor10, 200);
    expect(v.slice(0, 11)).toEqual([10, 5, 3, 2, 2, 1, 1, 1, 1, 1, 0]);
    const s = stepSigns(v);
    expect(s.includes(1)).toBe(false);
    expect(s[3]).toBe(0);
  });
  it('n¹⁰/2ⁿ: aₙ₊₁ > aₙ ⇔ (n+1)¹⁰ > 2·n¹⁰ ⇔ n ≤ 13 (integer arithmetic)', () => {
    const s = stepSigns(termsOf(P.ratio10, 80));
    s.forEach((d, i) => {
      const n = BigInt(i + 1);
      expect(d).toBe(exactSign((n + 1n) ** 10n - 2n * n ** 10n));
    });
    expect(s.slice(0, 13).every((d) => d === 1)).toBe(true);
    expect(s.slice(13).every((d) => d === -1)).toBe(true);
  });
  it('2ⁿ strictly increases and 2ⁿ ≥ n + 1 (Bernoulli)', () => {
    const v = termsOf(P.pow2, 12);
    expect(stepSigns(v).every((d) => d === 1)).toBe(true);
    v.forEach((x, i) => expect(x).toBeGreaterThanOrEqual(i + 2));
  });
});

describe('exact identities: every preset agrees with its stated facts on its largest window', () => {
  for (const id of VIEW_IDS) {
    const p = P[id];
    const v = termsOf(p, p.winMax);
    it(`${id}: bounds, attainment, monotone start, finiteness of the values`, () => {
      if (p.sup !== null) {
        expect(v.every((x) => x <= p.sup! + 1e-12)).toBe(true);
        expect(v.some((x) => Math.abs(x - p.sup!) <= 4e-16 * Math.max(1, Math.abs(p.sup!)))).toBe(p.supAttained);
      }
      if (p.inf !== null) {
        expect(v.every((x) => x >= p.inf! - 1e-12)).toBe(true);
        expect(v.some((x) => Math.abs(x - p.inf!) <= 4e-16)).toBe(p.infAttained);
      }
      if (p.mono) {
        const w = monotoneFrom(v, p.mono.from);
        expect(p.mono.dir === 'inc' ? w.inc : w.dec).toBe(true);
        if (p.mono.strict) expect(p.mono.dir === 'inc' ? w.strictInc : w.strictDec).toBe(true);
        // from is the smallest such place: one step earlier the window already breaks it
        if (p.mono.from > 1) {
          const e = monotoneFrom(v, p.mono.from - 1);
          expect(p.mono.dir === 'inc' ? e.inc : e.dec).toBe(false);
        }
      } else {
        // monotone from no place: in the second half of the window it still goes both ways
        const w = monotoneFrom(v, Math.floor(v.length / 2));
        expect(w.inc || w.dec).toBe(false);
      }
      const distinct = valueStacks(v).length;
      if (p.valuesFinite) expect(distinct).toBeLessThanOrEqual(11);
      else expect(distinct).toBeGreaterThan(v.length / 3);
      const tail = v.slice(Math.floor(v.length / 2));
      expect(tail.every((x) => x === tail[0])).toBe(p.eventuallyConstant);
    });
  }
});

describe('exact identities: the bound checks use the facts, not the window', () => {
  it('n/(n+1): 0.99 bounds the first 98 terms and is no upper bound; 1 is', () => {
    const v = termsOf(P.ratio, 98);
    expect(outside(v, 0.99, null).above).toEqual([]);
    expect(isUpperBound(P.ratio, 0.99)).toBe(false);
    expect(isUpperBound(P.ratio, 1)).toBe(true);
    expect(isUpperBound(P.ratio, 1.005)).toBe(true);
    expect(isLowerBound(P.ratio, 0.5)).toBe(true);
    expect(isLowerBound(P.ratio, 0.51)).toBe(false);
  });
  it('unbounded presets have no upper bound at all', () => {
    for (const id of ['pow2', 'quad10', 'n-pow-alt'] as const) expect(isUpperBound(P[id], 1e9)).toBe(false);
  });
  it('outside lists the places beyond each line', () => {
    expect(outside([1, -1, 1, -1], 0.5, -0.5)).toEqual({ above: [1, 3], below: [2, 4] });
  });
  it('n^((−1)ⁿ): the even place beyond U is larger than U and the smallest such even number', () => {
    for (const U of [0, 0.5, 1, 1.5, 2, 7, 50, 50.5, 99.9]) {
      const n = evenBeyond(U);
      expect(n % 2).toBe(0);
      expect(P['n-pow-alt'].a(n)).toBeGreaterThan(U);
      expect(n - 2 <= U || n - 2 < 2).toBe(true);
    }
  });
});

describe('exact identities: the values of the window, stacked', () => {
  it('(−1)ⁿ and (−1)ⁿ⁺¹ have the same stacks of values on the line, and differ at every place', () => {
    const a = termsOf(P.sign, 12);
    const b = termsOf(P['sign-shift'], 12);
    expect(valueStacks(a).map((s) => s.value)).toEqual([-1, 1]);
    expect(valueStacks(b).map((s) => s.value)).toEqual([-1, 1]);
    a.forEach((x, i) => expect(x).not.toBe(b[i]));
    expect(valueStacks(a)[0].places).toEqual([1, 3, 5, 7, 9, 11]);
  });
  it('a computed range contains every drawn term', () => {
    for (const id of ['pow2', 'quad10', 'n-pow-alt', 'ratio10'] as const) {
      const [lo, hi] = rangeOf(P[id], P[id].window);
      for (const x of termsOf(P[id], P[id].window)) {
        expect(x).toBeGreaterThan(lo);
        expect(x).toBeLessThan(hi);
      }
    }
  });
});
