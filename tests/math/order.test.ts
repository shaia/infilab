/** The order axioms behind lesson 1.2's figure (OrderLine) and its worked examples, filed by accuracy category. */

import { describe, expect, it } from 'vitest';
import {
  absDef,
  apply,
  compatibleRankings,
  fmtValue,
  lexLess,
  maxDef,
  minDef,
  mod,
  multipleOfOne,
  orderEffect,
  pairMul,
  permutations,
  predictedEffect,
  rankingViolation,
  sqrtMinusOne,
  type OrderOp,
  type Pair,
} from '~/math/order';

/** the figure's grid: halves from −4 to 4 (a, b) and from −3 to 3 (c) */
const HALVES = Array.from({ length: 17 }, (_, i) => -4 + i / 2);
const C_GRID = Array.from({ length: 13 }, (_, i) => -3 + i / 2);
const OPS: OrderOp[] = ['add', 'mul', 'recip', 'square', 'abs'];
/** u = v as numbers: +0 and −0 are the same number (=== does not tell them apart; Object.is does) */
const same = (u: number, v: number, msg?: string) => expect(u === v, msg ?? `${u} = ${v}`).toBe(true);

describe('exact identities: the sign rules of lesson 1.2 predict every comparison the figure can show', () => {
  it('for every pair a < b on the grid, every map and every c, the theorem’s answer is the computed one', () => {
    let cases = 0;
    for (const op of OPS)
      for (const a of HALVES)
        for (const b of HALVES) {
          if (!(a < b)) continue;
          for (const c of op === 'add' || op === 'mul' ? C_GRID : [0]) {
            expect(orderEffect(op, a, b, c).effect, `${op} a=${a} b=${b} c=${c}`).toBe(predictedEffect(op, a, b, c).effect);
            cases++;
          }
        }
    expect(cases).toBeGreaterThan(3000);
  });
  it('multiplying by 0 collapses every pair, and 0 · x is +0 (no "−0" in a readout)', () => {
    expect(Object.is(apply('mul', -3, 0), 0)).toBe(true);
    expect(Object.is(apply('mul', 0, -2), 0)).toBe(true);
    expect(orderEffect('mul', -1, 2, 0).effect).toBe('equal');
  });
  it('the readout prints 1/x of a half x = k/2 as the exact 2/k: 2/3, −2, 0.5, −2/7', () => {
    expect(fmtValue('recip', 1.5, 1 / 1.5)).toBe('2/3');
    expect(fmtValue('recip', -0.5, -2)).toBe('−2');
    expect(fmtValue('recip', 2, 0.5)).toBe('0.5');
    expect(fmtValue('recip', -3.5, -1 / 3.5)).toBe('−2/7');
    expect(fmtValue('square', -1.5, 2.25)).toBe('2.25');
  });
  it('1/0 is undefined, and the figure says so instead of drawing a point', () => {
    expect(apply('recip', 0)).toBeNull();
    expect(orderEffect('recip', 0, 2).effect).toBe('undefined');
  });
  it('|x| and max, min agree with definition 1.2.11; |x| = max(x, −x) (1.2.12(ח)); max − min = |a − b| (W-1.2-03)', () => {
    for (const x of HALVES) {
      same(absDef(x), Math.abs(x));
      same(absDef(x), maxDef(x, -x));
      same(absDef(x) * absDef(x), x * x);
    }
    for (const a of HALVES)
      for (const b of HALVES) {
        same(maxDef(a, b) - minDef(a, b), absDef(a - b));
        same(maxDef(a, b) + minDef(a, b), a + b);
        same(absDef(a * b), absDef(a) * absDef(b));
        expect(absDef(a + b)).toBeLessThanOrEqual(absDef(a) + absDef(b));
        expect(absDef(a + b) === absDef(a) + absDef(b)).toBe(a * b >= 0);
        expect(Math.abs(absDef(a) - absDef(b))).toBeLessThanOrEqual(absDef(a - b));
      }
  });
});

describe('exact identities: the algebra in the worked examples and the workbook', () => {
  it('(1 + ab)² − (a + b)² = (1 − a²)(1 − b²) (ex-1-2-6) and b³ − a³ = (b − a)(a² + ab + b²) (ex-1-2-5)', () => {
    for (const a of HALVES)
      for (const b of HALVES) {
        same((1 + a * b) ** 2 - (a + b) ** 2, (1 - a * a) * (1 - b * b));
        same(b ** 3 - a ** 3, (b - a) * (a * a + a * b + b * b));
        // a² + ab + b² ≥ 0, and = 0 only at a = b = 0
        const q = a * a + a * b + b * b;
        expect(q >= 0).toBe(true);
        expect(q === 0).toBe(a === 0 && b === 0);
        // ad + bc < ac + bd when a < b, c < d (ex-1-2-3(ב)): the difference is (b − a)(d − c)
        for (const [c, d] of [[-1, 2], [0.5, 3]]) if (a < b) expect(a * d + b * c).toBeLessThan(a * c + b * d);
      }
  });
  it('|a|, |b| < 1 give |a + b| < 1 + ab, so |(a + b)/(1 + ab)| < 1 (ex-1-2-6); with |a| = 1 equality appears', () => {
    const inside = Array.from({ length: 39 }, (_, i) => -0.95 + i * 0.05);
    for (const a of inside)
      for (const b of inside) {
        expect(1 + a * b).toBeGreaterThan(0);
        expect(Math.abs((a + b) / (1 + a * b))).toBeLessThan(1);
      }
    expect((1 + 0.5) / (1 + 1 * 0.5)).toBe(1);
  });
  it('a² + b² + c² − ab − bc − ca is half a sum of squares (W-1.2-08), and |a + b| + |a − b| = 2 max(|a|, |b|) (W-1.2-07)', () => {
    for (const a of HALVES)
      for (const b of HALVES) {
        same(Math.abs(a + b) + Math.abs(a - b), 2 * Math.max(Math.abs(a), Math.abs(b)));
        for (const c of C_GRID) same(2 * (a * a + b * b + c * c - a * b - b * c - c * a), (a - b) ** 2 + (b - c) ** 2 + (c - a) ** 2);
      }
  });
  it('0 < a < b gives a < 2ab/(a + b) < b (W-1.2-04), and t/(1 + t) grows with t ≥ 0 (W-1.2-10)', () => {
    const pos = HALVES.filter((x) => x > 0);
    for (const a of pos)
      for (const b of pos) {
        if (a < b) {
          const h = (2 * a * b) / (a + b);
          expect(a < h && h < b).toBe(true);
          expect(a / (1 + a)).toBeLessThan(b / (1 + b));
        }
        const s = Math.abs(a - b);
        expect(Math.abs(a - b) / (1 + s)).toBeLessThanOrEqual(a / (1 + a) + b / (1 + b) + 1e-15);
      }
  });
});

