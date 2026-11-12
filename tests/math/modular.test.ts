/** ℤ_n and the field axioms behind lesson 1.1's figure (FieldTable), filed by accuracy category. */

import { describe, expect, it } from 'vitest';
import {
  AXIOMS,
  add,
  checkAxioms,
  failingAxioms,
  identityOf,
  inverse,
  isField,
  leastCombination,
  mul,
  negative,
  nonInvertible,
  quot,
  rem,
  table,
  zeroDivisorPairs,
  zn,
  type FiniteStructure,
} from '~/math/modular';
import { gcd, isPrime } from '~/math/numbertheory';

const WINDOW = Array.from({ length: 41 }, (_, i) => i - 20); // −20 … 20

describe('exact identities: division with remainder and Lemma 1.1.15', () => {
  it('m = q·n + r_n(m) with 0 ≤ r_n(m) < n, negative m included', () => {
    for (const n of [1, 2, 3, 5, 6, 7, 12])
      for (const m of WINDOW) {
        const r = rem(m, n);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(n);
        expect(quot(m, n) * n + r).toBe(m);
      }
    expect(rem(-1, 7)).toBe(6);
    expect(rem(15, 7)).toBe(1);
  });
  it('r_n(a + b) = r_n(r_n(a) + r_n(b)) and r_n(ab) = r_n(r_n(a)·r_n(b)) for every a, b in the window', () => {
    for (const n of [2, 3, 4, 6, 7, 10, 13])
      for (const a of WINDOW)
        for (const b of WINDOW) {
          expect(rem(a + b, n)).toBe(rem(rem(a, n) + rem(b, n), n));
          expect(rem(a * b, n)).toBe(rem(rem(a, n) * rem(b, n), n));
        }
  });
});

describe('exhaustive verification: the field axioms of ℤ_n (each n is a complete check)', () => {
  it('Theorem 1.1.16: every axiom except possibly (כ4) holds in ℤ_n, n = 2 … 30', () => {
    for (let n = 2; n <= 30; n++) {
      const f = failingAxioms(zn(n));
      expect(f.filter((a) => a !== 'כ4'), `ℤ_${n}`).toEqual([]);
    }
  });
  it('Theorem 1.1.17: ℤ_n is a field exactly when n is prime, n = 2 … 40 (evidence for the theorem on a window)', () => {
    for (let n = 2; n <= 40; n++) expect(isField(n), `ℤ_${n}`).toBe(isPrime(n));
  });
  it('the zero of ℤ_n is 0, its one is 1, and every a has the negative r_n(n − a)', () => {
    for (let n = 2; n <= 13; n++) {
      expect(identityOf(table(n, 'add'))).toBe(0);
      expect(identityOf(table(n, 'mul'))).toBe(1);
      for (let a = 0; a < n; a++) expect(negative(a, n)).toBe(rem(n - a, n));
    }
  });
  it('Lemma 1.1.17א: for p prime and 0 < a < p the least positive ax + py is 1, and r_p(ax) = 1 for its x', () => {
    for (const p of [2, 3, 5, 7, 11, 13, 29])
      for (let a = 1; a < p; a++) {
        const { d, x, y } = leastCombination(a, p);
        expect(d).toBe(1);
        expect(a * x + p * y).toBe(1);
        expect(rem(a * x, p)).toBe(1);
        expect(inverse(a, p)).toBe(rem(x, p));
      }
  });
  it('for composite n the least positive ax + ny is gcd(a, n), the d of the lemma’s proof (it divides a and n)', () => {
    for (const n of [4, 6, 8, 9, 12, 15])
      for (let a = 1; a < n; a++) {
        const { d } = leastCombination(a, n);
        expect(d).toBe(gcd(a, n));
        expect(inverse(a, n) !== null).toBe(d === 1);
      }
  });
});

