/** The growth ladder behind lesson 2.8's figure, filed by accuracy category. */

import { describe, expect, it } from 'vitest';
import { GROWTH, GROWTH_IDS, cmpLog, fromLog10, log10Factorial, overtakeFrom, ratioBelowFrom, type GrowthId } from '~/math/growth';
import { relativeError } from '~/math/analysis';

const B = BigInt;

/** aₙ > bₙ exactly, from the exact rational values: num_a·den_b > num_b·den_a. */
function exactGreater(a: GrowthId, b: GrowthId, n: number): boolean {
  const x = GROWTH[a].exact!(n);
  const y = GROWTH[b].exact!(n);
  return x.num * y.den > y.num * x.den;
}

/** The exact overtaking point: the smallest m with bₙ > aₙ for every m ≤ n ≤ horizon, by BigInt. */
function exactOvertake(a: GrowthId, b: GrowthId, horizon: number): number | null {
  if (!exactGreater(b, a, horizon)) return null;
  let m = horizon;
  while (m > 1 && exactGreater(b, a, m - 1)) m--;
  return m;
}

describe('exact identities', () => {
  it('2ⁿ overtakes n¹⁰ for good at n = 59: 2⁵⁸ < 58¹⁰ and 2ⁿ > n¹⁰ for every 59 ≤ n ≤ 1000', () => {
    expect(2n ** 58n < 58n ** 10n).toBe(true);
    for (let n = 59; n <= 1000; n++) expect(2n ** B(n) > B(n) ** 10n).toBe(true);
    expect(overtakeFrom(GROWTH.n10, GROWTH.pow2, 1000)).toBe(59);
  });
  it('1.1ⁿ overtakes n¹⁰ only at n = 686 (11ⁿ > n¹⁰·10ⁿ exactly), although 1.1¹ > 1¹⁰', () => {
    expect(11n ** 685n > 685n ** 10n * 10n ** 685n).toBe(false);
    expect(11n ** 686n > 686n ** 10n * 10n ** 686n).toBe(true);
    expect(overtakeFrom(GROWTH.n10, GROWTH.pow11, 1000)).toBe(686);
    expect(exactOvertake('n10', 'pow11', 1000)).toBe(686);
    // the first term misleads the other way: 1.1 > 1
    expect(exactGreater('pow11', 'n10', 1)).toBe(true);
  });
  it('2ⁿ and n² are equal at n = 2 and n = 4, and the logarithms do not let rounding break the tie', () => {
    expect(cmpLog(GROWTH.n2.log10(4), GROWTH.pow2.log10(4))).toBe(0);
    expect(cmpLog(GROWTH.n2.log10(2), GROWTH.pow2.log10(2))).toBe(0);
    expect(overtakeFrom(GROWTH.n2, GROWTH.pow2, 200)).toBe(5);
  });
  it('n! > 2ⁿ from n = 4, n! > 100ⁿ from n = 269, nⁿ > n! from n = 2', () => {
    expect(overtakeFrom(GROWTH.pow2, GROWTH.fact, 300)).toBe(4);
    expect(exactOvertake('pow2', 'fact', 300)).toBe(4);
    expect(overtakeFrom(GROWTH.fact, GROWTH.nn, 300)).toBe(2);
    // n! > 100ⁿ from n = 269: exactly, 268! < 100²⁶⁸ < 100²⁶⁹ < 269!, and a₍ₙ₊₁₎/aₙ = (n+1)/100 > 1 from then on
    const fact = (n: number) => GROWTH.fact.exact!(n).num;
    expect(fact(268) < 100n ** 268n).toBe(true);
    expect(fact(269) > 100n ** 269n).toBe(true);
    expect(GROWTH['pow100-fact'].log10(268)).toBeGreaterThan(0);
    expect(GROWTH['pow100-fact'].log10(269)).toBeLessThan(0);
  });
  it('every crossing the figure finds through logarithms is the exact crossing (all pairs with exact terms, horizon 300)', () => {
    const exactIds = GROWTH_IDS.filter((id) => GROWTH[id].exact);
    for (const a of exactIds)
      for (const b of exactIds) {
        if (a === b) continue;
        expect(overtakeFrom(GROWTH[a], GROWTH[b], 300), `${a} vs ${b}`).toBe(exactOvertake(a, b, 300));
      }
  });
  it('the ratio of 100ⁿ/n! is 100/(n + 1): exactly 1 at n = 99, below 1 from n = 100 (exact BigInt check of a₁₀₀ = a₉₉ > a₁₀₁)', () => {
    const p = GROWTH['pow100-fact'];
    expect(p.ratio(99)).toBe(1);
    expect(ratioBelowFrom(p, 1000)).toBe(100);
    const a = (n: number) => p.exact!(n);
    const [a99, a100, a101] = [a(99), a(100), a(101)];
    expect(a99.num * a100.den).toBe(a100.num * a99.den);
    expect(a101.num * a100.den < a100.num * a101.den).toBe(true);
  });
  it('the closed-form ratios agree with the terms: log₁₀ ratio = log₁₀ aₙ₊₁ − log₁₀ aₙ', () => {
    for (const id of GROWTH_IDS) {
      const p = GROWTH[id];
      for (const n of [p.first, p.first + 1, 7, 30, 99, 400]) {
        const viaLogs = p.log10(n + 1) - p.log10(n);
        expect(Math.abs(Math.log10(p.ratio(n)) - viaLogs), `${id} n=${n}`).toBeLessThan(1e-9);
      }
    }
  });
  it('log₁₀ n! is the sum of log₁₀ k: 10! = 3628800, and 30!/10³⁰ ≈ 265 (the bank’s Q-2.8-null)', () => {
    expect(relativeError(10 ** log10Factorial(10), 3628800)).toBeLessThan(1e-12);
    expect(Math.round(10 ** (log10Factorial(30) - 30))).toBe(265);
  });
});

