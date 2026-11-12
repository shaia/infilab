/** The set catalogue and construction helpers behind SupFinder (lessons 1.4-1.7), filed by accuracy category. */

import { describe, expect, it } from 'vitest';
import { relativeError } from '~/math/analysis';
import {
  SETS,
  SET_IDS,
  SUM_IDS,
  SUM_PAIRS,
  addPieces,
  archimedesN,
  bandWitness,
  density,
  findInBand,
  gridPoints,
  isLeastOnGrid,
  kthRoot,
  recipBelow,
  rootStep,
  sqrt2Witness,
  sumWitness,
  type Side,
  type SupSet,
} from '~/math/supsets';

/** the ε values a figure or a proof may use; the floor 1e-4 keeps terms of the sequences far from double precision */
const EPS = [100, 10, 3, 1, 0.5, 0.25, 0.1, 0.05, 0.01, 1e-3, 1e-4];
const SIDES: Side[] = ['sup', 'inf'];
const bound = (S: SupSet, side: Side) => (side === 'sup' ? S.sup : S.inf);
const attained = (S: SupSet, side: Side) => (side === 'sup' ? S.supAttained : S.infAttained);

describe('exact identities: the catalogue states the right sup, inf and attained flags', () => {
  it('the ids are the documented ones, each set once', () => {
    expect([...SET_IDS].sort()).toEqual(
      ['abs-ball', 'alternating', 'dyadic', 'finite', 'fraction', 'half-open', 'int-squares', 'naturals', 'open', 'ratio', 'reciprocals', 'sqrt2-rationals', 'squares', 'union-point'].sort(),
    );
    expect(SUM_IDS.sort()).toEqual(['sum-intervals', 'sum-sequences']);
  });

  it('exact values: the sup and inf of each preset, and whether they are attained (lessons 1.4-1.6)', () => {
    const want: Record<string, [number | null, boolean, number | null, boolean]> = {
      'half-open': [1, false, 0, true],
      open: [1, false, 0, false],
      'union-point': [2, true, 0, false],
      'int-squares': [3, true, -3, true],
      finite: [3.5, true, -1, true],
      fraction: [1, false, 0, false],
      'abs-ball': [7, false, -3, false],
      squares: [4, false, 0, true],
      'sqrt2-rationals': [Math.SQRT2, false, 0, false],
      reciprocals: [1, true, 0, false],
      ratio: [1, false, 0.5, true],
      dyadic: [1, false, 0.5, true],
      alternating: [1.5, true, -1, false],
      naturals: [null, false, 1, true],
    };
    for (const id of SET_IDS) {
      const S = SETS[id];
      const [sup, supAtt, inf, infAtt] = want[id];
      expect([id, S.sup, S.supAttained, S.inf, S.infAttained]).toEqual([id, sup, supAtt, inf, infAtt]);
    }
  });

  it('an attained end belongs to the set and an unattained finite end does not (lesson 1.4.7)', () => {
    for (const id of SET_IDS)
      for (const side of SIDES) {
        const S = SETS[id];
        const b = bound(S, side);
        if (b === null) continue;
        expect([id, side, S.contains(b)]).toEqual([id, side, attained(S, side)]);
      }
  });

  it('the listed elements all belong to the set and respect the bounds', () => {
    for (const id of SET_IDS) {
      const S = SETS[id];
      for (const x of S.points(400)) {
        expect([id, x, S.contains(x)]).toEqual([id, x, true]);
        if (S.sup !== null) expect(x).toBeLessThanOrEqual(S.sup + 1e-12);
        if (S.inf !== null) expect(x).toBeGreaterThanOrEqual(S.inf - 1e-12);
      }
    }
  });

  it('the sup and inf of a discrete set equal the extremes of its enumerated terms when attained', () => {
    for (const id of SET_IDS) {
      const S = SETS[id];
      if (S.kind !== 'points') continue;
      const pts = S.points(4000);
      if (S.sup !== null && S.supAttained) expect(Math.max(...pts)).toBe(S.sup);
      if (S.inf !== null && S.infAttained) expect(Math.min(...pts)).toBe(S.inf);
    }
  });

  it('piece sets: sup, inf and the flags come from the end pieces (the end of an interval, the point of a union)', () => {
    for (const id of SET_IDS) {
      const S = SETS[id];
      if (S.kind !== 'pieces') continue;
      const last = S.pieces[S.pieces.length - 1];
      const first = S.pieces[0];
      expect([id, S.sup, S.supAttained, S.inf, S.infAttained]).toEqual([id, last.hi, last.hiClosed, first.lo, first.loClosed]);
    }
  });

  it('A + B of two interval pieces adds the ends and closes an end only when both are closed: (0,1) + [2,3) = (2,4)', () => {
    const { A, B } = SUM_PAIRS['sum-intervals'];
    expect(addPieces(A.pieces, B.pieces)).toEqual([{ lo: 2, hi: 4, loClosed: false, hiClosed: false }]);
  });

  it('the set {x in Z : x^2 < 10} is exactly -3..3: 3^2 = 9 < 10 and 4^2 = 16 >= 10', () => {
    const S = SETS['int-squares'];
    expect([-4, -3, 0, 3, 4].map(S.contains)).toEqual([false, true, true, true, false]);
    expect(S.contains(2.5)).toBe(false);
  });
});

