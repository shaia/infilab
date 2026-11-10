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
    // the claim is true on a window (lesson 0.1 proves it, טענה 0.1.6): every n ≤ 1000 with n² even is even
    for (const n of range(1, 1000)) if ((n * n) % 2 === 0) expect(n % 2).toBe(0);
  });
});

/** The remainder of a on division by b ∈ ℕ, in [0, b) (JavaScript's % keeps the sign of a). */
const rem = (a: number, b: number) => ((a % b) + b) % b;
const even = (n: number) => rem(n, 2) === 0;
const divides = (a: number, b: number) => (a === 0 ? b === 0 : rem(b, Math.abs(a)) === 0);

describe('exact identities: the numbered results of lesson 0.1 on a window (evidence; the lesson proves them)', () => {
  const Z = range(-60, 60);
  it('למה 0.1.3: n = 2q + r with r ∈ {0, 1}; r = 0 exactly for the even n', () => {
    for (const n of Z) {
      const r = rem(n, 2);
      const q = (n - r) / 2;
      expect([0, 1]).toContain(r);
      expect(Number.isInteger(q) && 2 * q + r === n).toBe(true);
      expect(r === 0).toBe(even(n));
    }
    expect([-7 === -4 * 2 + 1, 17 === 3 * 5 + 2]).toEqual([true, true]); // the glossary's examples
  });
  it('טענה 0.1.4 and 0.1.7: parity of a + b and ab; ab is even exactly when a or b is', () => {
    for (const a of Z) {
      for (const b of Z) {
        if (even(a) && even(b)) expect(even(a + b)).toBe(true);
        if (!even(a) && !even(b)) expect(even(a + b) && !even(a * b)).toBe(true);
        if (even(a) && !even(b)) expect(even(a + b)).toBe(false);
        if (even(a)) expect(even(a * b)).toBe(true);
        expect(even(a * b)).toBe(even(a) || even(b));
        if (even(a + b)) expect(even(a - b)).toBe(true); // ex-0-1-3 (ב)
      }
    }
    // the converses fail: 1 + 1 = 2 even with 1 odd; 1·2 = 2 even with 1 odd
    expect([even(1 + 1), even(1), even(1 * 2)]).toEqual([true, false, true]);
  });
  it('טענה 0.1.5: a|a, 1|a, a|0; transitivity; a|bx+cy; a|b ⇒ a ≤ b on ℕ; and the counterexamples to dropping ℕ', () => {
    for (const a of range(-12, 12)) {
      expect(divides(a, a) && divides(1, a) && divides(a, 0)).toBe(true);
      for (const b of range(-12, 12)) {
        for (const c of range(-12, 12)) {
          if (divides(a, b) && divides(b, c)) expect(divides(a, c)).toBe(true);
          if (divides(a, b) && divides(a, c)) for (const x of [-3, 0, 2]) for (const y of [-1, 5]) expect(divides(a, b * x + c * y)).toBe(true);
          if (divides(a, b + c) && divides(a, b)) expect(divides(a, c)).toBe(true); // ex-0-1-3 (ג)
        }
        if (a > 0 && b > 0 && divides(a, b)) expect(a).toBeLessThanOrEqual(b);
        if (a > 0 && b > 0 && divides(a, b) && divides(b, a)) expect(a).toBe(b);
      }
    }
    expect([divides(2, -2), divides(-2, 2)]).toEqual([true, true]); // 2 ≠ −2: (5) needs a, b ∈ ℕ
    expect(divides(3, 0)).toBe(true); // 3 > 0: (4) needs b ∈ ℕ
    expect([divides(2, 2), divides(2, 3), divides(2, 1 + 1), divides(2, 1)]).toEqual([true, false, true, false]);
  });
  it('טענה 0.1.6: n² even ⇔ n even; n(n + 1) even; and 4 | n² does not give 4 | n (n = 2)', () => {
    for (const n of Z) {
      expect(even(n * n)).toBe(even(n));
      expect(even(n * (n + 1))).toBe(true);
    }
    expect([divides(4, 2 * 2), divides(4, 2)]).toEqual([true, false]);
    for (const q of range(-10, 10)) expect((4 * q + 2) ** 2).toBe(4 * (4 * q * q + 4 * q + 1));
  });
  it('טענה 0.1.10: for a, b ≥ 0, a < b ⇔ a² < b² and a ≤ b ⇔ a² ≤ b²; each direction fails without its hypothesis', () => {
    const R = range(0, 40).map((i) => i / 4);
    for (const a of R) {
      for (const b of R) {
        expect(a < b).toBe(a * a < b * b);
        expect(a <= b).toBe(a * a <= b * b);
      }
    }
    // a² < b² with b ≥ 0 already gives a < b, for any real a
    for (const a of range(-40, 40).map((i) => i / 4)) for (const b of R) if (a * a < b * b) expect(a).toBeLessThan(b);
    expect([-3 < 2, (-3) ** 2 > 2 ** 2]).toEqual([true, true]); // ⇒ needs a ≥ 0
    expect([1 ** 2 < (-2) ** 2, 1 > -2]).toEqual([true, true]); // ⇐ needs b ≥ 0
  });
  it('מסקנה 0.1.11: √(t²) = t for t ≥ 0, and √((−2)²) = 2 ≠ −2', () => {
    for (const t of range(0, 50)) expect(Math.sqrt(t * t)).toBe(t);
    expect(Math.sqrt((-2) ** 2)).toBe(2);
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
