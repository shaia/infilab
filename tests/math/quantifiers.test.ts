/** Two-quantifier statements over a finite relation (lesson 0.3's figure), filed by accuracy category. */

import { describe, expect, it } from 'vitest';
import {
  ORDERS,
  RELATIONS,
  bestFirstMoves,
  bestSecondMoves,
  counterexample,
  formulaText,
  holds,
  negatePrefix,
  negateRelation,
  orderId,
  pointOf,
  valuesOf,
  winner,
  witness,
  type OrderId,
  type Prefix,
  type Relation,
} from '~/math/quantifiers';

const ALL = Object.keys(ORDERS) as OrderId[];

/** every relation on a 3 × 3 grid: 2⁹ = 512 of them */
function* allRelations(n = 3): Generator<Relation> {
  for (let mask = 0; mask < 1 << (n * n); mask++) {
    yield { nx: n, ny: n, r: (x, y) => ((mask >> ((x - 1) * n + (y - 1))) & 1) === 1 };
  }
}

/** Does the prover win from the start against every refuter play, choosing among `bestMoves` only? */
function proverForcesWin(R: Relation, p: Prefix): boolean {
  const as = p.q1 === 'exists' ? bestFirstMoves(R, p) : valuesOf(R, p.v1);
  const quant1 = p.q1 === 'exists' ? 'some' : 'every';
  return as[quant1]((a) => {
    const bs = p.q2 === 'exists' ? bestSecondMoves(R, p, a) : valuesOf(R, p.v1 === 'x' ? 'y' : 'x');
    return p.q2 === 'exists' ? bs.some((b) => winner(R, p, a, b) === 'prover') : bs.every((b) => winner(R, p, a, b) === 'prover');
  });
}

describe('exact identities: negation', () => {
  it('the negation (every ∀ ↔ ∃, the condition negated) has the opposite truth value, on every 3×3 relation and order', () => {
    for (const R of allRelations()) {
      for (const id of ALL) expect(holds(negateRelation(R), negatePrefix(ORDERS[id]))).toBe(!holds(R, ORDERS[id]));
    }
  });
  it('negating twice gives the statement back', () => {
    for (const id of ALL) expect(orderId(negatePrefix(negatePrefix(ORDERS[id])))).toBe(id);
    expect(orderId(negatePrefix(ORDERS.AxEy))).toBe('ExAy');
    expect(orderId(negatePrefix(ORDERS.EyAx))).toBe('AyEx');
  });
  it('a false statement has a counterexample and no witness; a true one a witness and no counterexample', () => {
    for (const R of allRelations()) {
      for (const id of ALL) {
        const t = holds(R, ORDERS[id]);
        expect(witness(R, ORDERS[id]) !== null).toBe(t);
        expect(counterexample(R, ORDERS[id]) !== null).toBe(!t);
      }
    }
  });
});

describe('exact identities: order of quantifiers', () => {
  it('∃y ∀x ⇒ ∀x ∃y on every 3×3 relation (and ∃x ∀y ⇒ ∀y ∃x)', () => {
    for (const R of allRelations()) {
      if (holds(R, ORDERS.EyAx)) expect(holds(R, ORDERS.AxEy)).toBe(true);
      if (holds(R, ORDERS.ExAy)) expect(holds(R, ORDERS.AyEx)).toBe(true);
    }
  });
  it('the converse fails: some 3×3 relation has ∀x ∃y and not ∃y ∀x (the identity relation x = y)', () => {
    const eq: Relation = { nx: 3, ny: 3, r: (x, y) => x === y };
    expect(holds(eq, ORDERS.AxEy)).toBe(true);
    expect(holds(eq, ORDERS.EyAx)).toBe(false);
  });
  it('two quantifiers of the same kind commute: ∀x ∀y ⇔ ∀y ∀x and ∃x ∃y ⇔ ∃y ∃x', () => {
    for (const R of allRelations()) {
      expect(holds(R, ORDERS.AxAy)).toBe(holds(R, ORDERS.AyAx));
      expect(holds(R, ORDERS.ExEy)).toBe(holds(R, ORDERS.EyEx));
    }
  });
});

