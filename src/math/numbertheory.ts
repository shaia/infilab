/**
 * MODEL SPECIFICATION
 *
 * System:        claims of the form "for every n ∈ ℕ, P(n)" (ℕ = {1, 2, 3, …}) for lesson 0.4's figure
 *                CounterexampleHunt, and the integer arithmetic they need: primality, factorisation, gcd,
 *                divisibility. A claim whose P(n) is an implication "if H(n) then C(n)" reports three
 *                verdicts: 'holds' (H and C), 'vacuous' (H fails, so the implication holds), 'fails' (H and
 *                not C: a counterexample). Any other claim reports 'holds' or 'fails'.
 * Dynamics:      none.
 * Boundary:      every claim is evaluated on n = 1 … `max` only. `tally` and `firstCounterexample` look at
 *                that finite window: a window without a counterexample is evidence, never a proof that the
 *                claim holds for every n (the lesson's point), and the caption says so.
 * Ignored:       nothing numerical: all arithmetic is exact. Every value a claim computes stays below
 *                Number.MAX_SAFE_INTEGER (2⁵³ − 1): the largest is the fifth Fermat number 2³² + 1, and
 *                2³⁰ − 1 for the Mersenne claim. `isPrime` is trial division up to √n, exact for safe integers.
 * Valid when:    n is a natural number with 1 ≤ n ≤ the claim's `max`; integer inputs are safe integers.
 * Failure modes: `isPrime` / `factorize` throw on a non-integer or an unsafe integer instead of guessing.
 */

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
/** n written as a superscript (for "2ⁿ" readouts): 32 → ³². */
export const sup = (n: number) => String(n).replace(/\d/g, (d) => SUP[d]);

function assertSafe(n: number, what: string) {
  if (!Number.isSafeInteger(n)) throw new RangeError(`${what}: ${n} is not a safe integer`);
}

/** The smallest divisor d ≥ 2 of n (n itself when n is prime), for n ≥ 2. */
export function smallestFactor(n: number): number {
  assertSafe(n, 'smallestFactor');
  if (n < 2) throw new RangeError(`smallestFactor: ${n} < 2 has no divisor ≥ 2`);
  if (n % 2 === 0) return 2;
  for (let d = 3; d * d <= n; d += 2) if (n % d === 0) return d;
  return n;
}

/** n is prime: n ≥ 2 and its only positive divisors are 1 and n. */
export function isPrime(n: number): boolean {
  assertSafe(n, 'isPrime');
  return n >= 2 && smallestFactor(n) === n;
}

/** The prime factors of n ≥ 2 in non-decreasing order, with repetition (1681 → [41, 41]). */
export function factorize(n: number): number[] {
  assertSafe(n, 'factorize');
  if (n < 2) throw new RangeError(`factorize: ${n} < 2`);
  const out: number[] = [];
  let m = n;
  while (m > 1) {
    const p = smallestFactor(m);
    out.push(p);
    m /= p;
  }
  return out;
}

