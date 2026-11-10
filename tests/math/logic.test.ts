/** Truth tables behind lesson 0.2 (its figure, worked examples, bank and workbook), filed by accuracy category. */

import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  PQ,
  column,
  differingRows,
  equivalent,
  evaluate,
  falsifying,
  letters,
  parse,
  presetColumn,
  rows,
  show,
  tautology,
  type ColumnId,
} from '~/math/logic';

const T = true;
const F = false;
const eq = (a: string, b: string) => equivalent(parse(a), parse(b));

describe('exact identities: the five truth tables (rows TT, TF, FT, FF)', () => {
  it('rows come in textbook order: P changes slowest, T before F', () => {
    expect(rows(PQ)).toEqual([
      { P: T, Q: T },
      { P: T, Q: F },
      { P: F, Q: T },
      { P: F, Q: F },
    ]);
    expect(rows(['P', 'Q', 'R'])).toHaveLength(8);
  });
  it('¬, ∧, ∨ (inclusive), ⇒ and ⇔ have the tables of the lesson', () => {
    expect(column(parse('¬P'))).toEqual([F, T]);
    expect(presetColumn('and')).toEqual([T, F, F, F]);
    expect(presetColumn('or')).toEqual([T, T, T, F]);
    expect(presetColumn('impl')).toEqual([T, F, T, T]);
    expect(presetColumn('iff')).toEqual([T, F, F, T]);
  });
  it('P ⇒ Q is false in exactly one row, P true and Q false (the broken promise)', () => {
    expect(falsifying(parse('P ⇒ Q'))).toEqual([{ P: T, Q: F }]);
  });
  it('an implication with a false hypothesis is true whatever the conclusion', () => {
    for (const Q of [T, F]) expect(evaluate(parse('P ⇒ Q'), { P: F, Q })).toBe(true);
  });
  it('the bank’s Q-0.2-count-rows: (P ⇒ Q) ∧ (Q ⇒ P) is true in 2 of the 4 rows', () => {
    expect(presetColumn('both').filter(Boolean)).toHaveLength(2);
  });
  it('implication is right-associative, and ASCII spellings parse to the same formula', () => {
    expect(parse('P -> Q -> R')).toEqual(parse('P ⇒ (Q ⇒ R)'));
    expect(parse('~(P & ~Q) <-> !P | Q')).toEqual(parse('¬(P ∧ ¬Q) ⇔ (¬P ∨ Q)'));
  });
  it('a malformed formula is rejected, never guessed', () => {
    expect(() => parse('P ⇒')).toThrow();
    expect(() => parse('P ∧ X')).toThrow();
    expect(() => parse('(P ∨ Q')).toThrow();
  });
  it('show writes every preset back in a form that parses to the same formula', () => {
    for (const id of Object.keys(COLUMNS) as ColumnId[]) {
      const f = parse(COLUMNS[id].src);
      expect(parse(show(f)), id).toEqual(f);
    }
    expect(show(parse('(P ∨ Q) ⇒ (P ∧ Q)'))).toBe('(P ∨ Q) ⇒ (P ∧ Q)');
    expect(show(parse('¬(P ⇒ Q)'))).toBe('¬(P ⇒ Q)');
  });
});

