/** The bisection proof of Bolzano–Weierstrass behind lesson 2.9's figure, filed by accuracy category. */

import { describe, expect, it } from 'vitest';
import {
  K_MAX,
  PRESETS,
  WINDOW,
  countIn,
  halves,
  intervalsOf,
  lengthOf,
  looksInfinite,
  pickIndices,
  proofPath,
  termsOf,
  validPath,
  windowPeaks,
  type BisectionId,
} from '~/math/bisection';

const IDS: BisectionId[] = ['alt-recip', 'frac-sqrt2', 'mod3'];
/** the path toward −1 in (−1)ⁿ + 1/n: [−2, 0], then [−1, 0], then always the lower half [−1, −1 + 2^{2−k}] */
const towardMinusOne = (k: number) => ('01' + '0'.repeat(K_MAX)).slice(0, k);

describe('exact identities', () => {
  it('the halves share the midpoint, nest in the interval, and the k-th interval has length (β₀ − α₀)/2ᵏ exactly', () => {
    for (const id of IDS) {
      const I0 = PRESETS[id].I0;
      for (const path of ['', '0', '1', '0110', '1010101010', '0000000000', '1111111111']) {
        const Is = intervalsOf(I0, path);
        Is.forEach((I, k) => {
          expect(lengthOf(I)).toBe(lengthOf(I0) / 2 ** k);
          if (k > 0) {
            expect(I.lo).toBeGreaterThanOrEqual(Is[k - 1].lo);
            expect(I.hi).toBeLessThanOrEqual(Is[k - 1].hi);
          }
        });
      }
      const [lo, hi] = halves(I0);
      expect(lo.hi).toBe(hi.lo);
      expect(lo.lo).toBe(I0.lo);
      expect(hi.hi).toBe(I0.hi);
    }
  });

  it('I₀ holds every term of the window, so the first interval has W terms', () => {
    for (const id of IDS) expect(countIn(termsOf(id), PRESETS[id].I0).total).toBe(WINDOW);
  });

  it('the chosen indices increase strictly and each term lies in its interval (the proof’s choice of n_k)', () => {
    for (const id of IDS) {
      const t = termsOf(id);
      for (const path of [proofPath(t, PRESETS[id].I0, K_MAX), '1'.repeat(K_MAX), '0101010101']) {
        const Is = intervalsOf(PRESETS[id].I0, path);
        const ns = pickIndices(t, Is);
        let prev = 0;
        ns.forEach((n, i) => {
          if (n === null) return;
          expect(n).toBeGreaterThan(prev);
          expect(n).toBeGreaterThanOrEqual(i + 1); // lemma 2.9.2 (א): n_k ≥ k
          expect(t[n]).toBeGreaterThanOrEqual(Is[i + 1].lo);
          expect(t[n]).toBeLessThanOrEqual(Is[i + 1].hi);
          prev = n;
        });
      }
    }
  });

  it('a path is valid only as a string of 0 and 1 of length at most K_MAX', () => {
    expect(validPath('')).toBe(true);
    expect(validPath('0101')).toBe(true);
    expect(validPath('012')).toBe(false);
    expect(validPath('0'.repeat(K_MAX + 1))).toBe(false);
  });
});