describe('analytic values: membership of the sequence sets follows their formulas', () => {
  it('1/n, n/(n+1), 1 - 2^-k, (-1)^n + 1/n at n, k = 1..40 are members; their neighbours are not', () => {
    for (let n = 1; n <= 40; n++) {
      expect(SETS.reciprocals.contains(1 / n)).toBe(true);
      expect(SETS.ratio.contains(n / (n + 1))).toBe(true);
      expect(SETS.dyadic.contains(1 - 2 ** -n)).toBe(true);
      expect(SETS.alternating.contains((-1) ** n + 1 / n)).toBe(true);
      expect(SETS.reciprocals.contains(1 / (n + 0.5))).toBe(false);
      expect(SETS.ratio.contains((n + 0.5) / (n + 1.5))).toBe(false);
      expect(SETS.dyadic.contains(1 - 2 ** -(n + 0.5))).toBe(false);
    }
    expect(SETS.alternating.contains(0)).toBe(true); // n = 1: -1 + 1
    expect(SETS.alternating.contains(1)).toBe(false); // would need n = infinity
    expect(SETS.alternating.contains(-1)).toBe(false);
  });

  it('rationals p/q below sqrt 2 are members; sqrt 2 and 1.5 are not (1.5^2 = 2.25 > 2)', () => {
    const S = SETS['sqrt2-rationals'];
    for (const [p, q] of [[1, 1], [4, 3], [7, 5], [24, 17], [41, 29], [1, 1000]]) expect(S.contains(p / q)).toBe(true);
    expect(S.contains(Math.SQRT2)).toBe(false);
    expect(S.contains(1.5)).toBe(false);
    expect(S.contains(0)).toBe(false);
    expect(S.contains(-0.5)).toBe(false);
  });

  it('upper and lower bounds are exactly M >= sup and m <= inf, checked against the elements on a grid of 0.05', () => {
    for (const id of SET_IDS) {
      const S = SETS[id];
      const pts = S.kind === 'points' ? S.points(4000) : [];
      for (let M = S.view[0]; M <= S.view[1] + 1e-9; M += 0.05) {
        const m = Math.round(M * 20) / 20;
        const above = S.exceeds(m);
        if (S.isUpperBound(m)) {
          expect(above).toBeNull();
          if (pts.length) expect(Math.max(...pts)).toBeLessThanOrEqual(m);
        } else {
          expect(above).not.toBeNull();
          expect(above!).toBeGreaterThan(m);
          expect(S.contains(above!)).toBe(true);
        }
        const below = S.undercuts(m);
        if (S.isLowerBound(m)) {
          expect(below).toBeNull();
          if (pts.length) expect(Math.min(...pts)).toBeGreaterThanOrEqual(m);
        } else {
          expect(below).not.toBeNull();
          expect(below!).toBeLessThan(m);
          expect(S.contains(below!)).toBe(true);
        }
      }
    }
  });

  it('naturals are not bounded above: for every M the element ⌊M⌋ + 1 (or 1) is a natural above M (lesson 1.6.1)', () => {
    const N = SETS.naturals;
    expect(N.isUpperBound(1e9)).toBe(false);
    for (const M of [-5, 0, 0.5, 1, 2.999, 3, 3.5, 100, 1e6]) {
      const n = N.exceeds(M)!;
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(M);
      expect(n === 1 || n - 1 <= M).toBe(true); // the first one: n - 1 is not above M
    }
    expect(N.witness(0.1, 'sup')).toBeNull();
  });

  it('isLeastOnGrid: the least bound on the 0.05 grid is sup (on the grid) or the first grid point above it', () => {
    expect(isLeastOnGrid(SETS['half-open'], 'sup', 1, 0.05)).toBe(true);
    expect(isLeastOnGrid(SETS['half-open'], 'sup', 1.05, 0.05)).toBe(false);
    expect(isLeastOnGrid(SETS['half-open'], 'sup', 0.95, 0.05)).toBe(false);
    expect(isLeastOnGrid(SETS['sqrt2-rationals'], 'sup', 1.45, 0.05)).toBe(true);
    expect(isLeastOnGrid(SETS['sqrt2-rationals'], 'sup', 1.4, 0.05)).toBe(false);
    expect(isLeastOnGrid(SETS['union-point'], 'inf', 0, 0.05)).toBe(true);
    expect(isLeastOnGrid(SETS['union-point'], 'inf', -0.05, 0.05)).toBe(false);
  });
});

