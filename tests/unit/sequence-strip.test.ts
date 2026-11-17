/** SequenceStrip's state, text steps and task conditions (src/sims/strip/model.ts), without a DOM. */

import { describe, expect, it } from 'vitest';
import { EPSILONS } from '~/math/sequences';
import {
  analyse,
  applyStep,
  fresh,
  nearestEps,
  taskKey,
  tasksFor,
  type SequenceStripProps,
  type StripState,
  type TaskContext,
} from '~/sims/strip/model';

const ALL = [
  'find-N',
  'narrow',
  'wild',
  'no-N',
  'estimate',
  'no-limit',
  'bound-all',
  'sum-N',
  'product-N',
  'cancel',
  'squeeze',
  'outer-differ',
  'find-N-M',
  'no-N-M',
  'cauchy-N',
  'harmonic-grows',
];

const ctxOf = (stepKey: string | null = null): TaskContext => ({ tasks: ALL, stepKey, triedL: new Map() });
const ei = (e: number) => nearestEps(e);

/** the student's change `patch` from `prev`: the tasks it ticks */
function act(prev: StripState, patch: Partial<StripState>, ctx = ctxOf()) {
  const next = { ...prev, ...patch };
  return tasksFor(prev, patch, next, analyse(next), ctx);
}

const start = (p: Partial<SequenceStripProps>) => fresh({ id: 'fig', ...p });

describe('state and text steps', () => {
  it('lesson 2.2’s props give mode limit on 1/n, as before', () => {
    const s = start({ seq: 'recip', eps: 0.1, N: 0 });
    expect(s).toMatchObject({ mode: 'limit', seq: 'recip', N: 0, L: 0, showMin: false });
    expect(EPSILONS[s.ei]).toBe(0.1);
  });
  it('a preset that does not fit the mode is replaced by the first offered one that does', () => {
    expect(start({ mode: 'combine', seq: 'recip', seqs: ['recip', 'pair-cancel'] }).seq).toBe('pair-cancel');
    expect(start({ mode: 'sandwich' }).seq).toBe('floor-x');
    expect(start({ mode: 'infinite' })).toMatchObject({ seq: 'sqrt-n', M: 4 });
  });
  it('the quotient is not defined on pair-cancel: the op falls back to sum', () => {
    expect(start({ mode: 'combine', seq: 'pair-cancel', op: 'quotient' }).op).toBe('sum');
    expect(start({ mode: 'combine', seq: 'pair-sum', op: 'quotient' }).op).toBe('quotient');
  });
  it('a step switches mode and preset, resets L and M, and ignores what does not fit', () => {
    const props = { id: 'fig', seqs: ['recip', 'ratio3'] } as SequenceStripProps;
    const s0 = fresh(props);
    const s1 = applyStep(s0, { mode: 'bound', seq: 'ratio3', M: 3.33333 }, props);
    expect(s1).toMatchObject({ mode: 'bound', seq: 'ratio3', L: 3, M: 3.35 });
    const s2 = applyStep(s1, { mode: 'sandwich', seq: 'ratio3' }, props);
    expect(s2).toMatchObject({ mode: 'sandwich', seq: 'floor-x', L: Math.SQRT2 });
    const s3 = applyStep(s2, { mode: 'combine', op: 'product', eps: 0.05, N: 12, showMin: true }, props);
    expect(s3).toMatchObject({ mode: 'combine', seq: 'pair-sum', op: 'product', L: 2, N: 12, showMin: true });
    expect(applyStep(s3, { bogus: 1, seq: 'nope' }, props)).toEqual(s3);
  });
});

