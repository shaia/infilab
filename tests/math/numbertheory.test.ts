/** The integer arithmetic and the claims behind lesson 0.4's figure CounterexampleHunt, filed by accuracy category. */

import { describe, expect, it } from 'vitest';
import { CLAIMS, divides, factorize, firstCounterexample, gcd, isPrime, smallestFactor, tally } from '~/math/numbertheory';

describe('exact identities', () => {
  it('isPrime agrees with the definition (only divisors 1 and n) on 1 … 2000, checked by brute force', () => {
    for (let n = 1; n <= 2000; n++) {
      let divisors = 0;
      for (let d = 1; d <= n; d++) if (n % d === 0) divisors++;
      expect(isPrime(n)).toBe(divisors === 2);
    }
  });
  it('1 is not prime, 2 is the only even prime, and the primes below 30 are the ten known ones', () => {
    expect(isPrime(1)).toBe(false);
    expect(isPrime(2)).toBe(true);
    const below30 = Array.from({ length: 29 }, (_, i) => i + 1).filter(isPrime);
    expect(below30).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
  });
  it('factorize multiplies back to n and returns primes in order', () => {
    for (const n of [2, 12, 1681, 2047, 30031, 65536, 4294967297]) {
      const f = factorize(n);
      expect(f.reduce((a, b) => a * b, 1)).toBe(n);
      expect(f.every(isPrime)).toBe(true);
      expect([...f].sort((a, b) => a - b)).toEqual(f);
    }
    expect(smallestFactor(4294967297)).toBe(641);
  });
  it('gcd: gcd(a, b) divides both, and gcd(n, n + 1) = 1 for consecutive integers', () => {
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(0, 7)).toBe(7);
    expect(gcd(-8, 12)).toBe(4);
    for (let n = 1; n <= 200; n++) expect(gcd(n, n + 1)).toBe(1);
    for (const [a, b] of [[84, 36], [1681, 1763], [2047, 4095]]) {
      const g = gcd(a, b);
      expect(divides(g, a) && divides(g, b)).toBe(true);
    }
  });
  it('divides follows b = a·k: 0 divides only 0, every a divides 0', () => {
    expect(divides(3, 12)).toBe(true);
    expect(divides(5, 12)).toBe(false);
    expect(divides(0, 0)).toBe(true);
    expect(divides(0, 5)).toBe(false);
    expect(divides(7, 0)).toBe(true);
  });
  it('refuses unsafe integers instead of rounding them', () => {
    expect(() => isPrime(2 ** 64 + 1)).toThrow(RangeError);
    expect(() => isPrime(2.5)).toThrow(RangeError);
  });
});