describe('witnesses: the element the proof of 1.4.8 produces lies in the set and inside the band', () => {
  for (const id of SET_IDS)
    for (const side of SIDES)
      it(`${id}, ${side}: for ε from 100 down to 1e-4 the witness belongs to the set and lies within ε of the bound`, () => {
        const S = SETS[id];
        const b = bound(S, side);
        for (const eps of EPS) {
          const w = S.witness(eps, side);
          if (b === null) {
            expect(w).toBeNull();
            continue;
          }
          expect([eps, w === null]).toEqual([eps, false]);
          expect([eps, S.contains(w!)]).toEqual([eps, true]);
          if (side === 'sup') {
            expect(w!).toBeGreaterThan(b - eps);
            expect(w!).toBeLessThanOrEqual(b);
          } else {
            expect(w!).toBeLessThan(b + eps);
            expect(w!).toBeGreaterThanOrEqual(b);
          }
        }
      });

  it('closed forms: inf{1/n} uses n = ⌊1/ε⌋ + 1, sup{n/(n+1)} the same n; the n is the least one that works', () => {
    for (const eps of EPS.filter((e) => e < 1)) {
      const n = recipBelow(eps);
      expect(1 / n).toBeLessThan(eps);
      expect(1 / (n - 1)).toBeGreaterThanOrEqual(eps - 1e-12); // n - 1 does not work (n >= 2 here)
      expect(SETS.reciprocals.witness(eps, 'inf')).toBe(1 / n);
      expect(SETS.ratio.witness(eps, 'sup')).toBe(n / (n + 1));
    }
  });

  it('alternating, inf: the witness is -1 + 1/(2k+1) with k = ⌊1/ε⌋ + 1 (worked example 3 of lesson 1.6: n = 23 at ε = 0.1)', () => {
    expect(SETS.alternating.witness(0.1, 'inf')).toBe(-1 + 1 / 23);
    for (const eps of EPS) {
      const k = recipBelow(eps);
      expect(SETS.alternating.witness(eps, 'inf')).toBe(-1 + 1 / (2 * k + 1));
      expect(1 / k).toBeLessThan(eps);
      expect(SETS.alternating.witness(eps, 'inf')!).toBeLessThan(-1 + eps);
    }
  });

  it('x/(1+x): the witness 1/(1+ε) is the image of x = 1/ε and exceeds 1 - ε; ε/(1+ε) is the image of x = ε', () => {
    for (const eps of EPS) {
      expect(relativeError(SETS.fraction.witness(eps, 'sup')!, (1 / eps) / (1 + 1 / eps))).toBeLessThan(1e-12);
      expect(SETS.fraction.witness(eps, 'sup')!).toBeGreaterThan(1 - eps);
      expect(relativeError(SETS.fraction.witness(eps, 'inf')!, eps / (1 + eps))).toBeLessThan(1e-12);
    }
  });

  it('{x^2 : x in (-1,2)}: the sup witness is the square of some x in (-1,2), for every ε', () => {
    for (const eps of EPS) {
      const w = SETS.squares.witness(eps, 'sup')!;
      const x = Math.sqrt(w);
      expect(x).toBeLessThan(2);
      expect(x).toBeGreaterThan(-1);
      expect(w).toBeGreaterThan(4 - eps);
    }
  });

  it('dyadic: the witness has the least k with 2^-k < ε, so the one before does not work', () => {
    for (const eps of EPS.filter((e) => e < 1)) {
      const w = SETS.dyadic.witness(eps, 'sup')!;
      const k = Math.round(-Math.log2(1 - w));
      expect(2 ** -k).toBeLessThan(eps);
      if (k > 1) expect(2 ** -(k - 1)).toBeGreaterThanOrEqual(eps);
    }
  });

  it('sqrt 2 rationals: p/q from the map r -> (2r+2)/(r+2) satisfies p^2 < 2q^2 in integers and is within ε of sqrt 2', () => {
    for (const eps of [...EPS, 1e-8, 1e-10]) {
      const { p, q } = sqrt2Witness(eps);
      expect(p * p).toBeLessThan(2 * q * q);
      expect(Number.isSafeInteger(p * p) && Number.isSafeInteger(2 * q * q)).toBe(true);
      expect(Math.SQRT2 - p / q).toBeLessThan(eps);
      expect(p / q).toBeGreaterThan(0);
    }
  });

  it('the map r -> (2r+2)/(r+2) sends r with r^2 < 2 to a larger r with r^2 < 2 (lesson 1.5.3), on 1000 rationals', () => {
    for (let q = 1; q <= 40; q++)
      for (let p = 1; p * p < 2 * q * q; p++) {
        const num = 2 * p + 2 * q;
        const den = p + 2 * q;
        expect(num * num).toBeLessThan(2 * den * den);
        expect(num * q).toBeGreaterThan(p * den);
      }
  });
});