describe('counterexamples quoted in the lesson, each evaluated', () => {
  it('subtracting inequalities fails: a = 0 < b = 1, c = 0 < d = 5, yet a − c = 0 > −4 = b − d', () => {
    expect(0 - 0).toBeGreaterThan(1 - 5);
  });
  it('multiplying inequalities needs signs: −2 < −1 twice, yet (−2)(−2) = 4 > 1 = (−1)(−1)', () => {
    expect((-2) * (-2)).toBeGreaterThan((-1) * (-1));
  });
  it('squaring needs a ≥ 0: −3 < 2 but 9 > 4; the reciprocal flips only for one sign: −1 < 1 and 1/−1 < 1/1', () => {
    expect(orderEffect('square', -3, 2).effect).toBe('reversed');
    expect(orderEffect('recip', -1, 1).effect).toBe('kept');
    expect(orderEffect('recip', 1, 2).effect).toBe('reversed');
    expect(orderEffect('recip', -2, -1).effect).toBe('reversed');
  });
  it('the triangle inequality is strict for opposite signs: |1 + (−1)| = 0 < 2', () => {
    expect(Math.abs(1 + -1)).toBeLessThan(Math.abs(1) + Math.abs(-1));
  });
  it('x < 1 does not give x² < 1 (W-1.2-02): x = −2', () => {
    expect((-2) ** 2).toBeGreaterThan(1);
  });
  it('a < b does not give a² + a < b² + b (W-1.2-05(א)): a = −1, b = 0 give 0 and 0', () => {
    expect((-1) ** 2 + -1).toBe(0 ** 2 + 0);
  });
});

describe('exhaustive search: rankings of ℤ_n and of pairs (evidence for 1.2.9 and 1.2.10; the lesson proves them)', () => {
  it('there are n! rankings of ℤ_n, 120 of ℤ_5 (the Predict)', () => {
    expect(permutations(5).length).toBe(120);
    expect(new Set(permutations(4).map((p) => p.join())).size).toBe(24);
  });
  it('no ranking of ℤ_n satisfies the order axioms, for n = 2, …, 7 (1.2.10 for the primes 2, 3, 5, 7)', () => {
    for (let n = 2; n <= 7; n++) expect(compatibleRankings(n), `n = ${n}`).toBe(0);
  });
  it('the ranking 0 < 1 < 2 < 3 < 4 of ℤ_5 breaks (ס3) (the bank: 1 < 4 would give 2 < 0)', () => {
    const v = rankingViolation(5, [0, 1, 2, 3, 4]);
    expect(v?.axiom).toBe('ס3');
    // the bank's witness: a = 1, b = 4, c = 1 gives 2 and 0, and 2 is not below 0
    expect([mod(1 + 1, 5), mod(4 + 1, 5)]).toEqual([2, 0]);
  });
  it('k·1 by recursion is r_n(k), so p·1 = 0 in ℤ_p (1.2.10)', () => {
    for (const n of [2, 3, 5, 7, 11]) for (let k = 1; k <= 3 * n; k++) expect(multipleOfOne(k, n)).toBe(mod(k, n));
    expect(multipleOfOne(5, 5)).toBe(0);
  });
  it('−1 is a square in ℤ_5 (2² = 4) and ℤ_13 (5² = 12), not in ℤ_3 or ℤ_7 (W-1.2-06; 1.2.9 does not cover ℤ_3)', () => {
    expect(sqrtMinusOne(5)).toEqual([2, 3]);
    expect(sqrtMinusOne(13)).toEqual([5, 8]);
    expect(sqrtMinusOne(3)).toEqual([]);
    expect(sqrtMinusOne(7)).toEqual([]);
  });
  it('the lexicographic ranking of pairs (a + bi) keeps (ס3) on a grid but breaks (ס4) at 0 < i, i · i = −1 < 0', () => {
    const grid: Pair[] = [];
    for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) grid.push([a, b]);
    for (const x of grid)
      for (const y of grid)
        for (const z of grid) if (lexLess(x, y)) expect(lexLess([x[0] + z[0], x[1] + z[1]], [y[0] + z[0], y[1] + z[1]])).toBe(true);
    const i: Pair = [0, 1];
    expect(lexLess([0, 0], i)).toBe(true);
    expect(pairMul(i, i)).toEqual([-1, 0]);
    expect(lexLess(pairMul(i, i), [0, 0])).toBe(true);
  });
});