describe('task conditions', () => {
  it('estimate: ratio3, ε ≤ 0.01, N moved to the smallest N (498)', () => {
    const s = start({ seq: 'ratio3', eps: 0.01, N: 400 });
    expect(act(s, { N: 498 })).toContain('estimate');
    expect(act(s, { N: 497 })).not.toContain('estimate');
    expect(act(s, { N: 499 })).not.toContain('estimate');
    expect(act({ ...s, ei: ei(0.02) }, { N: 248 })).not.toContain('estimate');
  });
  it('a new task never ticks in the exact state the last text step produced; 2.2’s keep their rule', () => {
    const s = start({ seq: 'ratio3', eps: 0.01, N: 400 });
    const stepped = { ...s, N: 498 };
    expect(act(s, { N: 498 }, ctxOf(taskKey(stepped)))).not.toContain('estimate');
    const r = start({ seq: 'recip', eps: 0.1, N: 3 });
    expect(act(r, { N: 10 }, ctxOf(taskKey({ ...r, N: 10 })))).toContain('find-N');
  });
  it('picking a preset or a mode never ticks a new task', () => {
    const s = { ...start({ mode: 'combine', seq: 'pair-sum', eps: 0.1, N: 5 }) };
    expect(act(s, { seq: 'pair-cancel', N: 0, L: 1 })).toEqual([]);
  });
  it('no-limit: three different L with N ≥ 30 and no N fitting, on the same preset', () => {
    const ctx = ctxOf();
    let s = start({ seq: 'sign', eps: 0.5, N: 0 });
    expect(act(s, { N: 30 }, ctx)).not.toContain('no-limit'); // records L = 1
    s = { ...s, N: 30 };
    expect(act(s, { L: 0 }, ctx)).not.toContain('no-limit'); // records L = 0
    s = { ...s, L: 0 };
    expect(act(s, { N: 31 }, ctx)).not.toContain('no-limit'); // the same L again: not a new try
    expect(act(s, { L: -0.5 }, ctx)).toContain('no-limit');
    // N below 30 records nothing
    const c2 = ctxOf();
    const a = start({ seq: 'alt-ratio', eps: 0.3, N: 29 });
    for (const L of [-1, 0, 1]) expect(act({ ...a, L: 0.2 }, { L }, c2)).not.toContain('no-limit');
  });
  it('bound-all: on quad3 (max a₆ = 114/37 ≈ 3.081), M = 3.1 ticks, 3.05 and 3.15 do not; never on a divergent preset', () => {
    const s = start({ mode: 'bound', seq: 'quad3', M: 2 });
    expect(act(s, { M: 3.1 })).toContain('bound-all');
    expect(act(s, { M: 3.05 })).not.toContain('bound-all');
    expect(act(s, { M: 3.15 })).not.toContain('bound-all');
    const r = start({ mode: 'bound', seq: 'ratio3', M: 2 });
    const max = analyse(r).bound!.max;
    expect(act(r, { M: Math.ceil(max * 20) / 20 })).toContain('bound-all');
    const sq = start({ mode: 'bound', seq: 'sqrt-n', M: 2 });
    expect(act(sq, { M: 6.35 })).not.toContain('bound-all');
  });
  it('the proof’s bound is reported for the student’s N, with whether it fits ε = 1', () => {
    const s = { ...start({ mode: 'bound', seq: 'ratio3', M: 2, showMin: true }), N: 3 };
    expect(analyse(s).bound).toMatchObject({ proof: 4, fits1: true });
    expect(analyse({ ...s, N: 2 }).bound!.fits1).toBe(false);
  });
  it('sum-N and product-N: pair-sum, ε ≤ 0.05, N fits cₙ (smallest 358 and 317)', () => {
    const s = start({ mode: 'combine', seq: 'pair-sum', op: 'sum', eps: 0.05, N: 100 });
    expect(analyse(s).minN).toBe(358);
    expect(act(s, { N: 358 })).toContain('sum-N');
    expect(act(s, { N: 357 })).not.toContain('sum-N');
    const p = { ...s, op: 'product' as const, L: 2 };
    expect(analyse(p).minN).toBe(317);
    expect(act(p, { N: 317 })).toContain('product-N');
    expect(act(p, { N: 317 })).not.toContain('sum-N');
    expect(act({ ...s, ei: ei(0.1) }, { N: 400 })).toEqual([]);
  });
  it('the proof’s N₁, N₂ for the sum at ε = 0.05: ε/2 on each sequence', () => {
    const s = start({ mode: 'combine', seq: 'pair-sum', op: 'sum', eps: 0.05, showMin: true });
    const c = analyse(s).combine!;
    expect(c.tol).toEqual({ epsA: 0.025, epsB: 0.025 });
    expect([c.N1, c.N2]).toEqual([40, 1600]);
  });
  it('cancel: pair-cancel, op sum, ε ≤ 0.1, N moved: cₙ ≡ 1 fits although aₙ, bₙ diverge', () => {
    const s = start({ mode: 'combine', seq: 'pair-cancel', eps: 0.1 });
    expect(act(s, { N: 7 })).toContain('cancel');
    expect(act({ ...s, ei: ei(0.2) }, { N: 7 })).not.toContain('cancel');
    expect(act({ ...s, op: 'product', L: 0 }, { N: 7 })).not.toContain('cancel');
    expect(act(s, { N: 7 })).not.toContain('sum-N');
  });
  it('squeeze: ε ≤ 0.05 and N fits both outer sequences (floor-x: N = 20)', () => {
    const s = start({ mode: 'sandwich', seq: 'floor-x', eps: 0.05 });
    expect(act(s, { N: 20 })).toContain('squeeze');
    expect(act(s, { N: 19 })).not.toContain('squeeze');
    const n = analyse({ ...s, N: 20 });
    expect(n.works).toBe(true);
  });
  it('outer-differ: ε ≤ 0.2, N ≥ 30, no N fits the middle', () => {
    const s = start({ mode: 'sandwich', seq: 'outer-differ', eps: 0.2 });
    expect(s.L).toBe(0);
    expect(act(s, { N: 30 })).toContain('outer-differ');
    expect(act(s, { N: 29 })).not.toContain('outer-differ');
    expect(act({ ...s, ei: ei(0.3) }, { N: 40 })).not.toContain('outer-differ');
    expect(act(s, { N: 40 })).not.toContain('squeeze');
  });
  it('find-N-M: √n, M ≥ 10, N moved to ⌊M²⌋', () => {
    const s = start({ mode: 'infinite', seq: 'sqrt-n', M: 10 });
    expect(act(s, { N: 100 })).toContain('find-N-M');
    expect(act(s, { N: 101 })).not.toContain('find-N-M');
    expect(act({ ...s, M: 10.5 }, { N: 110 })).toContain('find-N-M');
    expect(act({ ...s, M: 9.5 }, { N: 90 })).not.toContain('find-N-M');
  });
  it('no-N-M: zigzag, M ≥ 5, N ≥ 30, no N', () => {
    const s = start({ mode: 'infinite', seq: 'zigzag', M: 5 });
    expect(act(s, { N: 30 })).toContain('no-N-M');
    expect(act({ ...s, M: 0 }, { N: 30 })).not.toContain('no-N-M');
    expect(act(s, { N: 29 })).not.toContain('no-N-M');
  });
  it('neg-quad → −∞: the region below M, N = ⌊5 + √(25 − M)⌋', () => {
    const s = start({ mode: 'infinite', seq: 'neg-quad' });
    expect(s.M).toBe(-500);
    const a = analyse(s);
    expect(a.infinite!.dir).toBe(-1);
    expect(a.minN).toBe(27);
  });
  it('cauchy-N: Σ 1/k², ε ≤ 0.05, N moved to the smallest N whose tail width < ε (19)', () => {
    const s = start({ mode: 'cauchy', seq: 'inv-sq-sum', eps: 0.05 });
    expect(act(s, { N: 19 })).toContain('cauchy-N');
    expect(act(s, { N: 20 })).not.toContain('cauchy-N');
    expect(analyse({ ...s, N: 18 }).works).toBe(false);
  });
  it('harmonic-grows: Hₙ, ε ≤ 0.5, N moved to ≥ 100 and the tail stays wide', () => {
    const s = start({ mode: 'cauchy', seq: 'harmonic', eps: 0.5 });
    expect(act(s, { N: 100 })).toContain('harmonic-grows');
    expect(act(s, { N: 99 })).not.toContain('harmonic-grows');
    expect(analyse({ ...s, N: 500 }).cauchy!.below).toBe(false);
  });
  it('lesson 2.2’s tasks still tick exactly as before', () => {
    const r = start({ seq: 'recip', eps: 0.1, N: 0 });
    expect(act(r, { N: 10 })).toContain('find-N');
    expect(act(r, { N: 9 })).not.toContain('find-N');
    expect(act({ ...r, N: 50 }, { ei: ei(0.02) })).toContain('narrow');
    const w = start({ seq: 'wild-start', eps: 0.1 });
    expect(act(w, { N: 10 })).toContain('wild');
    const g = start({ seq: 'sign', eps: 0.5 });
    expect(g.L).toBe(1);
    expect(act(g, { N: 30 })).toContain('no-N');
  });
});