describe('probes: the band of lesson 1.4.8 around a candidate M', () => {
  it('at M = sup the band (M - ε, M] holds an element for every ε, and at M = inf the band [M, M + ε) does', () => {
    for (const id of SET_IDS)
      for (const side of SIDES) {
        const S = SETS[id];
        const b = bound(S, side);
        if (b === null) continue;
        for (const eps of EPS) expect([id, side, eps, bandWitness(S, side, b, eps) !== null]).toEqual([id, side, eps, true]);
      }
  });

  it('at an upper bound M above the sup the band is empty once ε < M - sup (so M - ε is a smaller bound)', () => {
    for (const id of SET_IDS) {
      const S = SETS[id];
      if (S.sup === null) continue;
      const M = S.sup + 0.5;
      expect(bandWitness(S, 'sup', M, 0.25)).toBeNull();
      expect(bandWitness(S, 'sup', M, 0.25 + 0.5) !== null).toBe(true); // ε > M - sup reaches the set
      expect(S.isUpperBound(M - 0.25)).toBe(true);
    }
  });

  it('an element found in a band lies in the band and in the set', () => {
    const cases: [string, number, number, boolean, boolean][] = [
      ['half-open', 0.8, 1, false, true],
      ['union-point', 1.5, 2.5, false, true],
      ['reciprocals', 0, 0.01, true, false],
      ['alternating', -1, -0.99, true, false],
      ['int-squares', 0.5, 2.5, false, true],
    ];
    for (const [id, lo, hi, lc, hc] of cases) {
      const S = SETS[id as keyof typeof SETS];
      const x = findInBand(S, lo, hi, lc, hc, 'low');
      expect([id, x === null]).toEqual([id, false]);
      expect(S.contains(x!)).toBe(true);
      expect(lc ? x! >= lo : x! > lo).toBe(true);
      expect(hc ? x! <= hi : x! < hi).toBe(true);
    }
    expect(findInBand(SETS['half-open'], 1, 1.5, true, true)).toBeNull(); // 1 is not in [0,1)
    expect(findInBand(SETS['half-open'], 0, 0, true, true)).toBe(0); // the one-point band [0,0]
    expect(findInBand(SETS['union-point'], 1.2, 1.9, true, true)).toBeNull(); // the gap
  });
});