describe('exact identities: the numbers the lesson, its figure, bank and workbook quote', () => {
  it('ℤ_7: 3 ⊙ 5 = 1, the inverse of 3 is 5 and its negative is 4 (Q-1.1-inverse-z7)', () => {
    expect(mul(3, 5, 7)).toBe(1);
    expect(inverse(3, 7)).toBe(5);
    expect(negative(3, 7)).toBe(4);
    expect([1, 2, 3, 4, 5, 6].map((a) => inverse(a, 7))).toEqual([1, 4, 5, 2, 3, 6]);
  });
  it('ℤ_5: 2 ⊙ 3 = 1 and 4 ⊙ 4 = 1 (Q-1.1-zn-fields)', () => {
    expect(mul(2, 3, 5)).toBe(1);
    expect(mul(4, 4, 5)).toBe(1);
    expect([1, 2, 3, 4].map((a) => inverse(a, 5))).toEqual([1, 3, 2, 4]);
  });
  it('ℤ_6: 2 ⊙ 3 = 0, the zero-divisor pairs, and 2, 3, 4 have no inverse', () => {
    expect(mul(2, 3, 6)).toBe(0);
    expect(zeroDivisorPairs(6)).toEqual([[2, 3], [3, 4]]);
    expect(nonInvertible(6)).toEqual([2, 3, 4]);
    expect(failingAxioms(zn(6))).toEqual(['כ4']);
  });
  it('ℤ_4: 2 ⊙ 2 = 0 and only 2 lacks an inverse; ℤ_8, ℤ_9, ℤ_12 (examples and workbook)', () => {
    expect(mul(2, 2, 4)).toBe(0);
    expect(nonInvertible(4)).toEqual([2]);
    expect(nonInvertible(8)).toEqual([2, 4, 6]);
    expect(nonInvertible(9)).toEqual([3, 6]);
    expect(nonInvertible(12)).toEqual([2, 3, 4, 6, 8, 9, 10]);
    expect([1, 5, 7, 11].map((a) => inverse(a, 12))).toEqual([1, 5, 7, 11]);
  });
  it('ℤ_11 and ℤ_13: inverses quoted in the examples and workbook', () => {
    expect(inverse(2, 11)).toBe(6);
    expect(inverse(7, 11)).toBe(8);
    expect(inverse(5, 13)).toBe(8);
    expect(inverse(4, 13)).toBe(10);
    // 3x ⊕ 5 = 2 in ℤ_7: x = (2 − 5)·3⁻¹ = 4·5 = 20 → 6
    expect(add(mul(3, 6, 7), 5, 7)).toBe(2);
    expect([0, 1, 2, 3, 4, 5, 6].filter((x) => add(mul(3, x, 7), 5, 7) === 2)).toEqual([6]);
  });
  it('in ℤ_8 the equation 2 ⊙ x = 4 has two solutions and 2 ⊙ x = 3 none (Proposition 1.1.10 needs a field)', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].filter((x) => mul(2, x, 8) === 4)).toEqual([2, 6]);
    expect([0, 1, 2, 3, 4, 5, 6, 7].filter((x) => mul(2, x, 8) === 3)).toEqual([]);
  });
  it('in ℤ_8, x ⊙ x = 1 has four solutions; in ℤ_7 only 1 and 6 = −1 (Proposition 1.1.13)', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].filter((x) => mul(x, x, 8) === 1)).toEqual([1, 3, 5, 7]);
    expect([0, 1, 2, 3, 4, 5, 6].filter((x) => mul(x, x, 7) === 1)).toEqual([1, 6]);
  });
  it('in ℤ_2, 1 ⊕ 1 = 0: the element 2 := 1 + 1 is 0 there, so a field may have 2 = 0', () => {
    expect(add(1, 1, 2)).toBe(0);
    expect(add(1, 1, 3)).toBe(2);
  });
});

describe('exhaustive verification: other finite structures the lesson and workbook name', () => {
  // the field with four elements {0, 1, a, b} = {0, 1, 2, 3}: 1 + 1 = 0, a + 1 = b, a·a = b, a·b = 1
  const F4: FiniteStructure = {
    size: 4,
    add: [
      [0, 1, 2, 3],
      [1, 0, 3, 2],
      [2, 3, 0, 1],
      [3, 2, 1, 0],
    ],
    mul: [
      [0, 0, 0, 0],
      [0, 1, 2, 3],
      [0, 2, 3, 1],
      [0, 3, 1, 2],
    ],
  };
  it('the four-element table of workbook W-1.1-10 satisfies every axiom: a field with 4 elements that is not ℤ_4', () => {
    expect(failingAxioms(F4)).toEqual([]);
    expect(failingAxioms(zn(4))).toEqual(['כ4']);
  });
  it('on {0, 1, 2} the field tables are exactly those of ℤ_3: every closed pair of tables with identities 0, 1 that is a field equals ℤ_3 (challenge c1)', () => {
    // every commutative pair of tables on {0, 1, 2} with 0 + x = x and 1·x = x: the free entries are
    // 1+1, 1+2, 2+2 and 0·0, 0·2, 2·2 (0·1 = 0 and 1·2 = 2 are forced by 1·x = x)
    const fields: string[] = [];
    const v = [0, 1, 2];
    for (const a11 of v) for (const a12 of v) for (const a22 of v)
      for (const m00 of v) for (const m02 of v) for (const m22 of v) {
        const A = [
          [0, 1, 2],
          [1, a11, a12],
          [2, a12, a22],
        ];
        const M = [
          [m00, 0, m02],
          [0, 1, 2],
          [m02, 2, m22],
        ];
        const r = checkAxioms({ size: 3, add: A, mul: M });
        if (AXIOMS.every((x) => r[x]) && identityOf(A) === 0 && identityOf(M) === 1) fields.push(JSON.stringify([A, M]));
      }
    expect([...new Set(fields)]).toEqual([JSON.stringify([table(3, 'add'), table(3, 'mul')])]);
  });
  it('a non-closed table is not an operation: every axiom fails', () => {
    const bad: FiniteStructure = { size: 2, add: [[0, 1], [1, 2]], mul: [[0, 0], [0, 1]] };
    expect(failingAxioms(bad)).toEqual([...AXIOMS]);
  });
});

describe('failure modes', () => {
  it('rejects a modulus below 2, a non-integer and a zero divisor in rem', () => {
    expect(() => add(1, 1, 1)).toThrow(RangeError);
    expect(() => mul(1, 1, 2.5)).toThrow(RangeError);
    expect(() => rem(3, 0)).toThrow(RangeError);
    expect(() => rem(0.5, 3)).toThrow(RangeError);
  });
});
