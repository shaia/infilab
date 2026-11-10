/** The bookkeeping of lesson 0.5's induction chain and the numbers its text quotes, filed by accuracy category. */

import { describe, expect, it } from 'vitest';
import { FAMILIES, atLeast, chain, circleRegions, halfProduct, linkHolds, partialSum, smallestFullBase, truthRow } from '~/math/induction';

describe('exact identities', () => {
  it('1 + 2 + … + n = n(n+1)/2 for n ≤ 2000, summed term by term (Gauss: 5050 at n = 100)', () => {
    for (let n = 1; n <= 2000; n++) expect(partialSum((k) => k, n)).toBe((n * (n + 1)) / 2);
    expect(partialSum((k) => k, 100)).toBe(5050);
  });
  it('1² + … + n² = n(n+1)(2n+1)/6 and 1³ + … + n³ = (n(n+1)/2)² for n ≤ 500', () => {
    for (let n = 1; n <= 500; n++) {
      expect(partialSum((k) => k * k, n)).toBe((n * (n + 1) * (2 * n + 1)) / 6);
      expect(partialSum((k) => k ** 3, n)).toBe(((n * (n + 1)) / 2) ** 2);
    }
  });
  it('1 + 2 + … + 2ⁿ⁻¹ = 2ⁿ − 1 and 1·2 + … + n(n+1) = n(n+1)(n+2)/3 for n ≤ 40', () => {
    for (let n = 1; n <= 40; n++) {
      expect(partialSum((k) => 2 ** (k - 1), n)).toBe(2 ** n - 1);
      expect(partialSum((k) => k * (k + 1), n)).toBe((n * (n + 1) * (n + 2)) / 3);
    }
  });
  it('1/2 + … + 1/2ⁿ = 1 − 1/2ⁿ and 1/2 + 2/4 + … + n/2ⁿ = 2 − (n+2)/2ⁿ (dyadic, exact in binary)', () => {
    for (let n = 1; n <= 40; n++) {
      expect(partialSum((k) => 1 / 2 ** k, n)).toBe(1 - 1 / 2 ** n);
      expect(partialSum((k) => k / 2 ** k, n)).toBe(2 - (n + 2) / 2 ** n);
    }
  });
  it('6 divides 7ⁿ − 1 for n ≤ 18 (7ⁿ exact below 2⁵³)', () => {
    for (let n = 1; n <= 18; n++) expect((7 ** n - 1) % 6).toBe(0);
  });
  it('the false formula n(n+1)/2 + 1 and the false (2n+1)²/8 both pass the step: each adds exactly n+1', () => {
    for (let n = 1; n <= 100; n++) {
      expect((n + 1) * (n + 2) / 2 + 1 - ((n * (n + 1)) / 2 + 1)).toBe(n + 1);
      expect(((2 * n + 3) ** 2 - (2 * n + 1) ** 2) / 8).toBe(n + 1);
    }
    expect((2 * 1 + 1) ** 2 / 8).toBe(9 / 8); // base: 1 ≠ 9/8
  });
});

describe('the chain (the principle of induction on a window)', () => {
  it('the sum: the base and every link hold, so pushing P(1) topples all ten', () => {
    const f = FAMILIES.sum;
    expect(truthRow(f).every(Boolean)).toBe(true);
    expect(chain(f, 1)).toEqual({ base: true, reach: 10, brokenAt: null });
  });
  it('n(n+1)/2 + 1: every link holds (each P(n) is false, a false premise) and nothing falls from any base', () => {
    const f = FAMILIES['sum-plus-one'];
    expect(truthRow(f).some(Boolean)).toBe(false);
    for (let n = 1; n < f.window; n++) expect(linkHolds(f, n)).toBe(true);
    for (let n0 = 1; n0 <= f.window; n0++) expect(chain(f, n0).base).toBe(false);
    expect(smallestFullBase(f)).toBeNull();
  });
  it('the horses: P(1) holds, the link 1 ⇒ 2 is the only broken one, and the chain stops at P(1)', () => {
    const f = FAMILIES.horses;
    expect(chain(f, 1)).toEqual({ base: true, reach: 1, brokenAt: 1 });
    const broken = Array.from({ length: f.window - 1 }, (_, i) => i + 1).filter((n) => !linkHolds(f, n));
    expect(broken).toEqual([1]);
  });
  it('2ⁿ > n³: true at 1, false from 2 to 9 (2⁹ = 512 < 729 = 9³), true from 10 (1024 > 1000); the smallest full base is 10', () => {
    const f = FAMILIES.cube;
    expect(truthRow(f).map((t) => (t ? 'T' : 'F')).join('')).toBe('TFFFFFFFFTTTTT');
    expect(chain(f, 1)).toEqual({ base: true, reach: 1, brokenAt: 1 });
    expect(smallestFullBase(f)).toBe(10);
    expect(chain(f, 10).reach).toBe(14);
  });
  it('the step of 2ⁿ > n³ needs (1 + 1/n)³ ≤ 2: false at n = 3, true from n = 4 (125/64)', () => {
    expect((1 + 1 / 3) ** 3).toBeGreaterThan(2);
    expect((1 + 1 / 4) ** 3).toBe(125 / 64);
    for (let n = 4; n <= 1000; n++) expect((1 + 1 / n) ** 3).toBeLessThanOrEqual(2);
  });
  it('2ⁿ > n²: the smallest n₀ after which it always holds is 5 (the bank’s Q-0.5-start-point)', () => {
    const P = (n: number) => 2 ** n > n * n;
    expect([1, 2, 3, 4, 5].map(P)).toEqual([true, false, false, false, true]);
    for (let n = 5; n <= 50; n++) expect(P(n)).toBe(true);
  });
  it('n! > 3ⁿ first at n = 7 (6! = 720 < 729 = 3⁶, 7! = 5040 > 2187), and from then on', () => {
    let f = 1;
    const first: number[] = [];
    for (let n = 1; n <= 25; n++) {
      f *= n;
      if (f > 3 ** n) first.push(n);
    }
    expect(first[0]).toBe(7);
    expect(first).toEqual(Array.from({ length: 19 }, (_, i) => i + 7));
  });
});