describe('equivalences (a truth table is exhaustive: each of these is a proof)', () => {
  it('a claim and its contrapositive are equivalent: P ⇒ Q ≡ ¬Q ⇒ ¬P', () => {
    expect(eq('P ⇒ Q', '¬Q ⇒ ¬P')).toBe(true);
  });
  it('the converse and the inverse are equivalent to each other: Q ⇒ P ≡ ¬P ⇒ ¬Q', () => {
    expect(eq('Q ⇒ P', '¬P ⇒ ¬Q')).toBe(true);
  });
  it('P ⇒ Q ≡ ¬P ∨ Q ≡ ¬(P ∧ ¬Q)', () => {
    expect(eq('P ⇒ Q', '¬P ∨ Q')).toBe(true);
    expect(eq('P ⇒ Q', '¬(P ∧ ¬Q)')).toBe(true);
  });
  it('the negation of an implication is an "and": ¬(P ⇒ Q) ≡ P ∧ ¬Q', () => {
    expect(eq('¬(P ⇒ Q)', 'P ∧ ¬Q')).toBe(true);
  });
  it('P ⇔ Q ≡ (P ⇒ Q) ∧ (Q ⇒ P)', () => {
    expect(eq('P ⇔ Q', '(P ⇒ Q) ∧ (Q ⇒ P)')).toBe(true);
  });
  it('De Morgan: ¬(P ∧ Q) ≡ ¬P ∨ ¬Q', () => {
    expect(eq('¬(P ∧ Q)', '¬P ∨ ¬Q')).toBe(true);
  });
  it('worked example 1: (P ∨ Q) ⇒ (P ∧ Q) has the column T F F T, the column of P ⇔ Q', () => {
    expect(column(parse('(P ∨ Q) ⇒ (P ∧ Q)'), PQ)).toEqual([T, F, F, T]);
    expect(eq('(P ∨ Q) ⇒ (P ∧ Q)', 'P ⇔ Q')).toBe(true);
  });
  it('worked example 5(א): (P ∨ Q) ⇒ R ≡ (P ⇒ R) ∧ (Q ⇒ R), over all 8 rows', () => {
    expect(eq('(P ∨ Q) ⇒ R', '(P ⇒ R) ∧ (Q ⇒ R)')).toBe(true);
    expect(letters(parse('(P ∨ Q) ⇒ R'))).toEqual(['P', 'Q', 'R']);
  });
  it('workbook c2 (Book of Proof, Exercise 2.6.7): P ⇒ Q ≡ (P ∧ ¬Q) ⇒ (Q ∧ ¬Q)', () => {
    expect(eq('P ⇒ Q', '(P ∧ ¬Q) ⇒ (Q ∧ ¬Q)')).toBe(true);
    expect(column(parse('Q ∧ ¬Q'))).toEqual([F, F]);
  });
  it('tautologies: P ∨ ¬P, and ((P ⇒ Q) ∧ P) ⇒ Q', () => {
    expect(tautology(parse('P ∨ ¬P'))).toBe(true);
    expect(tautology(parse('((P ⇒ Q) ∧ P) ⇒ Q'))).toBe(true);
    expect(tautology(parse('((P ⇒ Q) ∧ Q) ⇒ P'))).toBe(false);
  });
});

describe('non-equivalences, each with the rows that separate them', () => {
  it('a claim and its converse differ in rows TF and FT (indices 1, 2)', () => {
    expect(differingRows(parse('P ⇒ Q'), parse('Q ⇒ P'))).toEqual([1, 2]);
  });
  it('a claim and its inverse differ in the same two rows', () => {
    expect(differingRows(parse('P ⇒ Q'), parse('¬P ⇒ ¬Q'))).toEqual([1, 2]);
  });
  it('P ⇒ ¬Q is not the negation of P ⇒ Q: both are true in the rows where P is false', () => {
    const d = differingRows(parse('¬(P ⇒ Q)'), parse('P ⇒ ¬Q'));
    expect(d).toEqual([2, 3]);
  });
  it('the exclusive reading of "or" differs from ∨ only in row TT', () => {
    expect(differingRows(parse('P ∨ Q'), parse('(P ∨ Q) ∧ ¬(P ∧ Q)'))).toEqual([0]);
  });
  it('worked example 5(ב): (P ∧ Q) ⇒ R is not (P ⇒ R) ∧ (Q ⇒ R); row P = T, Q = F, R = F separates them', () => {
    const f = parse('(P ∧ Q) ⇒ R');
    const g = parse('(P ⇒ R) ∧ (Q ⇒ R)');
    const v = { P: T, Q: F, R: F };
    expect(evaluate(f, v)).toBe(true);
    expect(evaluate(g, v)).toBe(false);
    // rows over P, Q, R: TTT, TTF, TFT, TFF, FTT, FTF, FFT, FFF
    expect(differingRows(f, g)).toEqual([3, 5]);
  });
  it('workbook c1 (Book of Proof, Exercise 2.5.10): ((P ∧ Q) ∨ R) ⇒ (R ∨ S) is false in exactly one row, P = Q = T, R = S = F', () => {
    expect(falsifying(parse('((P ∧ Q) ∨ R) ⇒ (R ∨ S)'))).toEqual([{ P: T, Q: T, R: F, S: F }]);
  });
});

