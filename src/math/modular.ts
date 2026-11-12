/**
 * MODEL SPECIFICATION
 *
 * System:        the finite structures of lesson 1.1 (the field axioms): ℤ_n = {0, 1, …, n − 1} with
 *                a ⊕ b := r_n(a + b) and a ⊙ b := r_n(a·b), where r_n(m) is the remainder of the integer m on
 *                division by n (Definition 1.1.14); and, more generally, any finite set {0, …, k − 1} with two
 *                operations given by tables, checked against the field axioms (ח1)–(ח4), (כ1)–(כ4), (פ), (ש) of
 *                Definition 1.1.1.
 * Dynamics:      none.
 * Boundary:      everything is exhaustive. A table of a structure with k elements is all k² products; an axiom
 *                with three variables is checked on all k³ triples. So, unlike a numerical probe, `checkAxioms`
 *                and `isField` are a complete verification for the one n (or the one table) they are given:
 *                "ℤ_6 is not a field" and "ℤ_7 is a field" are proofs by exhaustion. "ℤ_n is a field exactly when
 *                n is prime" for every n is Theorem 1.1.17, which the lesson proves; the tests check it on a window
 *                of n, which is evidence.
 * Ignored:       nothing numerical: all arithmetic is on safe integers. For n ≤ 10⁷ every product a·b with
 *                a, b < n stays below 10¹⁴ < 2⁵³, so r_n(a·b) is exact.
 * Valid when:    n is an integer with 2 ≤ n ≤ 10⁷ (the figure uses 2 … 13); integer arguments are safe integers.
 *                `rem` accepts any n ∈ ℕ (n ≥ 1) and any safe integer m, including negative m: the remainder of
 *                division with remainder (fact (ג) of lesson 0.1) always satisfies 0 ≤ r < n.
 * Failure modes: a non-integer, an unsafe integer, n < 1 (for `rem`) or n < 2 (for ℤ_n) throws a RangeError
 *                instead of guessing; JavaScript's `%` is negative for a negative m, which `rem` corrects.
 */

function assertInt(x: number, what: string) {
  if (!Number.isSafeInteger(x)) throw new RangeError(`${what}: ${x} is not a safe integer`);
}

function assertModulus(n: number) {
  assertInt(n, 'modulus');
  if (n < 2 || n > 1e7) throw new RangeError(`ℤ_n needs 2 ≤ n ≤ 10⁷; got ${n}`);
}

/** r_n(m): the remainder r of m on division by n ∈ ℕ, the unique r with m = qn + r, q ∈ ℤ, 0 ≤ r < n. */
export function rem(m: number, n: number): number {
  assertInt(m, 'rem');
  assertInt(n, 'rem');
  if (n < 1) throw new RangeError(`rem: the divisor ${n} is not in ℕ`);
  const r = m % n;
  // `%` keeps the sign of m: −7 % 7 is −0 and −1 % 7 is −1
  return r < 0 ? r + n : r === 0 ? 0 : r;
}

/** The quotient q of m on division by n: m = q·n + r_n(m). */
export const quot = (m: number, n: number): number => (m - rem(m, n)) / n;

/** a ⊕ b in ℤ_n. */
export function add(a: number, b: number, n: number): number {
  assertModulus(n);
  return rem(a + b, n);
}

/** a ⊙ b in ℤ_n. */
export function mul(a: number, b: number, n: number): number {
  assertModulus(n);
  return rem(a * b, n);
}

export type Op = 'add' | 'mul';

/** The elements 0, 1, …, n − 1 of ℤ_n. */
export const elements = (n: number): number[] => {
  assertModulus(n);
  return Array.from({ length: n }, (_, i) => i);
};

/** The table of ⊕ or ⊙: table[a][b] = a ∘ b. */
export function table(n: number, op: Op): number[][] {
  const E = elements(n);
  return E.map((a) => E.map((b) => (op === 'add' ? add(a, b, n) : mul(a, b, n))));
}

/** The negative of a in ℤ_n: the b with a ⊕ b = 0 (it always exists: n − a, or 0 for a = 0). */
export function negative(a: number, n: number): number {
  for (const b of elements(n)) if (add(a, b, n) === 0) return b;
  throw new Error(`negative: no negative of ${a} in ℤ_${n}`); // never: n − a works
}

/** The inverse of a in ℤ_n, found by trying every b, or null when no b has a ⊙ b = 1. */
export function inverse(a: number, n: number): number | null {
  for (const b of elements(n)) if (mul(a, b, n) === 1) return b;
  return null;
}

/** The nonzero elements of ℤ_n without an inverse (their rows of ⊙ hold no 1). */
export const nonInvertible = (n: number): number[] => elements(n).filter((a) => a !== 0 && inverse(a, n) === null);