describe('analytic limits', () => {
  it('the ratio of n!/nⁿ is 1/(1 + 1/n)ⁿ, between 1/e and 1/2, and tends to 1/e', () => {
    const p = GROWTH['fact-nn'];
    for (const n of [1, 2, 10, 100, 1000]) {
      expect(p.ratio(n)).toBeLessThanOrEqual(0.5);
      expect(p.ratio(n)).toBeGreaterThan(1 / Math.E);
    }
    expect(relativeError(p.ratio(1e6), 1 / Math.E)).toBeLessThan(1e-6);
  });
  it('the ratio of n¹⁰/2ⁿ tends to 1/2, and stays below 1 from n = 14 on (since (15/14)¹⁰ < 2 < (14/13)¹⁰)', () => {
    const p = GROWTH['n10-pow2'];
    expect(relativeError(p.ratio(1e7), 0.5)).toBeLessThan(1e-5);
    expect(ratioBelowFrom(p, 1000)).toBe(14);
  });
  it('every power ratio tends to 1, and ln n’s too, slowly: ln(n+1)/ln n − 1 < 1/(n ln n)', () => {
    for (const id of ['ln', 'sqrt', 'n', 'n2', 'n10'] as const) {
      expect(GROWTH[id].ratioLimit).toBe(1);
      expect(Math.abs(GROWTH[id].ratio(1e6) - 1)).toBeLessThan(1e-4);
    }
    for (const n of [2, 10, 1000]) expect(GROWTH.ln.ratio(n) - 1).toBeLessThan(1 / (n * Math.log(n)));
  });
});

describe('readouts', () => {
  it('fromLog10 writes a number too large for a double as mantissa·10^exponent, carrying 9.999… into the exponent', () => {
    const big = fromLog10(log10Factorial(1000));
    expect(big.exp).toBe(2567);
    expect(big.mant).toBeGreaterThanOrEqual(1);
    expect(big.mant).toBeLessThan(10);
    expect(fromLog10(2.9999999999)).toEqual({ mant: expect.closeTo(1, 6), exp: 3 });
    expect(fromLog10(-1).exp).toBe(-1);
  });
});
