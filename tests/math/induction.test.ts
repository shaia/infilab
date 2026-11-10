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
  it('geometric sum 1 + q + … + qⁿ⁻¹ = (qⁿ − 1)/(q − 1) for q = 2, 3, −2 and n ≤ 30 (proposition 0.5.8(b))', () => {
    for (const q of [2, 3, -2]) for (let n = 1; n <= 30; n++) expect(partialSum((k) => q ** (k - 1), n)).toBe((q ** n - 1) / (q - 1));
  });
  it('Pascal: C(n,k−1) + C(n,k) = C(n+1,k), and the binomial theorem (a+b)ⁿ = Σ C(n,k)aⁿ⁻ᵏbᵏ on integers (lemma 0.5.22, theorem 0.5.24)', () => {
    const fact = (m: number) => {
      let f = 1;
      for (let i = 2; i <= m; i++) f *= i;
      return f;
    };
    const C = (n: number, k: number) => fact(n) / (fact(k) * fact(n - k));
    for (let n = 1; n <= 18; n++) for (let k = 1; k <= n; k++) expect(C(n, k - 1) + C(n, k)).toBe(C(n + 1, k));
    for (let n = 0; n <= 18; n++) for (let k = 0; k <= n; k++) expect(Number.isInteger(C(n, k)) && C(n, k) >= 1).toBe(true);
    for (const [a, b] of [[2, 3], [-1, 4], [0, 5], [3, 0], [1, 1]]) {
      for (let n = 1; n <= 12; n++) {
        let s = 0;
        for (let k = 0; k <= n; k++) s += C(n, k) * a ** (n - k) * b ** k; // JS: 0 ** 0 === 1, the lesson's convention
        expect(s).toBe((a + b) ** n);
      }
    }
    expect(C(5, 2)).toBe(10);
  });
  it('every integer n ≥ 8 is 3a + 5b with a, b ≥ 0, and 7 is not (W-0.5-07)', () => {
    const rep = (n: number) => {
      for (let b = 0; 5 * b <= n; b++) if ((n - 5 * b) % 3 === 0) return true;
      return false;
    };
    expect([1, 2, 4, 7].some(rep)).toBe(false);
    for (let n = 8; n <= 500; n++) expect(rep(n)).toBe(true);
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
  it('2n³ − (n+1)³ = n³ − 3n² − 3n − 1: −10 at n = 3, positive from n = 4 (proposition 0.5.12, step 1)', () => {
    expect(3 ** 3 - 3 * 9 - 3 * 3 - 1).toBe(-10);
    expect(2 * 27).toBe(54);
    expect(4 ** 3).toBe(64);
    for (let n = 4; n <= 2000; n++) {
      expect(2 * n ** 3 - (n + 1) ** 3).toBe(n ** 3 - 3 * n * n - 3 * n - 1);
      expect(n ** 3 - 3 * n * n - 3 * n - 1).toBeGreaterThan(0);
    }
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
  it('Bernoulli on [−2, −1) (W-0.5-09): (1+x)ⁿ stays in [−1, 1] and above 1 + nx; x = −3 is equality at n = 3 and fails at n = 5', () => {
    for (let i = 0; i < 1000; i++) {
      const x = -2 + i * 0.001;
      for (let n = 1; n <= 60; n++) {
        const p = (1 + x) ** n;
        expect(p).toBeGreaterThanOrEqual(-1);
        expect(p).toBeLessThanOrEqual(1);
        expect(atLeast(p, 1 + n * x), `x=${x} n=${n}`).toBe(true);
      }
    }
    expect((-2) ** 3).toBe(1 + 3 * -3);
    expect((-2) ** 5).toBe(-32);
    expect(1 + 5 * -3).toBe(-14);
    expect((-1.5) ** 7).toBeCloseTo(-17.0859375, 12);
    expect(1 + 7 * -2.5).toBe(-16.5);
  });
  it('strict Bernoulli (theorem 0.5.19(b)): (1+x)ⁿ > 1 + nx for n ≥ 2, x ≥ −1, x ≠ 0, including x = −1', () => {
    for (let i = 0; i <= 400; i++) {
      const x = -1 + i * 0.01;
      if (Math.abs(x) < 1e-9) continue;
      for (let n = 2; n <= 30; n++) expect((1 + x) ** n - (1 + n * x)).toBeGreaterThan(0);
    }
  });
  it('the improved Bernoulli fails for negative x: x = −0.9, n = 3 gives 0.001 < 0.73 (example 5, check)', () => {
    expect((1 - 0.9) ** 3).toBeCloseTo(0.001, 15);
    expect(1 + 3 * -0.9 + 3 * 0.81).toBeCloseTo(0.73, 12);
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