describe('counterexamples (the claims of figure 0.4)', () => {
  it('Euler: n² + n + 41 is prime for n = 1 … 39, and n = 40 gives 1681 = 41²', () => {
    for (let n = 1; n <= 39; n++) expect(isPrime(n * n + n + 41)).toBe(true);
    expect(40 * 40 + 40 + 41).toBe(41 * 41);
    expect(firstCounterexample(CLAIMS.euler)).toBe(40);
    expect(tally(CLAIMS.euler, 39)).toEqual({ holds: 39, vacuous: 0, fails: [] });
    // n = 41 gives 41 · 43: the factor 41 appears whenever 41 divides n or n + 1
    expect(factorize(41 * 41 + 41 + 41)).toEqual([41, 43]);
    expect(tally(CLAIMS.euler, 50).fails).toEqual([40, 41, 44, 49]);
  });
  it('n² − n + 11 is prime for n = 1 … 10, and n = 11 gives 121 = 11² (the review bank’s Q-0-review-01)', () => {
    expect(firstCounterexample(CLAIMS.eleven)).toBe(11);
    expect(11 * 11 - 11 + 11).toBe(121);
  });
  it('2ⁿ > n² fails exactly at n = 2, 3, 4 in the window, and holds at n = 1 and from n = 5 on', () => {
    expect(tally(CLAIMS.pow, 20).fails).toEqual([2, 3, 4]);
    expect(CLAIMS.pow.evaluate(1).verdict).toBe('holds');
    expect(CLAIMS.pow.evaluate(5).verdict).toBe('holds');
  });
  it('Fermat: 2^(2ⁿ) + 1 is prime for n = 1 … 4 (5, 17, 257, 65537), and n = 5 gives 641 · 6700417', () => {
    expect([1, 2, 3, 4].map((n) => 2 ** 2 ** n + 1)).toEqual([5, 17, 257, 65537]);
    expect(firstCounterexample(CLAIMS.fermat)).toBe(5);
    expect(2 ** 32 + 1).toBe(641 * 6700417);
    expect(factorize(2 ** 32 + 1)).toEqual([641, 6700417]);
  });
  it('the implication "n prime ⇒ 2ⁿ − 1 prime": first counterexample n = 11 (2047 = 23 · 89); composite n are vacuous', () => {
    expect(firstCounterexample(CLAIMS.mersenne)).toBe(11);
    expect(2 ** 11 - 1).toBe(23 * 89);
    expect(CLAIMS.mersenne.evaluate(4).verdict).toBe('vacuous'); // 2⁴ − 1 = 15 is composite, but 4 is not prime
    expect(CLAIMS.mersenne.evaluate(1).verdict).toBe('vacuous');
    // in 1 … 30: primes 2, 3, 5, 7, 13, 17, 19 hold; 11, 23, 29 fail; 1 and the 19 composites are vacuous
    expect(tally(CLAIMS.mersenne, 30)).toEqual({ holds: 7, vacuous: 20, fails: [11, 23, 29] });
    expect(factorize(2 ** 23 - 1)).toEqual([47, 178481]);
    expect(factorize(2 ** 29 - 1)).toEqual([233, 1103, 2089]);
  });
  it('Euclid’s numbers p₁⋯pₖ + 1 are prime for k ≤ 5 (3, 7, 31, 211, 2311) but 2·3·5·7·11·13 + 1 = 30031 = 59 · 509', () => {
    expect([2, 6, 30, 210, 2310].map((x) => isPrime(x + 1))).toEqual([true, true, true, true, true]);
    expect(2 * 3 * 5 * 7 * 11 * 13 + 1).toBe(30031);
    expect(factorize(30031)).toEqual([59, 509]);
  });
  it('991n² + 1 first becomes a perfect square at a 29-digit n (Pell’s equation), far past any window', () => {
    const n = 12055735790331359447442538767n;
    const v = 991n * n * n + 1n;
    const r = 379516400906811930638014896080n;
    expect(r * r).toBe(v);
    expect(String(n).length).toBe(29);
    // it is the smallest: the continued fraction of √991 yields the fundamental (least) solution of x² − 991y² = 1
    const D = 991n;
    const a0 = 31n; // ⌊√991⌋, since 31² = 961 ≤ 991 < 1024 = 32²
    let [m, d, a] = [0n, 1n, a0];
    let [p0, p1, q0, q1] = [1n, a0, 0n, 1n];
    while (p1 * p1 - D * q1 * q1 !== 1n) {
      m = d * a - m;
      d = (D - m * m) / d;
      a = (a0 + m) / d;
      [p0, p1] = [p1, a * p1 + p0];
      [q0, q1] = [q1, a * q1 + q0];
    }
    expect(q1).toBe(n);
    expect(p1).toBe(r);
  });
});

describe('evidence, not proof', () => {
  it('a window without a counterexample reports null ("none seen"), as for the true claim n² + n even', () => {
    expect(firstCounterexample(CLAIMS.even)).toBeNull();
    expect(tally(CLAIMS.even, 50)).toEqual({ holds: 50, vacuous: 0, fails: [] });
    // the same null for Euler's claim on the window 1 … 39, where the claim is false
    expect(firstCounterexample(CLAIMS.euler, 39)).toBeNull();
  });
  it('n² + n = n(n + 1) is even for every n in a long range (the proof is in the lesson; this is a probe)', () => {
    for (let n = 1; n <= 10_000; n++) expect((n * n + n) % 2).toBe(0);
  });
  it('only a claim the lesson proves is marked provedTrue', () => {
    const proved = Object.entries(CLAIMS).filter(([, c]) => c.provedTrue).map(([k]) => k);
    expect(proved).toEqual(['even']);
  });
});
