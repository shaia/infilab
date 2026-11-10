/** Lesson 0.6's finite functions, filed by accuracy category. Everything here is exact integer bookkeeping. */

import { describe, expect, it } from 'vitest';
import {
  DIAGRAMS,
  allFunctions,
  arrowsOf,
  asFunction,
  checkFunction,
  collisions,
  compose,
  flip,
  identity,
  image,
  imageOf,
  inverse,
  isInjective,
  isSurjective,
  missed,
  preimage,
  preimageOf,
  relationKey,
  toggleArrow,
  type FiniteFn,
} from '~/math/finitefunctions';

const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
/** n!/(n−m)!: the injections from a set of size m into a set of size n */
const falling = (n: number, m: number): number => (m > n ? 0 : fact(n) / fact(n - m));
const binom = (n: number, k: number): number => fact(n) / (fact(k) * fact(n - k));
/** surjections from m onto n, by inclusion–exclusion: Σ (−1)ᵏ C(n,k) (n−k)ᵐ */
const onto = (m: number, n: number): number => {
  let s = 0;
  for (let k = 0; k <= n; k++) s += (-1) ** k * binom(n, k) * (n - k) ** m;
  return s;
};
const SIZES: [number, number][] = [];
for (let m = 1; m <= 4; m++) for (let n = 1; n <= 4; n++) SIZES.push([m, n]);

describe('exact identities: what a function is', () => {
  it('a relation is a function exactly when every element has one arrow; the check names the culprits', () => {
    const c = checkFunction(DIAGRAMS['not-function'].f, 3);
    expect(c).toEqual({ ok: false, none: [1], many: [0] });
    expect(asFunction(DIAGRAMS['not-function'].f, 3)).toBeNull();
    // remove 1 → b and add 2 → d: now a function
    const fixed = toggleArrow(toggleArrow(DIAGRAMS['not-function'].f, [0, 1]), [1, 3]);
    expect(asFunction(fixed, 3)).toEqual([0, 3, 2]);
  });
  it('toggling an arrow twice gives the same relation, and the key ignores order', () => {
    const p = DIAGRAMS.square.f;
    expect(relationKey(toggleArrow(toggleArrow(p, [2, 3]), [2, 3]))).toBe(relationKey(p));
    expect(relationKey([[1, 0], [0, 1]])).toBe(relationKey([[0, 1], [1, 0]]));
  });
  it('x² on {−2,…,2}: image {0,1,4}, preimage of 1 is {−1, 1}, of 2 is empty; not injective, not onto', () => {
    const f = asFunction(DIAGRAMS.square.f, 5)!;
    expect(f).toEqual([4, 1, 0, 1, 4]);
    // the labels are the numbers themselves: f really is x ↦ x²
    const A = DIAGRAMS.square.A.map((s) => Number(s.replace('−', '-')));
    const B = DIAGRAMS.square.B.map(Number);
    A.forEach((x, i) => expect(B[f[i]]).toBe(x * x));
    expect(image(f)).toEqual([0, 1, 4]);
    expect(preimage(f, 1)).toEqual([1, 3]);
    expect(preimage(f, 2)).toEqual([]);
    expect(collisions(f)).toEqual([[0, 4], [1, 3]]);
    expect(missed(f, 5)).toEqual([2, 3]);
    expect(isInjective(f) || isSurjective(f, 5)).toBe(false);
  });
  it('the same rule on {0, 1, 2} is injective and still not onto: a property belongs to the function, not the formula', () => {
    const f = asFunction(DIAGRAMS['square-half'].f, 3)!;
    expect(isInjective(f)).toBe(true);
    expect(missed(f, 5)).toEqual([2, 3]);
  });
  it('composition goes right to left: (g∘f)(x) = g(f(x)); in the preset g∘f sends 1 and 2 both to p', () => {
    const f = asFunction(DIAGRAMS.compose.f, 2)!;
    const g = asFunction(DIAGRAMS.compose.g!, 3)!;
    expect(compose(g, f)).toEqual([0, 0]);
    // re-aiming f(2) at c makes g∘f injective although g is not
    const f2 = asFunction(toggleArrow(toggleArrow(DIAGRAMS.compose.f, [1, 1]), [1, 2]), 2)!;
    expect(isInjective(compose(g, f2))).toBe(true);
    expect(isInjective(g)).toBe(false);
    expect(() => compose([0], [1])).toThrow();
  });
  it('the inverse undoes f on both sides: f⁻¹∘f = id_A and f∘f⁻¹ = id_B', () => {
    const f = [2, 0, 1];
    const fi = inverse(f, 3)!;
    expect(fi).toEqual([1, 2, 0]);
    expect(compose(fi, f)).toEqual(identity(3));
    expect(compose(f, fi)).toEqual(identity(3));
  });
  it('images and preimages of sets: f(W ∪ X) = f(W) ∪ f(X), but f(W ∩ X) can be smaller than f(W) ∩ f(X)', () => {
    const f = asFunction(DIAGRAMS.square.f, 5)!;
    const W = [1, 2]; // {−1, 0}
    const X = [2, 3]; // {0, 1}
    expect(imageOf(f, [1, 2, 3])).toEqual([0, 1]);
    // W ∩ X = {0}: f(W ∩ X) = {0}, while f(W) ∩ f(X) = {0, 1}
    expect(imageOf(f, [2])).toEqual([0]);
    expect(imageOf(f, W).filter((y) => imageOf(f, X).includes(y))).toEqual([0, 1]);
    expect(preimageOf(f, [0, 1, 4])).toEqual([0, 1, 2, 3, 4]);
    expect(preimageOf(f, [2, 3])).toEqual([]);
  });
});