describe('analytic inequalities (evidence on a grid; the proofs are in the lesson)', () => {
  it('Bernoulli holds for every x ≥ −1 on a grid and n ≤ 30, with equality at n = 1 and at x = 0', () => {
    for (let i = 0; i <= 400; i++) {
      const x = -1 + i * 0.01;
      for (let n = 1; n <= 30; n++) expect(atLeast((1 + x) ** n, 1 + n * x), `x=${x} n=${n}`).toBe(true);
    }
    expect(FAMILIES.bernoulli.P(1, -0.37)).toBe(true);
  });
  it('Bernoulli fails for x = −4 at n = 3 ((−3)³ = −27 < −11): the link 2 ⇒ 3 breaks, the chain stops at P(2)', () => {
    const f = FAMILIES.bernoulli;
    expect((1 - 4) ** 3).toBe(-27);
    expect(1 + 3 * -4).toBe(-11);
    expect(chain(f, 1, f.window, -4)).toEqual({ base: true, reach: 2, brokenAt: 2 });
  });
  it('for x = −2.5 the first failure is n = 7, for x = −3 it is n = 5; for x = −2 none in the window', () => {
    const f = FAMILIES.bernoulli;
    expect(chain(f, 1, 10, -2.5).brokenAt).toBe(6);
    expect(chain(f, 1, 10, -3).brokenAt).toBe(4);
    expect(chain(f, 1, 10, -2).reach).toBe(10);
  });
  it('(1+x)ⁿ ≥ 1 + nx + n(n−1)x²/2 for x ≥ 0: (1.1)¹⁰⁰ ≈ 13780.6 ≥ 60.5 (example 5)', () => {
    for (let i = 0; i <= 300; i++) {
      const x = i * 0.01;
      for (let n = 1; n <= 30; n++) expect(atLeast((1 + x) ** n, 1 + n * x + (n * (n - 1) * x * x) / 2)).toBe(true);
    }
    expect(1 + 100 * 0.1 + (100 * 99 * 0.01) / 2).toBeCloseTo(60.5, 12);
    expect(1.1 ** 100).toBeCloseTo(13780.61, 1);
  });
  it('1 + 1/√2 + … + 1/√n ≥ √n, with equality only at n = 1 (example 4)', () => {
    let s = 0;
    for (let n = 1; n <= 10_000; n++) {
      s += 1 / Math.sqrt(n);
      if (n === 1) expect(s).toBe(1);
      else expect(s).toBeGreaterThan(Math.sqrt(n));
    }
  });
  it('(1/2)(3/4)…((2n−1)/(2n)) ≤ 1/√(3n+1), equality at n = 1, and the step’s gap is exactly n (example 6)', () => {
    for (let n = 1; n <= 2000; n++) expect(halfProduct(n)).toBeLessThanOrEqual(1 / Math.sqrt(3 * n + 1) * (1 + 1e-12));
    expect(halfProduct(1)).toBe(0.5);
    for (let n = 1; n <= 200; n++) {
      // (2n+2)²(3n+1) − (2n+1)²(3n+4) = n: the step closes
      expect((2 * n + 2) ** 2 * (3 * n + 1) - (2 * n + 1) ** 2 * (3 * n + 4)).toBe(n);
      // from the weaker 1/√(3n) the step would need (2n+1)² ≤ 4n(n+1), which is 1 ≤ 0
      expect((2 * n + 1) ** 2 - 4 * n * (n + 1)).toBe(1);
    }
  });
  it('1/(n+1) + … + 1/(2n) ≥ 7/12 from n = 2 (equality at 2), and the sum is 1/2 < 7/12 at n = 1', () => {
    const H = (n: number) => partialSum((k) => (k > n ? 1 / k : 0), 2 * n);
    expect(H(1)).toBe(0.5);
    expect(Math.abs(H(2) - 7 / 12)).toBeLessThan(1e-15);
    for (let n = 3; n <= 300; n++) expect(H(n)).toBeGreaterThan(7 / 12);
  });
  it('a₁ = 1, aₙ₊₁ = √(2 + aₙ): increasing and below 2 for n ≤ 15 (the gap to 2 shrinks about fourfold per term, so by n ≈ 27 doubles round aₙ to 2)', () => {
    let a = 1;
    for (let n = 1; n <= 15; n++) {
      const b = Math.sqrt(2 + a);
      expect(a).toBeLessThan(2);
      expect(b).toBeGreaterThanOrEqual(a);
      a = b;
    }
  });
});

describe('the hook: a pattern that holds for five cases and fails at the sixth', () => {
  it('chords between n points on a circle cut the disc into 1, 2, 4, 8, 16, then 31 regions (not 32)', () => {
    expect([1, 2, 3, 4, 5, 6].map(circleRegions)).toEqual([1, 2, 4, 8, 16, 31]);
  });
});
