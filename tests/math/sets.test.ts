/** Lesson 0.7's finite sets, filed by accuracy category. Everything here is exact membership bookkeeping. */

import { describe, expect, it } from 'vitest';
import {
  CIRCLES,
  C_,
  D_,
  I_,
  S,
  U_,
  VENN,
  bigInter,
  bigUnion,
  clearance,
  complement,
  diff,
  differingRegions,
  equal,
  evalExpr,
  familyEqual,
  familyInter,
  familySubset,
  familyUnion,
  identity,
  inter,
  layout,
  namesOf,
  pairsDiff,
  pairsEqual,
  pairsInter,
  pairsUnion,
  powerSet,
  product,
  regionAt,
  regionOf,
  regionsCovered,
  regionsOf,
  show,
  subset,
  union,
  type Expr,
  type FSet,
} from '~/math/sets';

const A = S('A');
const B = S('B');
const C = S('C');
/** every subset of {1, 2, 3, 4} */
const SUBS = powerSet([1, 2, 3, 4]);
const U4 = [1, 2, 3, 4];
/** run a check on every triple of subsets of a 4-element universe (16³ = 4096 triples) */
const everyTriple = (f: (X: FSet, Y: FSet, Z: FSet) => void) => {
  for (const X of SUBS) for (const Y of SUBS) for (const Z of SUBS) f(X, Y, Z);
};
const holdsEverywhere = (e1: Expr, e2: Expr) => {
  let ok = true;
  everyTriple((X, Y, Z) => {
    if (!equal(evalExpr(e1, { U: U4, sets: { A: X, B: Y, C: Z } }), evalExpr(e2, { U: U4, sets: { A: X, B: Y, C: Z } }))) ok = false;
  });
  return ok;
};

describe('exact identities: the laws of Theorem 0.7.5 and De Morgan (0.7.6), on every triple of subsets of a 4-element set', () => {
  it('0.7.5(א)(ב): union and intersection are commutative and associative', () => {
    expect(holdsEverywhere(U_(A, B), U_(B, A))).toBe(true);
    expect(holdsEverywhere(I_(A, B), I_(B, A))).toBe(true);
    expect(holdsEverywhere(U_(U_(A, B), C), U_(A, U_(B, C)))).toBe(true);
    expect(holdsEverywhere(I_(I_(A, B), C), I_(A, I_(B, C)))).toBe(true);
  });
  it('0.7.5(ג): each distributes over the other', () => {
    expect(holdsEverywhere(I_(A, U_(B, C)), U_(I_(A, B), I_(A, C)))).toBe(true);
    expect(holdsEverywhere(U_(A, I_(B, C)), I_(U_(A, B), U_(A, C)))).toBe(true);
  });
  it('0.7.5(ד): A ∖ B = A ∩ Bᶜ', () => {
    expect(holdsEverywhere(D_(A, B), I_(A, C_(B)))).toBe(true);
  });
  it('0.7.6: (A∪B)ᶜ = Aᶜ∩Bᶜ, (A∩B)ᶜ = Aᶜ∪Bᶜ, (Aᶜ)ᶜ = A, and the two difference forms', () => {
    expect(holdsEverywhere(C_(U_(A, B)), I_(C_(A), C_(B)))).toBe(true);
    expect(holdsEverywhere(C_(I_(A, B)), U_(C_(A), C_(B)))).toBe(true);
    expect(holdsEverywhere(C_(C_(A)), A)).toBe(true);
    expect(holdsEverywhere(D_(A, U_(B, C)), I_(D_(A, B), D_(A, C)))).toBe(true);
    expect(holdsEverywhere(D_(A, I_(B, C)), U_(D_(A, B), D_(A, C)))).toBe(true);
  });
  it('the wrong De Morgan fails, and difference is neither commutative nor associative', () => {
    expect(holdsEverywhere(C_(I_(A, B)), I_(C_(A), C_(B)))).toBe(false);
    expect(holdsEverywhere(D_(A, B), D_(B, A))).toBe(false);
    expect(holdsEverywhere(D_(A, D_(B, C)), D_(D_(A, B), C))).toBe(false);
    expect(holdsEverywhere(I_(U_(A, B), C), U_(A, I_(B, C)))).toBe(false);
  });
  it('the membership table agrees with the exhaustive check on every identity above (8 regions decide)', () => {
    const pairs: [Expr, Expr, boolean][] = [
      [I_(A, U_(B, C)), U_(I_(A, B), I_(A, C)), true],
      [C_(U_(A, B)), I_(C_(A), C_(B)), true],
      [D_(A, U_(B, C)), I_(D_(A, B), D_(A, C)), true],
      [D_(A, D_(B, C)), U_(D_(A, B), I_(A, C)), true],
      [C_(I_(A, B)), I_(C_(A), C_(B)), false],
      [D_(A, D_(B, C)), D_(D_(A, B), C), false],
      [D_(A, U_(B, C)), U_(D_(A, B), D_(A, C)), false],
    ];
    for (const [e1, e2, want] of pairs) {
      expect(identity(e1, e2, 3)).toBe(want);
      expect(holdsEverywhere(e1, e2)).toBe(want);
    }
  });
});