describe('analytic facts the lesson proves, checked on the window', () => {
  it('(−1)ⁿ + 1/n toward −1: n_k = 1, 3, 5, 7, 9 and then 2^{k−2} + 1 (the smallest odd n ≥ 2^{k−2} after n_{k−1})', () => {
    const t = termsOf('alt-recip');
    const ns = pickIndices(t, intervalsOf(PRESETS['alt-recip'].I0, towardMinusOne(K_MAX)));
    expect(ns).toEqual([1, 3, 5, 7, 9, 17, 33, 65, 129, 257]);
    // every interval on the way contains −1
    for (const I of intervalsOf(PRESETS['alt-recip'].I0, towardMinusOne(K_MAX))) expect(I.lo <= -1 && -1 <= I.hi).toBe(true);
  });

  it('(−1)ⁿ + 1/n: the upper half of I_k on that path holds exactly the odd n in [2^{k−2}, 2^{k−1}], finitely many', () => {
    const t = termsOf('alt-recip');
    for (let k = 3; k <= K_MAX; k++) {
      const Ik = intervalsOf(PRESETS['alt-recip'].I0, towardMinusOne(k))[k];
      const [lower, upper] = halves(Ik);
      const c = countIn(t, upper);
      expect(c.total, `k=${k}`).toBe(2 ** (k - 3));
      expect(c.last).toBe(2 ** (k - 1) - 1);
      expect(looksInfinite(c)).toBe(false);
      expect(looksInfinite(countIn(t, lower))).toBe(true);
    }
    // at k = 2 the upper half [−1/2, 0] holds a₁ = 0 and nothing else
    const [, up2] = halves(intervalsOf(PRESETS['alt-recip'].I0, '01')[2]);
    expect(countIn(t, up2)).toEqual({ total: 1, late: 0, last: 1 });
  });

  it('(−1)ⁿ + 1/n: [−2, −1] holds no term at all, so the proof’s rule goes to [−1, 0] and then down to −1', () => {
    const t = termsOf('alt-recip');
    expect(countIn(t, { lo: -2, hi: -1 }).total).toBe(0);
    expect(proofPath(t, PRESETS['alt-recip'].I0, K_MAX)).toBe(towardMinusOne(K_MAX));
  });

  it('(−1)ⁿ + 1/n toward 1: [0, 1] holds only a₁ = 0, so the way to 1 is 1, 1, 0, 0, …, and n_k ends in powers of two', () => {
    const t = termsOf('alt-recip');
    expect(countIn(t, intervalsOf(PRESETS['alt-recip'].I0, '10')[2])).toEqual({ total: 1, late: 0, last: 1 });
    const Is = intervalsOf(PRESETS['alt-recip'].I0, '11' + '0'.repeat(K_MAX - 2));
    for (const I of Is) expect(I.lo <= 1 && 1 <= I.hi).toBe(true);
    // I_k = [1, 1 + 2^{2−k}] for k ≥ 2 holds the even n ≥ 2^{k−2}; 1 + 1/2ʲ sits exactly on an endpoint and counts
    expect(pickIndices(t, Is)).toEqual([1, 2, 4, 6, 8, 16, 32, 64, 128, 256]);
  });

  it('the remainder of n mod 3 has terms 1, 2, 0 repeating, each value W/3 times (rounded) in the window', () => {
    const t = termsOf('mod3');
    expect([t[1], t[2], t[3], t[4]]).toEqual([1, 2, 0, 1]);
    for (const v of [0, 1, 2]) {
      const c = countIn(t, { lo: v, hi: v });
      expect(Math.abs(c.total - WINDOW / 3)).toBeLessThan(1);
      expect(looksInfinite(c)).toBe(true);
    }
    // both halves of [0, 2] look infinite: 1 lies on the shared midpoint
    for (const h of halves(PRESETS.mod3.I0)) expect(looksInfinite(countIn(t, h))).toBe(true);
  });
});

describe('the window is large enough for the evidence the figure shows', () => {
  it('fractional part of n√2: each of the 2048 intervals of length 2⁻¹¹ holds terms in the late half of the window', () => {
    const t = termsOf('frac-sqrt2');
    const B = 2 ** (K_MAX + 1);
    const late = new Array(B).fill(0);
    for (let n = WINDOW / 2 + 1; n <= WINDOW; n++) late[Math.min(B - 1, Math.floor(t[n] * B))]++;
    expect(Math.min(...late)).toBeGreaterThan(0);
  });

  it('every term of the fractional part of n√2 lies in [0, 1) and none is exactly 0 (√2 is irrational)', () => {
    const t = termsOf('frac-sqrt2');
    for (let n = 1; n <= WINDOW; n++) {
      expect(t[n] > 0 && t[n] < 1).toBe(true);
    }
  });
});

describe('peaks of the window (lemma 2.9.9)', () => {
  it('(−1)ⁿ + 1/n: the peaks are exactly the even places, so the peak subsequence a_{2k} decreases', () => {
    const p = windowPeaks(termsOf('alt-recip'), 200);
    for (let m = 1; m <= 200; m++) expect(p[m], `m=${m}`).toBe(m % 2 === 0);
  });

  it('the remainder mod 3: the peaks are the places with value 2 (m ≡ 2 mod 3)', () => {
    const p = windowPeaks(termsOf('mod3'), 300);
    for (let m = 1; m <= 300; m++) expect(p[m]).toBe(m % 3 === 2);
  });

  it('fractional part of n√2: no place up to 500 is a peak of the window (on the window, a later term exceeds each of them)', () => {
    const p = windowPeaks(termsOf('frac-sqrt2'), 500);
    expect(p.slice(1).some(Boolean)).toBe(false);
  });
});