describe('counting: every function between small sets, against the closed formulas', () => {
  it.each(SIZES)('m = %i, n = %i: nᵐ functions, n!/(n−m)! injective, surjections by inclusion–exclusion', (m, n) => {
    const all = [...allFunctions(m, n)];
    expect(all.length).toBe(n ** m);
    expect(all.filter(isInjective).length).toBe(falling(n, m));
    expect(all.filter((f) => isSurjective(f, n)).length).toBe(onto(m, n));
    expect(all.filter((f) => isInjective(f) && isSurjective(f, n)).length).toBe(m === n ? fact(n) : 0);
  });
});

describe('theorems of the lesson, checked on every function between small sets', () => {
  const pairs: [FiniteFn, FiniteFn, number, number, number][] = [];
  for (const [a, b, c] of [[2, 3, 2], [3, 3, 3], [3, 2, 3], [2, 2, 2], [3, 4, 2]] as const) {
    for (const f of allFunctions(a, b)) for (const g of allFunctions(b, c)) pairs.push([f, g, a, b, c]);
  }

  it('the reversed arrows form a function exactly when f is injective and onto (the inverse exists)', () => {
    for (const [m, n] of SIZES) {
      for (const f of allFunctions(m, n)) {
        const bij = isInjective(f) && isSurjective(f, n);
        expect(asFunction(flip(arrowsOf(f)), n) !== null).toBe(bij);
        expect(inverse(f, n) !== null).toBe(bij);
      }
    }
  });
  it('pigeonhole: from a larger finite set no function is injective; into a larger one none is onto', () => {
    for (const f of allFunctions(4, 3)) expect(isInjective(f)).toBe(false);
    for (const f of allFunctions(2, 3)) expect(isSurjective(f, 3)).toBe(false);
  });
  it('on a finite set of size n, a function to itself is injective exactly when it is onto (false on ℕ: n ↦ 2n)', () => {
    for (const n of [1, 2, 3, 4]) for (const f of allFunctions(n, n)) expect(isInjective(f)).toBe(isSurjective(f, n));
  });
  it('f and g injective ⇒ g∘f injective; f and g onto ⇒ g∘f onto', () => {
    for (const [f, g, , b, c] of pairs) {
      const h = compose(g, f);
      if (isInjective(f) && isInjective(g)) expect(isInjective(h)).toBe(true);
      if (isSurjective(f, b) && isSurjective(g, c)) expect(isSurjective(h, c)).toBe(true);
    }
  });
  it('g∘f injective ⇒ f injective, and g∘f onto ⇒ g onto; the converses fail (witnesses exist)', () => {
    let gNotInj = false;
    let fNotOnto = false;
    for (const [f, g, , b, c] of pairs) {
      const h = compose(g, f);
      if (isInjective(h)) {
        expect(isInjective(f)).toBe(true);
        if (!isInjective(g)) gNotInj = true;
      }
      if (isSurjective(h, c)) {
        expect(isSurjective(g, c)).toBe(true);
        if (!isSurjective(f, b)) fNotOnto = true;
      }
    }
    expect(gNotInj).toBe(true);
    expect(fNotOnto).toBe(true);
  });
  it('W ⊆ f⁻¹(f(W)) always, with equality for every W exactly when f is injective', () => {
    for (const [m, n] of [[3, 3], [3, 2], [2, 3]] as const) {
      for (const f of allFunctions(m, n)) {
        let allEqual = true;
        for (let mask = 0; mask < 1 << m; mask++) {
          const W = identity(m).filter((x) => mask & (1 << x));
          const back = preimageOf(f, imageOf(f, W));
          for (const x of W) expect(back).toContain(x);
          if (back.length !== W.length) allEqual = false;
        }
        expect(allEqual).toBe(isInjective(f));
      }
    }
  });
});
