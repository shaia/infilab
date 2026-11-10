/**
 * The proof-reading presets behind lesson 0.1's figure (ProofReader), filed by accuracy category. The "analytic"
 * category here is the mathematics the presets claim: each identity, inequality and counterexample a line or a
 * feedback string states is evaluated, so a preset never teaches a false line as justified.
 */

import { describe, expect, it } from 'vitest';
import { tex } from '~/lib/tex';
import {
  PRESETS,
  allJustified,
  allLabelled,
  emptyAnswers,
  gapFound,
  gapLines,
  hasGap,
  justScore,
  lineFeedback,
  linesOf,
  presetProblems,
  presetStrings,
  roleScore,
  type Answers,
  type ProofPreset,
} from '~/math/proofs';

const presets = Object.values(PRESETS);
const key = (p: ProofPreset): Answers => ({
  roles: Object.fromEntries(p.blocks.map((b) => [b.id, b.role])),
  justs: Object.fromEntries(linesOf(p).map((l) => [l.n, l.just])),
});
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe('exact identities: the mathematics the presets state', () => {
  it('even-sum: a + b = 2k + 2m = 2(k + m) for every integer k, m (and the example 6 + 10 = 16 = 2·8)', () => {
    for (const k of range(-20, 20)) for (const m of range(-20, 20)) expect(2 * k + 2 * m).toBe(2 * (k + m));
    expect(6 + 10).toBe(2 * 8);
  });
  it('square-ineq: x² + 1 − 2x = (x − 1)² ≥ 0, with equality only at x = 1 (and 3² + 1 = 10 ≥ 6)', () => {
    for (const x of [-7, -1.5, 0, 0.5, 1, 2, 3, 1e3]) {
      expect(x * x + 1 - 2 * x).toBeCloseTo((x - 1) ** 2, 9);
      expect(x * x + 1).toBeGreaterThanOrEqual(2 * x);
    }
    expect(3 ** 2 + 1).toBe(10);
    expect(1 ** 2 + 1).toBe(2 * 1);
  });
  it('backwards: a² + b² − 2ab = (a − b)², and the example 9 + 25 = 34 ≥ 30', () => {
    for (const a of range(-6, 6)) for (const b of range(-6, 6)) expect(a * a + b * b - 2 * a * b).toBe((a - b) ** 2);
    expect(3 ** 2 + 5 ** 2).toBe(34);
    expect(2 * 3 * 5).toBe(30);
  });
  it('sqrt-gap: line 5 is the claim itself; √(2k) need not be an integer (√2, √6), and 36 = 6² with 6 even', () => {
    expect(Number.isInteger(Math.sqrt(2))).toBe(false);
    expect(Number.isInteger(Math.sqrt(6))).toBe(false);
    expect(6 ** 2).toBe(36);
    // the claim is true on a window (0.4 proves it): every n ≤ 1000 with n² even is even
    for (const n of range(1, 1000)) if ((n * n) % 2 === 0) expect(n % 2).toBe(0);
  });
});

describe('exact grading: the key, and what counts as finding a gap', () => {
  it('every preset is structurally sound (ids, one proof block, lines numbered and using earlier lines only)', () => {
    for (const p of presets) expect(presetProblems(p)).toEqual([]);
  });
  it('the presets with a gap are exactly sqrt-gap (line 5) and backwards (line 1)', () => {
    expect(presets.filter(hasGap).map((p) => p.id).sort()).toEqual(['backwards', 'sqrt-gap']);
    expect(gapLines(PRESETS['sqrt-gap'])).toEqual([5]);
    expect(gapLines(PRESETS.backwards)).toEqual([1]);
  });
  it('the key scores full marks: every block labelled; a gap-free proof fully justified; a gap found', () => {
    for (const p of presets) {
      const a = key(p);
      expect(allLabelled(p, a)).toBe(true);
      expect(roleScore(p, a)).toEqual({ right: p.blocks.length, total: p.blocks.length });
      expect(justScore(p, a).right).toBe(linesOf(p).length);
      expect(allJustified(p, a)).toBe(!hasGap(p));
      expect(gapFound(p, a)).toBe(hasGap(p));
    }
  });
  it('no answers score nothing and tick nothing', () => {
    for (const p of presets) {
      const a = emptyAnswers();
      expect(roleScore(p, a).right).toBe(0);
      expect(allLabelled(p, a) || allJustified(p, a) || gapFound(p, a)).toBe(false);
    }
  });
  it('marking every line "no justification" does not find the gap', () => {
    for (const p of presets.filter(hasGap)) {
      const a: Answers = { roles: {}, justs: Object.fromEntries(linesOf(p).map((l) => [l.n, 'none'])) };
      expect(gapFound(p, a)).toBe(false);
    }
  });
  it('marking only the gap line finds it, whatever the other lines say (as long as they are not "none")', () => {
    const p = PRESETS['sqrt-gap'];
    expect(gapFound(p, { roles: {}, justs: { 5: 'none' } })).toBe(true);
    expect(gapFound(p, { roles: {}, justs: { 5: 'none', 2: 'algebra' } })).toBe(true);
    expect(gapFound(p, { roles: {}, justs: { 5: 'none', 6: 'none' } })).toBe(false);
  });
  it('one wrong line keeps a gap-free proof from counting as justified', () => {
    const p = PRESETS['even-sum'];
    const a = key(p);
    a.justs[4] = 'algebra';
    expect(allJustified(p, a)).toBe(false);
    expect(justScore(p, a)).toEqual({ right: 4, total: 5 });
  });
  it('feedback: the right pick explains and names the lines used; a wrong pick gets its specific hint', () => {
    const line = linesOf(PRESETS['even-sum'])[4];
    const right = lineFeedback(line, 'definition');
    expect(right.ok).toBe(true);
    expect(right.text).toContain('(3)');
    expect(right.text).toContain('(4)');
    const wrong = lineFeedback(line, 'hypothesis');
    expect(wrong.ok).toBe(false);
    expect(wrong.text).toBe(line.wrong!.hypothesis);
    expect(lineFeedback(line, 'known').ok).toBe(false);
  });
});

describe('exact identities of the texts: every string renders under strict KaTeX, as the build will', () => {
  it('no control characters (a single backslash before f, v, t, b, r or n in a TS string)', () => {
    for (const p of presets) for (const s of presetStrings(p)) expect(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s), s).toBe(false);
  });
  it('every string renders, with no Hebrew inside math', () => {
    for (const p of presets) {
      for (const s of presetStrings(p)) {
        expect(() => tex(s, p.id)).not.toThrow();
        for (const m of s.matchAll(/\$([^$]+)\$/g)) expect(/[֐-׿]/.test(m[1]), m[1]).toBe(false);
      }
    }
  });
});