describe('exact identities: the numbers of the lesson, its examples, bank and workbook', () => {
  it('lesson 0.7, after 0.7.5: A = {1,2,3,4}, B = {3,4,5}: A∖B = {1,2}, B∖A = {5}; A = B = C = {1} breaks associativity', () => {
    expect(diff([1, 2, 3, 4], [3, 4, 5])).toEqual([1, 2]);
    expect(diff([3, 4, 5], [1, 2, 3, 4])).toEqual([5]);
    expect(diff([1], diff([1], [1]))).toEqual([1]);
    expect(diff(diff([1], [1]), [1])).toEqual([]);
    // (A ∪ B) ∩ C ≠ A ∪ (B ∩ C) with A = {1}, B = C = ∅
    expect(inter(union([1], []), [])).toEqual([]);
    expect(union([1], inter([], []))).toEqual([1]);
  });
  it('ex-0-7-3: A∖(B∖C) = (A∖B)∪(A∩C) holds; A∖(B∪C) = (A∖B)∪(A∖C) fails at A = {1,2}, B = {1}, C = {2}', () => {
    expect(identity(D_(A, D_(B, C)), U_(D_(A, B), I_(A, C)), 3)).toBe(true);
    const u = { U: [1, 2, 3, 4, 5], sets: { A: [1, 2, 3, 4], B: [1, 2], C: [2, 5] } };
    expect(evalExpr(D_(A, D_(B, C)), u)).toEqual([2, 3, 4]);
    expect(evalExpr(U_(D_(A, B), I_(A, C)), u)).toEqual([2, 3, 4]);
    const v = { U: [1, 2], sets: { A: [1, 2], B: [1], C: [2] } };
    expect(evalExpr(D_(A, U_(B, C)), v)).toEqual([]);
    expect(evalExpr(U_(D_(A, B), D_(A, C)), v)).toEqual([1, 2]);
  });
  it('the figure: on the 3-set universe A∖(B∪C) = {1, 2}; on the 2-set one (A∩B)ᶜ = {1, 2, 5, 6, 7, 8} = Aᶜ∪Bᶜ', () => {
    expect(evalExpr(VENN.diff3.target, VENN.diff3.u)).toEqual([1, 2]);
    expect(evalExpr(VENN['comp-inter'].target, VENN['comp-inter'].u)).toEqual([1, 2, 5, 6, 7, 8]);
    expect(evalExpr(VENN['demorgan-right'].target, VENN['demorgan-right'].u)).toEqual([1, 2, 5, 6, 7, 8]);
    expect(evalExpr(VENN['comp-union'].target, VENN['comp-union'].u)).toEqual([6, 7, 8]);
    expect(evalExpr(VENN.union.target, VENN.union.u)).toEqual([1, 2, 3, 4, 5]);
    expect(evalExpr(VENN.inter.target, VENN.inter.u)).toEqual([3, 4]);
    expect(evalExpr(VENN.diff.target, VENN.diff.u)).toEqual([1, 2]);
  });
  it('the figure, witness presets: A∖(B∖C) = {1,2,6,8} and (A∖B)∖C = {1,2}, told apart by 6 and 8; (A∪B)ᶜ and Aᶜ∪Bᶜ by 1, 2, 5', () => {
    const P = VENN['assoc-diff'];
    const l = evalExpr(P.target, P.u);
    const r = evalExpr(P.other!, P.u);
    expect(l).toEqual([1, 2, 6, 8]);
    expect(r).toEqual([1, 2]);
    expect(P.u.U.filter((x) => l.includes(x) !== r.includes(x))).toEqual([6, 8]);
    // the regions where they differ are A∩C without B (5) and A∩B∩C (7)
    expect(differingRegions(P.target, P.other!, 3)).toEqual([5, 7]);
    const Q = VENN['demorgan-wrong'];
    const l2 = evalExpr(Q.target, Q.u);
    const r2 = evalExpr(Q.other!, Q.u);
    expect(Q.u.U.filter((x) => l2.includes(x) !== r2.includes(x))).toEqual([1, 2, 5]);
  });
  it('show writes the expressions as the lesson does', () => {
    expect(show(D_(A, U_(B, C)))).toBe('A∖(B∪C)');
    expect(show(C_(I_(A, B)))).toBe('(A∩B)ᶜ');
    expect(show(U_(C_(A), C_(B)))).toBe('Aᶜ∪Bᶜ');
    expect(namesOf(D_(A, U_(B, C)))).toEqual(['A', 'B', 'C']);
  });
});