describe('exact identities: the numbered laws of lesson 0.2 (each exhaustive, hence the lesson’s proof checked)', () => {
  it('Theorem 0.2.9: double negation and both De Morgan laws', () => {
    expect(eq('¬¬P', 'P')).toBe(true);
    expect(eq('¬(P ∧ Q)', '¬P ∨ ¬Q')).toBe(true);
    expect(eq('¬(P ∨ Q)', '¬P ∧ ¬Q')).toBe(true);
  });
  it('Theorem 0.2.10: commutative, associative and both distributive laws for ∧ and ∨', () => {
    expect(eq('P ∧ Q', 'Q ∧ P') && eq('P ∨ Q', 'Q ∨ P')).toBe(true);
    expect(eq('(P ∧ Q) ∧ R', 'P ∧ (Q ∧ R)') && eq('(P ∨ Q) ∨ R', 'P ∨ (Q ∨ R)')).toBe(true);
    expect(eq('P ∧ (Q ∨ R)', '(P ∧ Q) ∨ (P ∧ R)')).toBe(true);
    expect(eq('P ∨ (Q ∧ R)', '(P ∨ Q) ∧ (P ∨ R)')).toBe(true);
  });
  it('after Theorem 0.2.10 and workbook 5: ⇒ is neither commutative nor associative (rows FTF, FFF separate)', () => {
    expect(eq('P ⇒ Q', 'Q ⇒ P')).toBe(false);
    expect(differingRows(parse('P ⇒ (Q ⇒ R)'), parse('(P ⇒ Q) ⇒ R'))).toEqual([5, 7]);
  });
  it('Proposition 0.2.12 at n = 3 and n = 4: De Morgan for several formulas', () => {
    expect(eq('¬(P ∧ Q ∧ R)', '¬P ∨ ¬Q ∨ ¬R')).toBe(true);
    expect(eq('¬(P ∨ Q ∨ R ∨ S)', '¬P ∧ ¬Q ∧ ¬R ∧ ¬S')).toBe(true);
  });
  it('Lemma 0.2.7 (substitution), the instances the lesson uses: ¬¬Q ∨ ¬P for ¬Q ⇒ ¬P, ¬¬P ∧ ¬Q for ¬(¬P ∨ Q)', () => {
    expect(eq('¬Q ⇒ ¬P', '¬¬Q ∨ ¬P')).toBe(true);
    expect(eq('¬(¬P ∨ Q)', '¬¬P ∧ ¬Q')).toBe(true);
  });
  it('Proposition 0.2.6(א): A ≡ B exactly when A ⇔ B is a tautology', () => {
    expect(tautology(parse('(P ⇒ Q) ⇔ (¬P ∨ Q)'))).toBe(true);
    expect(tautology(parse('(P ⇒ Q) ⇔ (Q ⇒ P)'))).toBe(false);
    expect(tautology(parse('P ⇔ Q'))).toBe(false);
  });
  it('Theorem 0.2.17: modus ponens, chaining, cases and contradiction are tautologies', () => {
    for (const f of [
      '(P ∧ (P ⇒ Q)) ⇒ Q',
      '((P ⇒ Q) ∧ (Q ⇒ R)) ⇒ (P ⇒ R)',
      '((P ⇒ R) ∧ (Q ⇒ R)) ⇒ ((P ∨ Q) ⇒ R)',
      '(¬P ⇒ (Q ∧ ¬Q)) ⇒ P',
    ])
      expect(tautology(parse(f)), f).toBe(true);
  });
  it('after Theorem 0.2.17: affirming the conclusion and denying the hypothesis fail at P = F, Q = T', () => {
    expect(falsifying(parse('((P ⇒ Q) ∧ Q) ⇒ P'))).toEqual([{ P: F, Q: T }]);
    expect(falsifying(parse('((P ⇒ Q) ∧ ¬P) ⇒ ¬Q'))).toEqual([{ P: F, Q: T }]);
    expect(tautology(parse('((P ⇒ Q) ∧ ¬Q) ⇒ ¬P'))).toBe(true);
  });
  it('Corollary 0.2.18: what implies a contradiction is false', () => {
    expect(tautology(parse('(P ⇒ (Q ∧ ¬Q)) ⇒ ¬P'))).toBe(true);
  });
  it('workbook 8: (P ⇒ Q) ∧ (P ⇒ R) ≡ P ⇒ (Q ∧ R), and (P ⇒ R) ∨ (Q ⇒ R) ≡ (P ∧ Q) ⇒ R (false only at TTF)', () => {
    expect(eq('(P ⇒ Q) ∧ (P ⇒ R)', 'P ⇒ (Q ∧ R)')).toBe(true);
    expect(eq('(P ⇒ R) ∨ (Q ⇒ R)', '(P ∧ Q) ⇒ R')).toBe(true);
    expect(falsifying(parse('(P ⇒ R) ∨ (Q ⇒ R)'))).toEqual([{ P: T, Q: T, R: F }]);
  });
});
