/**
 * MODEL SPECIFICATION
 *
 * System:        a family of statements P(1), P(2), … and the bookkeeping of a proof by induction: the base
 *                P(n₀) and the links P(n) ⇒ P(n+1). The figure of lessons 0.5 and 0.6 (InductionChain) draws them as
 *                dominoes.
 * Dynamics:      the chain: if the base holds, domino n₀ falls, and domino n+1 falls whenever domino n fell and
 *                the link n ⇒ n+1 holds. `chain` returns how far that goes inside a finite window.
 * Boundary:      every truth value is computed for n ≤ window only. A row of true statements in the window is
 *                evidence; that P(n) holds for every n comes from the proof (base + step), never from this file.
 *                A link is the implication P(n) ⇒ P(n+1) evaluated on the two truth values, so it is true
 *                whenever P(n) is false (a false premise; lesson 0.2): that is why "1 + … + n = n(n+1)/2 + 1"
 *                has every link holding and nothing falling.
 * Ignored:       exact arithmetic for Bernoulli's inequality and its two variants (strict; with the x² term).
 *                (1+x)ⁿ and 1 + nx are doubles; at n = 1 they are equal (and the x² variant also at n = 2), and
 *                `atLeast` counts a difference within a relative 1e-12 as equality, `greater` as not greater. The sums and the
 *                powers of 2 are integers far below 2⁵³, hence exact.
 * Valid when:    n ≤ 40 (2ⁿ and n³ exact, (1+x)ⁿ finite for |1+x| ≤ 6).
 * Failure modes: a statement that first fails after the window looks proven by the window; the horses
 *                statement ("every set of n numbers has all its members equal") is not computed but encoded:
 *                true for n = 1, false for n ≥ 2 by the counterexample {1, 2, …, n}.
 */

/** a ≥ b, with a relative 1e-12 allowance for rounding (Bernoulli is an equality at n = 1 and at x = 0). */
export const atLeast = (a: number, b: number): boolean => a >= b - 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));
/** a > b beyond rounding: the strict form of Bernoulli is false at n = 1 and at x = 0, where the sides are equal. */
export const greater = (a: number, b: number): boolean => !atLeast(b, a);
/** 1 + nx + n(n−1)x²/2: the first three terms of the binomial expansion of (1+x)ⁿ (lesson 0.6, remark 0.6.12) */
export const bernoulliSquare = (n: number, x: number): number => 1 + n * x + ((n * (n - 1)) / 2) * x * x;

/** Statement n of a family, with the numbers that decide it (for the figure's readout). */
export interface Verdict {
  holds: boolean;
  /** the two sides as text, LTR, no TeX; empty for a statement that is not a comparison of numbers */
  lhs: string;
  rhs: string;
  /** the relation the statement claims between them: '=', '>', '≥' */
  rel: string;
}

export type FamilyId = 'sum' | 'sum-plus-one' | 'horses' | 'cube' | 'bernoulli' | 'bernoulli-strict' | 'bernoulli-sq';

export interface Family {
  /** button label; a formula is wrapped in LRI … PDI so the RTL control panel does not reverse it */
  name: string;
  /** P(n) in words and symbols, TeX-free, for the readout and the aria label */
  formula: string;
  /** dominoes drawn: P(1) … P(window) */
  window: number;
  /** the family takes the real parameter x (Bernoulli) */
  hasX?: boolean;
  /** links are drawn as "claimed" until the chain reaches them or the student inspects them */
  hiddenLinks?: boolean;
  P: (n: number, x: number) => boolean;
  verdict: (n: number, x: number) => Verdict;
  /** why the link n ⇒ n+1 holds or breaks, when there is more to say than the two truth values */
  linkNote?: (n: number, x: number) => string | null;
}

const tri = (n: number) => (n * (n + 1)) / 2;
/** 1 + 2 + … + n added term by term, so the check does not use the formula it checks */
const sumTo = (n: number) => {
  let s = 0;
  for (let k = 1; k <= n; k++) s += k;
  return s;
};
const sumText = (n: number) => (n <= 3 ? Array.from({ length: n }, (_, i) => i + 1).join(' + ') : `1 + 2 + … + ${n}`);
/** a typographic minus sign, and at most 6 significant figures */
const num = (v: number) => {
  const r = Math.abs(v) >= 1e6 || (v !== 0 && Math.abs(v) < 1e-3) ? v.toExponential(3) : String(Number(v.toPrecision(6)));
  return r.replace(/^-/, '−');
};