describe('exact identities: the game', () => {
  it('the statement is true exactly when the prover, playing best moves, wins against every refuter play', () => {
    for (const R of allRelations()) for (const id of ALL) expect(proverForcesWin(R, ORDERS[id])).toBe(holds(R, ORDERS[id]));
  });
  it('the refuter’s best moves win every game of a false statement, whatever the prover answers', () => {
    for (const R of allRelations()) {
      for (const id of ['AxEy', 'EyAx', 'ExAy', 'AyEx'] as OrderId[]) {
        const p = ORDERS[id];
        if (holds(R, p)) continue;
        if (p.q1 === 'forall') {
          for (const a of bestFirstMoves(R, p)) for (const b of valuesOf(R, p.v1 === 'x' ? 'y' : 'x')) expect(winner(R, p, a, b)).toBe('refuter');
        } else {
          for (const a of valuesOf(R, p.v1)) for (const b of bestSecondMoves(R, p, a)) expect(winner(R, p, a, b)).toBe('refuter');
        }
      }
    }
  });
  it('every witness point satisfies R, and a ∀∃ witness gives one point on each line', () => {
    for (const R of allRelations()) {
      for (const id of ALL) {
        const w = witness(R, ORDERS[id]);
        if (!w) continue;
        for (const [x, y] of w.points) expect(R.r(x, y)).toBe(true);
        if (ORDERS[id].q1 === 'forall' && ORDERS[id].q2 === 'exists') expect(w.points).toHaveLength(ORDERS[id].v1 === 'x' ? R.nx : R.ny);
      }
    }
  });
  it('the point of (v₁, v₂) = (a, b) puts a on its own axis', () => {
    expect(pointOf('x', 2, 5)).toEqual([2, 5]);
    expect(pointOf('y', 2, 5)).toEqual([5, 2]);
  });
});

describe('the presets the lesson states', () => {
  const T = (id: keyof typeof RELATIONS, o: OrderId) => holds(RELATIONS[id], ORDERS[o]);
  it('mother: every person has a mother (∀x ∃y), no woman is everyone’s mother (∃y ∀x fails), women 3 and 4 have no child', () => {
    expect(T('mother', 'AxEy')).toBe(true);
    expect(T('mother', 'EyAx')).toBe(false);
    expect(T('mother', 'AyEx')).toBe(false);
    expect(counterexample(RELATIONS.mother, ORDERS.AyEx)?.line).toEqual({ v: 'y', value: 3 });
    // each person has exactly one mother: one filled point in each column
    for (const x of [1, 2, 3, 4, 5, 6]) expect([1, 2, 3, 4, 5, 6].filter((y) => RELATIONS.mother.r(x, y))).toHaveLength(1);
  });
  it('master key: key 4 opens every lock, so ∃y ∀x and also ∀x ∃y; no lock is opened by every key (∃x ∀y fails)', () => {
    expect(witness(RELATIONS['master-key'], ORDERS.EyAx)?.line).toEqual({ v: 'y', value: 4 });
    expect(T('master-key', 'AxEy')).toBe(true);
    expect(T('master-key', 'ExAy')).toBe(false);
  });
  it('x + y even: ∀x ∃y (y = x) holds, ∃y ∀x fails', () => {
    expect(T('sum-even', 'AxEy')).toBe(true);
    expect(T('sum-even', 'EyAx')).toBe(false);
  });
  it('x divides y: ∃x ∀y holds with x = 1, while ∃y ∀x fails (no y ≤ 6 is a multiple of 1, …, 6; the least is 60)', () => {
    expect(witness(RELATIONS.divides, ORDERS.ExAy)?.line).toEqual({ v: 'x', value: 1 });
    expect(T('divides', 'EyAx')).toBe(false);
    expect(T('divides', 'AxEy')).toBe(true);
  });
  it('y > x on {1..6}: ∀x ∃y fails, and the counterexample is x = 6 (on ℕ it would hold)', () => {
    expect(T('greater', 'AxEy')).toBe(false);
    expect(counterexample(RELATIONS.greater, ORDERS.AxEy)?.line).toEqual({ v: 'x', value: 6 });
  });
  it('the figure, playing ∀ first in ∀x ∃y on mother, cannot win: every column has a filled point', () => {
    const p = ORDERS.AxEy;
    for (const a of bestFirstMoves(RELATIONS.mother, p)) expect(bestSecondMoves(RELATIONS.mother, p, a).every((b) => winner(RELATIONS.mother, p, a, b) === 'prover')).toBe(true);
  });
  it('the text of a statement and of its negation', () => {
    expect(formulaText(ORDERS.AxEy)).toBe('∀x ∃y: R(x,y)');
    expect(formulaText(negatePrefix(ORDERS.AxEy), true)).toBe('∃x ∀y: ¬R(x,y)');
  });
});