describe('exact identities: power set and product (0.7.7, 0.7.8 and the results after 0.7.10)', () => {
  it('|P(A)| = 2ⁿ for n = 0, …, 8; P({1,2}) = {∅, {1}, {2}, {1,2}}', () => {
    for (let n = 0; n <= 8; n++) expect(powerSet(Array.from({ length: n }, (_, i) => i + 1))).toHaveLength(2 ** n);
    expect(familyEqual(powerSet([1, 2]), [[], [1], [2], [1, 2]])).toBe(true);
  });
  it('0.7.8: A ⊆ B exactly when P(A) ⊆ P(B), on every pair of subsets of {1,2,3,4}', () => {
    for (const X of SUBS) for (const Y of SUBS) expect(familySubset(powerSet(X), powerSet(Y))).toBe(subset(X, Y));
  });
  it('P(A∩B) = P(A)∩P(B) always; P(A)∪P(B) ⊆ P(A∪B), with equality exactly when A ⊆ B or B ⊆ A', () => {
    for (const X of SUBS)
      for (const Y of SUBS) {
        expect(familyEqual(powerSet(inter(X, Y)), familyInter(powerSet(X), powerSet(Y)))).toBe(true);
        const lhs = familyUnion(powerSet(X), powerSet(Y));
        expect(familySubset(lhs, powerSet(union(X, Y)))).toBe(true);
        expect(familyEqual(lhs, powerSet(union(X, Y)))).toBe(subset(X, Y) || subset(Y, X));
      }
    // the lesson's witness: A = {1}, B = {2}: {1, 2} ∈ P(A∪B) but not in P(A)∪P(B)
    expect(familySubset([[1, 2]], familyUnion(powerSet([1]), powerSet([2])))).toBe(false);
  });
  it('A×(B∪C) = (A×B)∪(A×C), A×(B∩C) = (A×B)∩(A×C), A×(B∖C) = (A×B)∖(A×C), on every triple', () => {
    everyTriple((X, Y, Z) => {
      expect(pairsEqual(product(X, union(Y, Z)), pairsUnion(product(X, Y), product(X, Z)))).toBe(true);
      expect(pairsEqual(product(X, inter(Y, Z)), pairsInter(product(X, Y), product(X, Z)))).toBe(true);
      expect(pairsEqual(product(X, diff(Y, Z)), pairsDiff(product(X, Y), product(X, Z)))).toBe(true);
    });
  });
  it('|A×B| = |A|·|B|; {1,2}×{a,b} has 4 pairs; (1,2) and (2,1) are different pairs', () => {
    for (const X of SUBS) for (const Y of SUBS) expect(product(X, Y)).toHaveLength(X.length * Y.length);
    expect(pairsEqual([[1, 2]], [[2, 1]])).toBe(false);
  });
  it('A×B = B×A only when A = B or one of them is empty (witness A = {1}, B = {2})', () => {
    for (const X of SUBS)
      for (const Y of SUBS) expect(pairsEqual(product(X, Y), product(Y, X))).toBe(equal(X, Y) || X.length === 0 || Y.length === 0);
  });
  it('(A×B)∪(C×D) ⊆ (A∪C)×(B∪D), and the inclusion can be strict (A = D = {1}, B = C = {2})', () => {
    for (const X of SUBS.slice(0, 8))
      for (const Y of SUBS.slice(0, 8))
        for (const Z of SUBS.slice(0, 8))
          for (const W of SUBS.slice(0, 8)) {
            const lhs = pairsUnion(product(X, Y), product(Z, W));
            const rhs = product(union(X, Z), union(Y, W));
            expect(pairsInter(lhs, rhs)).toHaveLength(lhs.length);
          }
    const lhs = pairsUnion(product([1], [2]), product([2], [1]));
    expect(lhs).toHaveLength(2);
    expect(product([1, 2], [1, 2])).toHaveLength(4);
  });
  it('challenge W-0.7-c2: with B ≠ ∅, A×B ⊆ B×C forces A ⊆ C; with B = ∅ it does not (A = {1}, C = ∅)', () => {
    everyTriple((X, Y, Z) => {
      if (Y.length === 0) return;
      const lhs = product(X, Y);
      if (pairsInter(lhs, product(Y, Z)).length === lhs.length) expect(subset(X, Z)).toBe(true);
    });
    expect(product([1], [])).toHaveLength(0);
    expect(subset([1], [])).toBe(false);
  });
});