describe('sums of sets: sup(A+B) = sup A + sup B (lesson 1.5.7)', () => {
  it('the stated sup, inf and attained flags of A+B follow the summands', () => {
    for (const id of SUM_IDS) {
      const { A, B, AB } = SUM_PAIRS[id];
      expect(AB.sup).toBe(A.sup! + B.sup!);
      expect(AB.inf).toBe(A.inf! + B.inf!);
      expect(AB.supAttained).toBe(A.supAttained && B.supAttained);
      expect(AB.infAttained).toBe(A.infAttained && B.infAttained);
    }
    expect(SUM_PAIRS['sum-intervals'].AB.sup).toBe(4);
    expect(SUM_PAIRS['sum-intervals'].AB.inf).toBe(2);
    expect(SUM_PAIRS['sum-sequences'].AB.sup).toBe(2);
    expect(SUM_PAIRS['sum-sequences'].AB.inf).toBe(0.5);
    expect(SUM_PAIRS['sum-sequences'].AB.supAttained).toBe(false);
    expect(SUM_PAIRS['sum-sequences'].AB.infAttained).toBe(false);
  });

  it('the enumerated sums stay below the sup and above the inf, and approach them', () => {
    const { AB } = SUM_PAIRS['sum-sequences'];
    const pts = AB.points(30);
    expect(Math.max(...pts)).toBeLessThan(AB.sup!);
    expect(Math.min(...pts)).toBeGreaterThan(AB.inf!);
    expect(AB.sup! - Math.max(...pts)).toBeLessThan(0.04); // 1 + 30/31 = 1.9677
    expect(Math.min(...pts) - AB.inf!).toBeLessThan(0.04);
    for (const x of pts) expect(AB.contains(x)).toBe(true);
    expect(AB.contains(1.55)).toBe(false);
  });

  it('the witnesses a, b within ε/2 give c = a + b in A + B within ε of the sup (inf), for both pairs', () => {
    for (const id of SUM_IDS)
      for (const side of SIDES)
        for (const eps of [10, 1, 0.5, 0.1, 0.04]) {
          const pair = SUM_PAIRS[id];
          const w = sumWitness(pair, eps, side)!;
          expect(pair.A.contains(w.a)).toBe(true);
          expect(pair.B.contains(w.b)).toBe(true);
          expect([id, side, eps, pair.AB.contains(w.c)]).toEqual([id, side, eps, true]);
          if (side === 'sup') expect(w.c).toBeGreaterThan(pair.AB.sup! - eps);
          else expect(w.c).toBeLessThan(pair.AB.inf! + eps);
        }
  });
});