export const FAMILIES: Record<FamilyId, Family> = {
  sum: {
    name: '⁦1 + … + n = n(n+1)/2⁩',
    formula: 'P(n): 1 + 2 + … + n = n(n+1)/2',
    window: 10,
    P: (n) => sumTo(n) === tri(n),
    verdict: (n) => ({ holds: sumTo(n) === tri(n), lhs: `${sumText(n)} = ${sumTo(n)}`, rhs: `${n}·${n + 1}/2 = ${tri(n)}`, rel: '=' }),
  },
  'sum-plus-one': {
    name: '⁦1 + … + n = n(n+1)/2 + 1⁩',
    formula: 'P(n): 1 + 2 + … + n = n(n+1)/2 + 1',
    window: 10,
    P: (n) => sumTo(n) === tri(n) + 1,
    verdict: (n) => ({
      holds: sumTo(n) === tri(n) + 1,
      lhs: `${sumText(n)} = ${sumTo(n)}`,
      rhs: `${n}·${n + 1}/2 + 1 = ${tri(n) + 1}`,
      rel: '=',
    }),
    linkNote: () =>
      'הטיעון של הצעד עובד: אם ⁦1 + … + n = n(n+1)/2 + 1⁩, מוסיפים ⁦n + 1⁩ לשני האגפים ומקבלים בדיוק את ⁦P(n+1)⁩. אבל אין אף n שבו ⁦P(n)⁩ נכונה.',
  },
  horses: {
    name: 'כל המספרים שווים',
    formula: '⁦P(n)⁩: בכל קבוצה של n מספרים, כל המספרים שווים',
    window: 8,
    hiddenLinks: true,
    P: (n) => n === 1,
    verdict: (n) => ({ holds: n === 1, lhs: '', rhs: '', rel: '' }),
    linkNote: (n) =>
      n === 1
        ? 'כאן הצעד נשבר. בקבוצה ⁦{a₁, a₂}⁩ הקבוצה "בלי האחרון" היא ⁦{a₁}⁩ והקבוצה "בלי הראשון" היא ⁦{a₂}⁩: אין להן איבר משותף, ולכן לא נובע ⁦a₁ = a₂⁩. ואכן ⁦P(1)⁩ נכונה ו-⁦P(2)⁩ לא: בקבוצה ⁦{1, 2}⁩ המספרים שונים.'
        : `מ-${n} ל-${n + 1} הטיעון של "ההוכחה" עובד: לשתי הקבוצות יש איבר משותף. הגרירה נכונה, אבל ⁦P(${n})⁩ שקרית, ולכן היא לא מפילה כלום.`,
  },
  cube: {
    name: '⁦2ⁿ > n³⁩',
    formula: 'P(n): 2ⁿ > n³',
    window: 14,
    P: (n) => 2 ** n > n ** 3,
    verdict: (n) => ({ holds: 2 ** n > n ** 3, lhs: `2^${n} = ${2 ** n}`, rhs: `${n}³ = ${n ** 3}`, rel: '>' }),
    linkNote: (n) =>
      n >= 4
        ? 'הטיעון של הצעד עובד מ-⁦n = 4⁩: ⁦2ⁿ⁺¹ = 2·2ⁿ > 2n³ ≥ (n+1)³⁩, כי ⁦(1 + 1/n)³ ≤ 2⁩ כש-⁦n ≥ 4⁩.'
        : `הטיעון של הצעד לא עובד ל-⁦n = ${n}⁩: ⁦(1 + 1/${n})³ > 2⁩, ולכן ⁦2n³ < (n+1)³⁩.`,
  },
  bernoulli: {
    name: 'ברנולי',
    formula: 'P(n): (1 + x)ⁿ ≥ 1 + nx',
    window: 10,
    hasX: true,
    P: (n, x) => atLeast((1 + x) ** n, 1 + n * x),
    verdict: (n, x) => ({ holds: atLeast((1 + x) ** n, 1 + n * x), lhs: `(1 + x)^${n} = ${num((1 + x) ** n)}`, rhs: `1 + ${n}x = ${num(1 + n * x)}`, rel: '≥' }),
    linkNote: (_n, x) =>
      x >= -1
        ? 'כאן ⁦x ≥ −1⁩, ולכן ⁦1 + x ≥ 0⁩, והכפל של הנחת האינדוקציה ב-⁦1 + x⁩ שומר על כיוון אי-השוויון: הטיעון של הצעד עובד.'
        : 'כאן ⁦1 + x < 0⁩: כפל ב-⁦1 + x⁩ הופך את כיוון אי-השוויון, והטיעון של הצעד לא עובד. הגרירה עצמה יכולה עדיין להיות נכונה, למשל כש-⁦P(n)⁩ שקרית.',
  },
  'bernoulli-strict': {
    name: 'ברנולי, אי-שוויון חזק',
    formula: 'P(n): (1 + x)ⁿ > 1 + nx',
    window: 10,
    hasX: true,
    P: (n, x) => greater((1 + x) ** n, 1 + n * x),
    verdict: (n, x) => ({ holds: greater((1 + x) ** n, 1 + n * x), lhs: `(1 + x)^${n} = ${num((1 + x) ** n)}`, rhs: `1 + ${n}x = ${num(1 + n * x)}`, rel: '>' }),
    linkNote: (n, x) =>
      x === 0
        ? 'כש-⁦x = 0⁩ שני האגפים שווים ל-1 לכל n: אי-השוויון החזק שקרי לכל n.'
        : n === 1
          ? 'עבור ⁦n = 1⁩ שני האגפים שווים ל-⁦1 + x⁩, ולכן ⁦P(1)⁩ שקרית לכל x: הבסיס של משפט 0.6.6(ב) הוא ⁦n = 2⁩.'
          : x >= -1
            ? 'כאן ⁦x ≥ −1⁩ ו-⁦x ≠ 0⁩: מ-⁦n = 2⁩ הצעד של משפט 0.6.6(ב) עובד.'
            : 'כאן ⁦1 + x < 0⁩, והטיעון של הצעד במשפט 0.6.6(ב) לא חל.',
  },
  'bernoulli-sq': {
    name: 'ברנולי משופר',
    formula: 'P(n): (1 + x)ⁿ ≥ 1 + nx + n(n−1)x²/2',
    window: 10,
    hasX: true,
    P: (n, x) => atLeast((1 + x) ** n, bernoulliSquare(n, x)),
    verdict: (n, x) => ({
      holds: atLeast((1 + x) ** n, bernoulliSquare(n, x)),
      lhs: `(1 + x)^${n} = ${num((1 + x) ** n)}`,
      rhs: `1 + ${n}x + ${(n * (n - 1)) / 2}x² = ${num(bernoulliSquare(n, x))}`,
      rel: '≥',
    }),
    linkNote: (n, x) =>
      x >= 0
        ? 'כאן ⁦x ≥ 0⁩: בצעד נשאר המחובר ⁦cx³⁩ עם ⁦c ≥ 0⁩, והוא אי-שלילי, ולכן מותר להשמיט אותו (דוגמה 4).'
        : n === 2
          ? 'כאן ⁦x < 0⁩: ⁦(1 + x)³ − (1 + 3x + 3x²) = x³ < 0⁩, ולכן ⁦P(3)⁩ שקרית. בצעד נשאר מחובר שלילי, ואסור להשמיט אותו.'
          : 'כאן ⁦x < 0⁩: בצעד נשאר מחובר שלילי, ואסור להשמיט אותו; הגרירה יכולה להיות נכונה רק כי ⁦P(n)⁩ שקרית או ⁦P(n+1)⁩ נכונה במקרה.',
  },
};