describe('exact identities: families (0.7.9, 0.7.10)', () => {
  it('0.7.10 on finite families: (⋃Aᵢ)ᶜ = ⋂Aᵢᶜ and (⋂Aᵢ)ᶜ = ⋃Aᵢᶜ, for every family of three subsets of {1,2,3,4}', () => {
    everyTriple((X, Y, Z) => {
      const fam = [X, Y, Z];
      const comp = fam.map((F) => complement(F, U4));
      expect(complement(bigUnion(fam, U4), U4)).toEqual(bigInter(comp, U4));
      expect(complement(bigInter(fam, U4), U4)).toEqual(bigUnion(comp, U4));
    });
  });
  it('the shrinking sets Aₙ = {k ≥ n}: on the window {1,…,N} the intersection of A₁,…,A_N is {N}, of A₁,…,A_{N+1} empty', () => {
    // a window is evidence for the picture; the lesson's proof that ⋂Aₙ = ∅ is the line "m ∉ A_{m+1}"
    for (const N of [5, 10, 30]) {
      const U = Array.from({ length: N }, (_, i) => i + 1);
      const fam = (n: number) => Array.from({ length: n }, (_, i) => U.filter((k) => k >= i + 1));
      expect(bigInter(fam(N), U)).toEqual([N]);
      expect(bigInter([...fam(N), []], U)).toEqual([]);
      for (const m of U) expect(fam(N + 1).length > m && !U.filter((k) => k >= m + 1).includes(m)).toBe(true);
    }
  });
  it('the empty index set is refused, never guessed', () => {
    expect(() => bigUnion([], U4)).toThrow();
    expect(() => bigInter([], U4)).toThrow();
  });
});

describe('the drawing: every element sits inside exactly the circles of its sets', () => {
  it('every preset has an element in each region, so its membership table is complete', () => {
    for (const P of Object.values(VENN)) expect(regionsCovered(P.u, P.k)).toBe(true);
  });
  it('each drawn point is in the region of its element, clear of every line, and apart from the others', () => {
    for (const P of Object.values(VENN)) {
      const pos = layout(P.u, P.k);
      const pts = [...pos.entries()];
      for (const [x, [a, b]] of pts) {
        expect(regionAt(P.k, a, b)).toBe(regionOf(x, P.u, P.k));
        expect(clearance(P.k, a, b)).toBeGreaterThan(0.06);
      }
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) expect(Math.hypot(pts[i][1][0] - pts[j][1][0], pts[i][1][1] - pts[j][1][1])).toBeGreaterThan(0.12);
    }
  });
  it('the shaded region of an expression is its row of the membership table: A∖(B∪C) is region 1 only', () => {
    expect(regionsOf(D_(A, U_(B, C)), 3)).toEqual([1]);
    expect(regionsOf(C_(I_(A, B)), 2)).toEqual([0, 1, 2]);
    expect(CIRCLES[3]).toHaveLength(3);
  });
});