/** Every pair (a, b) of nonzero elements with a ⊙ b = 0, a ≤ b (zero divisors). */
export function zeroDivisorPairs(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 1; a < n; a++) for (let b = a; b < n; b++) if (mul(a, b, n) === 0) out.push([a, b]);
  return out;
}

/** The axiom labels of Definition 1.1.1, in the lesson's order. */
export const AXIOMS = ['ח1', 'ח2', 'ח3', 'ח4', 'כ1', 'כ2', 'כ3', 'כ4', 'פ', 'ש'] as const;
export type Axiom = (typeof AXIOMS)[number];

/**
 * A finite structure on {0, 1, …, k − 1}: two operation tables. `zero` and `one` name the elements that are
 * candidates for (ח3) and (כ3); the check finds the identities itself and only reports whether they exist.
 */
export interface FiniteStructure {
  size: number;
  add: number[][];
  mul: number[][];
}

/** The identity of a table (the e with e ∘ x = x ∘ e = x for all x), or null. Unique when it exists (1.1.2). */
export function identityOf(t: number[][]): number | null {
  const k = t.length;
  for (let e = 0; e < k; e++) {
    let ok = true;
    for (let x = 0; x < k && ok; x++) ok = t[e][x] === x && t[x][e] === x;
    if (ok) return e;
  }
  return null;
}

/**
 * Every field axiom of Definition 1.1.1, checked on every element, pair and triple. A table entry outside
 * {0, …, k − 1} means the operation is not closed (not an operation on the set), and every axiom is reported failed.
 */
export function checkAxioms(s: FiniteStructure): Record<Axiom, boolean> {
  const k = s.size;
  const { add: A, mul: M } = s;
  const E = Array.from({ length: k }, (_, i) => i);
  const closed = [A, M].every((t) => t.length === k && t.every((row) => row.length === k && row.every((v) => Number.isInteger(v) && v >= 0 && v < k)));
  const none = Object.fromEntries(AXIOMS.map((a) => [a, false])) as Record<Axiom, boolean>;
  if (!closed) return none;
  const all = (p: (x: number) => boolean) => E.every(p);
  const comm = (t: number[][]) => all((x) => all((y) => t[x][y] === t[y][x]));
  const assoc = (t: number[][]) => all((x) => all((y) => all((z) => t[t[x][y]][z] === t[x][t[y][z]])));
  const zero = identityOf(A);
  const one = identityOf(M);
  return {
    ח1: comm(A),
    ח2: assoc(A),
    ח3: zero !== null,
    ח4: zero !== null && all((x) => E.some((y) => A[x][y] === zero)),
    כ1: comm(M),
    כ2: assoc(M),
    כ3: one !== null,
    כ4: one !== null && zero !== null && all((x) => x === zero || E.some((y) => M[x][y] === one)),
    פ: all((x) => all((y) => all((z) => M[x][A[y][z]] === A[M[x][y]][M[x][z]]))),
    ש: zero !== null && one !== null && zero !== one,
  };
}

/** The axioms a structure fails, in the lesson's order ([] for a field). */
export const failingAxioms = (s: FiniteStructure): Axiom[] => {
  const r = checkAxioms(s);
  return AXIOMS.filter((a) => !r[a]);
};

/** ℤ_n as a FiniteStructure. */
export const zn = (n: number): FiniteStructure => ({ size: n, add: table(n, 'add'), mul: table(n, 'mul') });

/** ℤ_n is a field: every axiom holds, checked exhaustively. */
export const isField = (n: number): boolean => failingAxioms(zn(n)).length === 0;

/**
 * Lemma 1.1.17א, as the proof builds it: for p ≥ 2 and 0 < a < p, the least positive element d of
 * {ax + py : x, y ∈ ℤ} and a pair (x, y) attaining it. The search runs over |x| < p, |y| ≤ a, which is enough:
 * every value ax + py equals ax' + py' with 0 ≤ x' < p (replace x by r_p(x) and adjust y).
 */
export function leastCombination(a: number, p: number): { d: number; x: number; y: number } {
  assertInt(a, 'leastCombination');
  assertModulus(p);
  let best: { d: number; x: number; y: number } | null = null;
  for (let x = 0; x < p; x++) {
    // with x fixed, the least positive ax + py has y = −⌊ax / p⌋ (+1 if that gives 0)
    let y = -Math.floor((a * x) / p);
    let d = a * x + p * y;
    if (d <= 0) {
      y += 1;
      d += p;
    }
    if (!best || d < best.d) best = { d, x, y };
  }
  return best!;
}