/** P(1), …, P(window) as truth values (index 0 is P(1)). */
export const truthRow = (f: Family, x = 0, upTo = f.window): boolean[] => Array.from({ length: upTo }, (_, i) => f.P(i + 1, x));

/** The link P(n) ⇒ P(n+1): false exactly when P(n) is true and P(n+1) is false. */
export const linkHolds = (f: Family, n: number, x = 0): boolean => !f.P(n, x) || f.P(n + 1, x);

export interface ChainResult {
  /** P(n₀) holds */
  base: boolean;
  /** the last statement that falls; n₀ − 1 when the base fails */
  reach: number;
  /** the first link n ⇒ n+1 (n ≥ n₀, n < last) that stops the chain; null when the chain reaches `last` or never starts */
  brokenAt: number | null;
}

/**
 * Push domino n₀ and let the chain run up to `last`: everything from n₀ falls until the first broken link.
 * When the base holds, every statement that falls is true (each one is reached through a true implication).
 */
export function chain(f: Family, n0: number, last = f.window, x = 0): ChainResult {
  if (!f.P(n0, x)) return { base: false, reach: n0 - 1, brokenAt: null };
  let m = n0;
  while (m < last && linkHolds(f, m, x)) m++;
  return { base: true, reach: m, brokenAt: m < last ? m : null };
}

/** The smallest base n₀ from which the chain reaches the end of the window, or null. */
export function smallestFullBase(f: Family, last = f.window, x = 0): number | null {
  for (let n0 = 1; n0 <= last; n0++) if (chain(f, n0, last, x).reach === last) return n0;
  return null;
}

/* ---------------------------------------------------------------- recomputation helpers for the lesson */

/** a₁ + … + aₙ, term by term. */
export function partialSum(a: (k: number) => number, n: number): number {
  let s = 0;
  for (let k = 1; k <= n; k++) s += a(k);
  return s;
}

/** (1/2)·(3/4)·…·((2n−1)/(2n)), the product of lesson 0.5's sixth worked example. */
export function halfProduct(n: number): number {
  let p = 1;
  for (let k = 1; k <= n; k++) p *= (2 * k - 1) / (2 * k);
  return p;
}

/** Regions cut from a disc by all the chords between n points on its circle, no three chords through one inner point: 1 + C(n,2) + C(n,4). */
export function circleRegions(n: number): number {
  const c = (m: number, k: number) => {
    if (k < 0 || k > m) return 0;
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (m - i + 1)) / i;
    return Math.round(r);
  };
  return 1 + c(n, 2) + c(n, 4);
}