describe('exact identities: worked examples and workbook of lesson 0.7', () => {
  const sym = (X: Expr, Y: Expr) => U_(D_(X, Y), D_(Y, X));
  it('ex-0-7-6: A△B = (A∪B)∖(A∩B); A△C ⊆ (A△B)∪(B△C), strict for A = C = {1}, B = ∅', () => {
    expect(identity(sym(A, B), D_(U_(A, B), I_(A, B)), 3)).toBe(true);
    // ⊆ by the membership table: every region of A△C is a region of the right side
    const lhs = regionsOf(sym(A, C), 3);
    const rhs = regionsOf(U_(sym(A, B), sym(B, C)), 3);
    expect(lhs.every((m) => rhs.includes(m))).toBe(true);
    const u = { U: [1], sets: { A: [1], B: [], C: [1] } };
    expect(evalExpr(sym(A, C), u)).toEqual([]);
    expect(evalExpr(U_(sym(A, B), sym(B, C)), u)).toEqual([1]);
    everyTriple((X, Y) => expect(equal(evalExpr(sym(A, B), { U: U4, sets: { A: X, B: Y } }), []) ).toBe(equal(X, Y)));
  });
  it('W-0.7-08: A∩(B△C) = (A∩B)△(A∩C) holds; A∪(B△C) = (A∪B)△(A∪C) fails exactly inside A', () => {
    expect(identity(I_(A, sym(B, C)), sym(I_(A, B), I_(A, C)), 3)).toBe(true);
    expect(differingRegions(U_(A, sym(B, C)), sym(U_(A, B), U_(A, C)), 3)).toEqual([1, 3, 5, 7]);
    const u = { U: [1], sets: { A: [1], B: [1], C: [1] } };
    expect(evalExpr(U_(A, sym(B, C)), u)).toEqual([1]);
    expect(evalExpr(sym(U_(A, B), U_(A, C)), u)).toEqual([]);
  });
  it('W-0.7-06: A ⊆ B ⇔ A∪B = B ⇔ A∩B = A ⇔ A∖B = ∅, on every pair of subsets of {1,2,3,4}', () => {
    everyTriple((X, Y) => {
      const s = subset(X, Y);
      expect(equal(union(X, Y), Y)).toBe(s);
      expect(equal(inter(X, Y), X)).toBe(s);
      expect(diff(X, Y).length === 0).toBe(s);
    });
  });
  it('W-0.7-03: U = {1,…,10}, A = evens, B = multiples of 3', () => {
    const U = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const X = U.filter((k) => k % 2 === 0);
    const Y = U.filter((k) => k % 3 === 0);
    expect(union(X, Y)).toEqual([2, 3, 4, 6, 8, 9, 10]);
    expect(inter(X, Y)).toEqual([6]);
    expect(diff(X, Y)).toEqual([2, 4, 8, 10]);
    expect(diff(Y, X)).toEqual([3, 9]);
    expect(complement(union(X, Y), U)).toEqual([1, 5, 7]);
    expect(inter(complement(X, U), complement(Y, U))).toEqual([1, 5, 7]);
    expect(union(complement(X, U), complement(Y, U))).toEqual([1, 2, 3, 4, 5, 7, 8, 9, 10]);
  });
  it('ex-0-7-5(ב): (A×B)∩(C×D) = (A∩C)×(B∩D); W-0.7-07: with A ≠ ∅, A×B = A×C forces B = C', () => {
    const S8 = SUBS.filter((_, i) => i % 3 === 0);
    for (const X of S8) for (const Y of S8) for (const Z of S8) for (const W of S8)
      expect(pairsEqual(pairsInter(product(X, Y), product(Z, W)), product(inter(X, Z), inter(Y, W)))).toBe(true);
    everyTriple((X, Y, Z) => {
      if (X.length && pairsEqual(product(X, Y), product(X, Z))) expect(equal(Y, Z)).toBe(true);
    });
    expect(pairsEqual(product([], [1]), product([], [2]))).toBe(true);
  });
  it('ex-0-7-2: P({1,2,3}) has 8 members, {1,2,3}×{a,b} six pairs (a, b coded as 10, 11)', () => {
    expect(powerSet([1, 2, 3])).toHaveLength(8);
    expect(product([1, 2, 3], [10, 11])).toHaveLength(6);
    expect(pairsEqual(product([1, 2, 3], [10, 11]), product([10, 11], [1, 2, 3]))).toBe(false);
  });
  it('ex-0-7-4: Aₙ = {n,…,2n}: A₁ ∩ A₃ = ∅, A₃ ⊄ A₂, and on the window {1,…,40} the union of A₁,…,A₄₀ covers it', () => {
    const An = (n: number) => Array.from({ length: n + 1 }, (_, i) => n + i);
    expect(inter(An(1), An(3))).toEqual([]);
    expect(subset(An(3), An(2))).toBe(false);
    const U = Array.from({ length: 40 }, (_, i) => i + 1);
    expect(bigUnion(Array.from({ length: 40 }, (_, i) => An(i + 1)), U)).toEqual(U);
  });
});
