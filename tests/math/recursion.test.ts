/** The recursion and e bookkeeping behind lesson 2.7's figure (Cobweb), filed by accuracy category. */

import { describe, expect, it } from 'vitest';
import { relativeError } from '~/math/analysis';
import {
  MAPS,
  a1At,
  a1Index,
  a1Positions,
  cobwebPath,
  eSeq,
  ePowerFraction,
  fSeq,
  firstN,
  heronExact,
  monotoneFrom,
  orbit,
  squeezeN,
} from '~/math/recursion';

const PHI = (1 + Math.sqrt(5)) / 2;

describe('analytic limits', () => {
  it('√(2 + aₙ) from a₁ = 0 rises to 2: a₂ = √2, a₃ ≈ 1.8478, a₄ ≈ 1.9616, and a₄₀ is 2 to rounding', () => {
    const a = orbit(MAPS.sqrt2.f, 0, 40);
    expect(relativeError(a[1], Math.SQRT2)).toBeLessThan(1e-15);
    expect(a[2]).toBeCloseTo(1.8478, 4);
    expect(a[3]).toBeCloseTo(1.9616, 4);
    expect(relativeError(a[39], 2)).toBeLessThan(1e-14);
  });
  it('√(2 + aₙ) from a₁ = 3 falls to 2 from above: a₂ = √5 ≈ 2.2361, a₃ ≈ 2.0582', () => {
    const a = orbit(MAPS.sqrt2.f, 3, 40);
    expect(relativeError(a[1], Math.sqrt(5))).toBeLessThan(1e-15);
    expect(a[2]).toBeCloseTo(2.0582, 4);
    expect(a.every((v) => v > 2 || relativeError(v, 2) < 1e-15)).toBe(true);
  });
  it('Heron from a₁ = 2 reaches √2 to double precision by a₆', () => {
    const a = orbit(MAPS.heron.f, 2, 6);
    expect(relativeError(a[5], Math.SQRT2)).toBeLessThan(1e-15);
  });
  it('1 + 1/aₙ from a₁ = 1 approaches the golden ratio (1 + √5)/2, alternating around it', () => {
    const a = orbit(MAPS.golden.f, 1, 60);
    expect(relativeError(a[59], PHI)).toBeLessThan(1e-14);
    for (let k = 0; k < 10; k++) expect(Math.sign(a[k] - PHI)).toBe(k % 2 === 0 ? -1 : 1);
  });
  it('x(2 − x) from a₁ = 0.2 rises to the fixed point 1, never to the other fixed point 0', () => {
    const a = orbit(MAPS.logistic.f, 0.2, 30);
    expect(relativeError(a[29], 1)).toBeLessThan(1e-15);
  });
  it('(1 + 1/n)ⁿ and (1 + 1/n)ⁿ⁺¹ squeeze e: at n = 100 they are 2.70481… and 2.73186…', () => {
    expect(eSeq(100)).toBeCloseTo(2.704813829, 8);
    expect(fSeq(100)).toBeCloseTo(2.731861968, 8);
    for (const n of [1, 10, 100, 1000, 10_000]) {
      expect(eSeq(n)).toBeLessThan(Math.E);
      expect(fSeq(n)).toBeGreaterThan(Math.E);
    }
  });
});