describe('exact identities: the Archimedean and density constructions (lesson 1.6)', () => {
  it('archimedesN(M) is the first natural above M: n > M and (n = 1 or n - 1 <= M)', () => {
    for (const M of [-3, 0, 0.5, 0.99, 1, 1.01, 2, 9.99, 10, 10.01, 99.5, 1000, 123456.7]) {
      const n = archimedesN(M);
      expect(n).toBeGreaterThan(M);
      expect(n === 1 || n - 1 <= M).toBe(true);
    }
  });

  it('archimedesN(M, c) is the first n with n·c > M (form (ג) of 1.6.2)', () => {
    for (const [M, c] of [[10, 0.5], [7, 2], [0, 3], [-4, 1], [1, 0.01], [100, 7]]) {
      const n = archimedesN(M, c);
      expect(n * c).toBeGreaterThan(M);
      expect(n === 1 || (n - 1) * c <= M).toBe(true);
    }
  });

  it('density: for 3000 pairs a < b on a grid of hundredths, n > 1/(b-a) is least, q = m/n lies in (a,b) and is the first fraction k/n above a', () => {
    let pairs = 0;
    for (let ia = -250; ia < 250; ia += 7)
      for (let w = 1; w <= 60; w += 1) {
        const a = ia / 100;
        const b = (ia + w) / 100;
        const d = density(a, b);
        pairs++;
        expect(d.n * (b - a)).toBeGreaterThan(1 - 1e-9);
        expect(d.n === 1 || (d.n - 1) * (b - a) <= 1 + 1e-9).toBe(true);
        expect(d.inside).toBe(true);
        expect(d.q).toBeGreaterThan(a);
        expect(d.q).toBeLessThan(b);
        expect(d.q - 1 / d.n).toBeLessThanOrEqual(a + 1e-12); // the fraction before q is not above a
        expect(d.count).toBeGreaterThanOrEqual(1);
        expect(gridPoints(d.n, a, b)).toContain(d.q);
      }
    expect(pairs).toBeGreaterThan(3000);
  });

  it('density: a worked case, (0.31, 0.36): n = 21, m = ⌊6.51⌋ + 1 = 7, q = 1/3', () => {
    const d = density(0.31, 0.36);
    expect([d.n, d.m]).toEqual([21, 7]);
    expect(relativeError(d.q, 1 / 3)).toBeLessThan(1e-15);
    expect(d.count).toBe(1); // 8/21 = 0.381 is already outside
  });

  it('density with a chosen n too small can miss the interval: n = 2 on (0.31, 0.36)', () => {
    const d = density(0.31, 0.36, 2);
    expect(d.inside).toBe(false);
    expect(d.count).toBe(0);
  });

  it('gridPoints lists exactly the k/n in the range, ascending', () => {
    expect(gridPoints(4, 0, 1)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(gridPoints(3, -0.5, 0.5)).toEqual([-1 / 3, 0, 1 / 3]);
  });
});

describe('analytic values: roots by bisection and the step of lemma 1.7.1', () => {
  it('kthRoot(a, k)^k = a to a relative 1e-12, and kthRoot(x^k, k) = x', () => {
    for (const k of [1, 2, 3, 4, 5, 6])
      for (const a of [0.25, 0.5, 1, 2, 3, 7.5, 10, 20]) {
        const s = kthRoot(a, k);
        expect([k, a, relativeError(s ** k, a) < 1e-12]).toEqual([k, a, true]);
      }
    for (const [x, k] of [[1.5, 2], [2, 5], [0.3, 3], [4, 1]]) expect(relativeError(kthRoot(x ** k, k), x)).toBeLessThan(1e-12);
    expect(relativeError(kthRoot(2, 2), Math.SQRT2)).toBeLessThan(1e-14);
  });

  it('below the root (x^k < a): x + h lies in S = {y >= 0 : y^k < a} and the estimate (x+h)^k - x^k <= h·k(x+1)^(k-1) holds', () => {
    for (const k of [1, 2, 3, 4, 6])
      for (const a of [0.5, 2, 7, 20]) {
        const s = kthRoot(a, k);
        for (let i = 0; i < 40; i++) {
          const x = (s * i) / 40.5;
          const r = rootStep(x, a, k);
          expect([k, a, x, r.kind]).toEqual([k, a, x, 'below']);
          expect(r.h).toBeGreaterThan(0);
          expect(r.h).toBeLessThanOrEqual(1);
          expect(r.moved ** k).toBeLessThan(a);
          expect(r.gap).toBeLessThanOrEqual(r.gapBound * (1 + 1e-12) + 1e-12);
          expect(r.gapBound).toBeLessThan(a - r.xk); // strictly below the room that is left
        }
      }
  });

  it('above the root (x^k > a): x - h is still an upper bound of S, smaller than x, and the estimate x^k - (x-h)^k <= h·k·x^(k-1) holds', () => {
    for (const k of [1, 2, 3, 4, 6])
      for (const a of [0.5, 2, 7, 20]) {
        const s = kthRoot(a, k);
        for (let i = 1; i <= 40; i++) {
          const x = s * (1 + i / 10);
          const r = rootStep(x, a, k);
          expect([k, a, x, r.kind]).toEqual([k, a, x, 'above']);
          expect(r.h).toBeGreaterThan(0);
          expect(r.h).toBeLessThan(x / k + 1e-12);
          expect(r.moved).toBeGreaterThanOrEqual(0);
          expect(r.moved).toBeLessThan(x);
          expect(relativeError(Math.max(r.moved ** k, a), r.moved ** k)).toBeLessThan(1e-9); // (x-h)^k >= a
          expect(r.gap).toBeLessThanOrEqual(r.gapBound * (1 + 1e-9) + 1e-12);
          expect(r.moved).toBeGreaterThanOrEqual(s * (1 - 1e-9)); // an upper bound of S is at least s
        }
      }
  });

  it('at the root itself neither case applies: kind equal, h = 0', () => {
    for (const [a, k] of [[2, 2], [8, 3], [10, 4], [0.5, 5]]) {
      const r = rootStep(kthRoot(a, k), a, k);
      expect([a, k, r.kind, r.h]).toEqual([a, k, 'equal', 0]);
    }
    expect(rootStep(0, 2, 2).kind).toBe('below');
  });
});

describe('absolute bounds against an exact 0', () => {
  it('the inf of {1/n}: 1/n - 0 stays positive for every listed n (the inf is 0, attained by nothing)', () => {
    // exact 0: an absolute bound, since a relative error against 0 is undefined
    for (const x of SETS.reciprocals.points(400)) expect(x - 0).toBeGreaterThan(0);
    expect(SETS.reciprocals.points(4000)[0]).toBeLessThan(1 / 3999);
  });
});
