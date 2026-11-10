/**
 * MODEL SPECIFICATION
 *
 * System:        the sequences lesson 2.2's figure shows, each with the limit the lesson claims for it
 *                (or none), and the ε-N bookkeeping of the definition: for all n > N, |aₙ − L| < ε.
 * Dynamics:      none.
 * Boundary:      every count runs over a finite window n ≤ horizon. `smallestN` is the definition's N
 *                **on that window**: evidence that a proof's N(ε) is right, never a proof that one exists.
 * Ignored:       exact arithmetic. Terms are doubles, and for 1/n, 1 + (−1)ⁿ/n or (2n+1)/n the distance to
 *                the limit is exactly 1/n, so every ε = 1/k puts a term exactly on the band edge, where
 *                plain `<` would let rounding decide (1 + 1/5 − 1 = 0.19999… < 0.2). `inBand` counts a
 *                distance within a relative 1e-9 of ε as on the edge, hence outside: the inequality is strict.
 * Valid when:    the horizon is well past the N being checked (`smallestN` refuses a window whose second
 *                half is not inside the band, see `firstN`).
 * Failure modes: a sequence that leaves the band only after the horizon looks convergent.
 */

import type { Seq } from './analysis';

/** |v − L| < ε, with a term on the edge (up to rounding) counted outside, as the strict inequality says. */
export const inBand = (v: number, L: number, eps: number): boolean => Math.abs(v - L) < eps * (1 - 1e-9);

export type SequenceId = 'recip' | 'shifted' | 'alternating' | 'bumpy' | 'slow' | 'wild-start' | 'sign';

export interface SequencePreset {
  /** button label; a formula is wrapped in LRI … PDI so the RTL control panel does not reverse it */
  name: string;
  /** the formula as TeX-free text for captions and the aria label (LTR inside an isolate) */
  formula: string;
  a: Seq;
  /** the limit, or null for a divergent sequence (the figure then lets the student pick a candidate L) */
  limit: number | null;
  /** the candidate L shown first for a divergent sequence */
  candidate?: number;
  /** n-axis window at the start, and the value window */
  window: number;
  y: [number, number];
}

export const SEQUENCES: Record<SequenceId, SequencePreset> = {
  recip: { name: '⁦1/n⁩', formula: 'aₙ = 1/n', a: (n) => 1 / n, limit: 0, window: 40, y: [-0.4, 1.1] },
  shifted: { name: '⁦(2n+1)/n⁩', formula: 'aₙ = (2n+1)/n', a: (n) => (2 * n + 1) / n, limit: 2, window: 40, y: [1.6, 3.1] },
  alternating: {
    name: '⁦1 + (−1)ⁿ/n⁩',
    formula: 'aₙ = 1 + (−1)ⁿ/n',
    a: (n) => 1 + (-1) ** n / n,
    limit: 1,
    window: 40,
    y: [-0.1, 1.6],
  },
  // converges although a term is often farther from the limit than the one before it (a₂ = 1.5 > a₁ = 1)
  bumpy: { name: '⁦(2 + (−1)ⁿ)/n⁩', formula: 'aₙ = (2 + (−1)ⁿ)/n', a: (n) => (2 + (-1) ** n) / n, limit: 0, window: 50, y: [-0.4, 1.7] },
  slow: { name: '⁦1/√n⁩', formula: 'aₙ = 1/√n', a: (n) => 1 / Math.sqrt(n), limit: 0, window: 120, y: [-0.4, 1.1] },
  // ten wild terms, then 1/n: the first terms cannot change the limit
  'wild-start': {
    name: 'התחלה פרועה',
    formula: 'aₙ = (−1)ⁿ·3 עד n = 10, ואחר כך aₙ = 1/n',
    a: (n) => (n <= 10 ? (-1) ** n * 3 : 1 / n),
    limit: 0,
    window: 40,
    y: [-3.4, 3.4],
  },
  sign: { name: '⁦(−1)ⁿ⁩', formula: 'aₙ = (−1)ⁿ', a: (n) => (-1) ** n, limit: null, candidate: 1, window: 40, y: [-1.8, 2.2] },
};

/**
 * The definition's N on a window: the smallest N ≥ 0 such that |aₙ − L| < ε for every N < n ≤ horizon.
 * Null when the band does not hold over at least the second half of the window: (−1)ⁿ sits inside the band
 * around 1 at every even n, and that is no evidence of anything. For 1/n and ε = 0.01 it is 100.
 */
export function smallestN(a: Seq, L: number, eps: number, horizon = 100_000): number | null {
  let N = horizon;
  while (N > 0 && inBand(a(N), L, eps)) N--;
  return N <= horizon / 2 ? N : null;
}

/** The indices N < n ≤ horizon whose terms lie outside the band: what a student's N leaves behind. */
export function outsideAfter(a: Seq, L: number, eps: number, N: number, horizon: number): number[] {
  const out: number[] = [];
  for (let n = Math.max(1, Math.floor(N) + 1); n <= horizon; n++) if (!inBand(a(n), L, eps)) out.push(n);
  return out;
}

/** The ε values the figure offers, widest first. Many are 1/k, so terms land on the edge: see `inBand`. */
export const EPSILONS = [0.5, 0.3, 0.2, 0.1, 0.05, 0.03, 0.02, 0.01, 0.005];