describe('exact identities', () => {
  it('Heron from 2 runs 2, 3/2, 17/12, 577/408, 665857/470832, and p² − 2q² = 1 from the second term on', () => {
    const t = heronExact(5).map(([p, q]) => `${p}/${q}`);
    expect(t).toEqual(['2/1', '3/2', '17/12', '577/408', '665857/470832']);
    for (const [p, q] of heronExact(8).slice(1)) expect(p * p - 2n * q * q).toBe(1n);
  });
  it('eₙ and fₙ as exact fractions: e₁ = 2, e₂ = 9/4, f₄ = 3125/1024 > 3 and f₅ = 46656/15625 < 3', () => {
    expect(ePowerFraction(1)).toEqual({ num: 2n, den: 1n });
    expect(ePowerFraction(2)).toEqual({ num: 9n, den: 4n });
    const f4 = ePowerFraction(4, 1);
    const f5 = ePowerFraction(5, 1);
    expect(f4).toEqual({ num: 3125n, den: 1024n });
    expect(f4.num > 3n * f4.den).toBe(true);
    expect(f5).toEqual({ num: 46656n, den: 15625n });
    expect(f5.num < 3n * f5.den).toBe(true);
  });
  it('fₙ − eₙ = eₙ/n (to rounding) for every n up to 2000', () => {
    for (let n = 1; n <= 2000; n++) expect(relativeError(fSeq(n) - eSeq(n), eSeq(n) / n)).toBeLessThan(1e-10);
  });
  it('the cobweb alternates graph and diagonal: (a₁, a₁), (a₁, a₂), (a₂, a₂), …', () => {
    expect(cobwebPath([0, 1, 3])).toEqual([
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 3],
      [3, 3],
    ]);
  });
  it('the a₁ slider hits every whole step exactly, 0 included for 2x', () => {
    const i0 = a1Index('double', 0);
    expect(a1At('double', i0)).toBe(0);
    for (const id of Object.keys(MAPS) as (keyof typeof MAPS)[]) {
      const last = a1Positions(id) - 1;
      expect(a1At(id, 0)).toBe(MAPS[id].a1.min);
      expect(a1At(id, last)).toBe(MAPS[id].a1.max);
      expect(a1At(id, a1Index(id, MAPS[id].a1.start))).toBe(MAPS[id].a1.start);
    }
  });
});

describe('convergence', () => {
  it('eₙ increases strictly and fₙ decreases strictly on n ≤ 5000 (theorem 2.7.4 and claim 2.7.6, as evidence)', () => {
    for (let n = 1; n < 5000; n++) {
      expect(eSeq(n + 1)).toBeGreaterThan(eSeq(n));
      expect(fSeq(n + 1)).toBeLessThan(fSeq(n));
    }
  });
  it('the first n with fₙ < 3 is 5; the first n whose (eₙ, fₙ) lies inside (2.7, 2.8) is 74', () => {
    expect(firstN((n) => fSeq(n) < 3)).toBe(5);
    expect(squeezeN(2.7, 2.8)).toBe(74);
    expect(eSeq(73)).toBeLessThan(2.7);
    expect(eSeq(74)).toBeGreaterThan(2.7);
    expect(fSeq(16)).toBeGreaterThan(2.8);
    expect(fSeq(17)).toBeLessThan(2.8);
  });
  it('the window verdict: √(2 + x) rises from n = 1 (a₁ = 0) and falls from n = 1 (a₁ = 3)', () => {
    expect(monotoneFrom(orbit(MAPS.sqrt2.f, 0, 12))).toMatchObject({ kind: 'up', from: 1 });
    expect(monotoneFrom(orbit(MAPS.sqrt2.f, 3, 12))).toMatchObject({ kind: 'down', from: 1 });
    expect(monotoneFrom(orbit(MAPS.sqrt2.f, 2, 12))).toMatchObject({ kind: 'flat', from: 1 });
  });
  it('Heron from a₁ = 1 jumps up to a₂ = 3/2 and falls from n = 2 on: eventually monotone', () => {
    const a = orbit(MAPS.heron.f, 1, 12);
    expect(a[1]).toBe(1.5);
    expect(monotoneFrom(a)).toMatchObject({ kind: 'down', from: 2 });
  });
  it('1 + 1/x from a₁ = 1 has no monotone tail in the window; x(2 − x) from 1.5 rises from n = 2', () => {
    expect(monotoneFrom(orbit(MAPS.golden.f, 1, 12)).kind).toBe('none');
    expect(monotoneFrom(orbit(MAPS.logistic.f, 1.5, 12))).toMatchObject({ kind: 'up', from: 2 });
  });
  it('2x from a₁ = 1 doubles without bound; only a₁ = 0 stays put', () => {
    const a = orbit(MAPS.double.f, 1, 30);
    expect(a[29]).toBe(2 ** 29);
    expect(orbit(MAPS.double.f, 0, 10).every((v) => v === 0)).toBe(true);
  });
  it('an orbit stops before a term outside the domain: √(2 + x) from a₁ = −3 has only one term', () => {
    expect(orbit(MAPS.sqrt2.f, -3, 10)).toEqual([-3]);
  });
});