/** gcd(a, b) ≥ 0 by Euclid's algorithm; gcd(0, 0) = 0. */
export function gcd(a: number, b: number): number {
  assertSafe(a, 'gcd');
  assertSafe(b, 'gcd');
  let [x, y] = [Math.abs(a), Math.abs(b)];
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

/** a divides b: b = a·k for an integer k (0 divides only 0). */
export function divides(a: number, b: number): boolean {
  assertSafe(a, 'divides');
  assertSafe(b, 'divides');
  return a === 0 ? b === 0 : b % a === 0;
}

/** "1681 = 41 · 41" for a composite, "43" (and prime: true) for a prime. */
export function factorText(v: number): string {
  return v < 2 ? String(v) : factorize(v).join(' · ');
}

export type Verdict = 'holds' | 'vacuous' | 'fails';

export interface Evaluation {
  verdict: Verdict;
  /** the computation behind the verdict, LTR math as plain text without words: "40² + 40 + 41 = 1681 = 41 · 41" */
  math: string;
  /** what the computation shows, in Hebrew, numbers wrapped in LRI … PDI: "לא ראשוני" */
  note: string;
}

export type ClaimId = 'euler' | 'eleven' | 'pow' | 'fermat' | 'even' | 'mersenne';

export interface Claim {
  /** button label; every formula (and a lone n) is wrapped in LRI … PDI, which the figure renders as an LTR <bdi> */
  name: string;
  /** the whole claim in Hebrew; every formula (and a lone n) wrapped in LRI … PDI */
  statement: string;
  /** the claim is an implication "if H(n) then C(n)" (verdict 'vacuous' possible) */
  implication: boolean;
  /** the window the figure shows: n = 1 … max */
  max: number;
  /** what the lesson knows about the whole claim (not from the window): true only with a proof in the lesson */
  provedTrue: boolean;
  evaluate: (n: number) => Evaluation;
}

const primeVerdict = (expr: string, v: number): Evaluation =>
  isPrime(v)
    ? { verdict: 'holds', math: `${expr} = ${v}`, note: 'ראשוני' }
    : { verdict: 'fails', math: `${expr} = ${v} = ${factorText(v)}`, note: 'לא ראשוני' };

export const CLAIMS: Record<ClaimId, Claim> = {
  // Euler (1772): prime for n = 0 … 39; ℕ starts at 1, so 39 primes in a row, and n = 40 gives 41².
  euler: {
    name: '⁦n² + n + 41⁩',
    statement: 'לכל ⁦n⁩ טבעי, המספר ⁦n² + n + 41⁩ ראשוני.',
    implication: false,
    max: 50,
    provedTrue: false,
    evaluate: (n) => primeVerdict(`${n}² + ${n} + 41`, n * n + n + 41),
  },
  // the review bank's Q-0-review-01: prime for n = 1 … 10, and n = 11 gives 11².
  eleven: {
    name: '⁦n² − n + 11⁩',
    statement: 'לכל ⁦n⁩ טבעי, המספר ⁦n² − n + 11⁩ ראשוני.',
    implication: false,
    max: 30,
    provedTrue: false,
    evaluate: (n) => primeVerdict(`${n}² − ${n} + 11`, n * n - n + 11),
  },
  // fails exactly at n = 2, 3, 4 and holds from n = 5 on (a proof by induction is lesson 0.5's)
  pow: {
    name: '⁦2ⁿ > n²⁩',
    statement: 'לכל ⁦n⁩ טבעי, ⁦2ⁿ > n²⁩.',
    implication: false,
    max: 20,
    provedTrue: false,
    evaluate: (n) => {
      const [a, b] = [2 ** n, n * n];
      return a > b
        ? { verdict: 'holds', math: `2${sup(n)} = ${a} > ${b} = ${n}²`, note: 'גדול' }
        : { verdict: 'fails', math: `2${sup(n)} = ${a} ≤ ${b} = ${n}²`, note: 'לא גדול' };
    },
  },
  // Fermat (1640) conjectured these are all prime; Euler (1732): 2³² + 1 = 641 · 6700417.
  fermat: {
    name: 'מספרי פרמה',
    statement: 'לכל ⁦n⁩ טבעי, המספר ⁦2^(2ⁿ) + 1⁩ ראשוני: 2 בחזקת ⁦2ⁿ⁩, ועוד 1.',
    implication: false,
    max: 5,
    provedTrue: false,
    evaluate: (n) => primeVerdict(`2^(2${sup(n)}) + 1 = 2${sup(2 ** n)} + 1`, 2 ** 2 ** n + 1),
  },
  // true for every n: n² + n = n(n + 1), a product of two consecutive integers; the lesson proves it
  even: {
    name: '⁦n² + n⁩ זוגי',
    statement: 'לכל ⁦n⁩ טבעי, המספר ⁦n² + n⁩ זוגי.',
    implication: false,
    max: 50,
    provedTrue: true,
    evaluate: (n) => {
      const v = n * n + n;
      return v % 2 === 0
        ? { verdict: 'holds', math: `${n}² + ${n} = ${v} = 2 · ${v / 2}`, note: 'זוגי' }
        : { verdict: 'fails', math: `${n}² + ${n} = ${v}`, note: 'אי-זוגי' };
    },
  },
  // an implication: n = 11 is prime and 2¹¹ − 1 = 2047 = 23 · 89; composite n (and n = 1) leave the hypothesis false
  mersenne: {
    name: 'אם ⁦n⁩ ראשוני אז ⁦2ⁿ − 1⁩ ראשוני',
    statement: 'לכל ⁦n⁩ טבעי, אם ⁦n⁩ ראשוני אז ⁦2ⁿ − 1⁩ ראשוני.',
    implication: true,
    max: 30,
    provedTrue: false,
    evaluate: (n) => {
      const v = 2 ** n - 1;
      if (!isPrime(n)) return { verdict: 'vacuous', math: n === 1 ? '1' : `${n} = ${factorText(n)}`, note: `⁦${n}⁩ אינו ראשוני` };
      return isPrime(v)
        ? { verdict: 'holds', math: `2${sup(n)} − 1 = ${v}`, note: `⁦${n}⁩ ראשוני, וגם ⁦${v}⁩ ראשוני` }
        : { verdict: 'fails', math: `2${sup(n)} − 1 = ${v} = ${factorText(v)}`, note: `⁦${n}⁩ ראשוני, אבל ⁦${v}⁩ לא ראשוני` };
    },
  },
};

export interface Tally {
  /** n with verdict 'holds' */
  holds: number;
  /** n where the hypothesis of an implication fails (the implication holds) */
  vacuous: number;
  /** the counterexamples, in order */
  fails: number[];
}

/** The verdicts on n = 1 … upTo (upTo is clamped to the claim's window). */
export function tally(claim: Claim, upTo: number): Tally {
  const t: Tally = { holds: 0, vacuous: 0, fails: [] };
  for (let n = 1; n <= Math.min(upTo, claim.max); n++) {
    const v = claim.evaluate(n).verdict;
    if (v === 'holds') t.holds++;
    else if (v === 'vacuous') t.vacuous++;
    else t.fails.push(n);
  }
  return t;
}

/** The first counterexample in n = 1 … upTo, or null: null is "none in the window", never "the claim is true". */
export function firstCounterexample(claim: Claim, upTo = claim.max): number | null {
  return tally(claim, upTo).fails[0] ?? null;
}
