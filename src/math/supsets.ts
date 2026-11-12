/**
 * MODEL SPECIFICATION
 *
 * System:        a catalogue of sets of real numbers on which lessons 1.4-1.7 look for bounds, suprema and
 *                infima: intervals and unions of an interval and a point, finite and discrete sets of integers
 *                or of terms of a sequence, the set {x in Q : x > 0, x^2 < 2}, and two pairs (A, B) with their sum
 *                A + B. For each set: how it is drawn, its exact sup and inf (or "unbounded"), whether they are
 *                attained, an exact upper/lower-bound test, and `witness(eps, side)`: an element of the set within
 *                eps of the sup (inf), given by the formula the proof of lesson 1.4.8 uses. Also the helpers of
 *                the other figure modes: the Archimedean n above a bound, the density construction m/n of
 *                lesson 1.6.7, and the root construction of lesson 1.7.2 (the bisection root and the step h of
 *                lemma 1.7.1).
 * Dynamics:      none.
 * Boundary:      every sup/inf is written down from the mathematics (a closed form), never found by search; the
 *                searches that do exist (`findInBand` on the terms of a sequence, the bisection `kthRoot`) are
 *                numeric probes and are named so. A set that is an interval is a list of `Piece`s with open or
 *                closed ends, so the open/closed distinction is exact, not a tolerance. An element returned by
 *                a witness is a float standing for the real number; for sqrt2-rationals it is p/q with p, q
 *                integers and p^2 < 2q^2 checked in integers (`sqrt2Witness`).
 * Ignored:       the logical status of the real numbers: the catalogue is stated in R, and the sup of
 *                sqrt2-rationals (sqrt 2) is irrational: that set has no sup in Q, which is the point of lesson
 *                1.5.3 and is not modelled here. Floats stand in for rationals in `contains` of that set (a
 *                float x counts as rational when x = p/q for some q <= 20000, within 1e-9).
 * Valid when:    eps > 0 and eps >= 2^-45 (a term 1 - 2^-k with k > 45 is not told from 1 in a double);
 *                witnesses of the sequence presets are checked by the tests for eps >= 1e-4.
 * Failure modes: `contains` on the sequence presets uses a tolerance (1e-9 + 1e-15 v^2 on the inverted index), so a
 *                float within it of a term counts as that term; `contains` of the sum of two sequences scans the
 *                first 400 indices of A. A numeric probe never proves anything: sups and attained flags here are
 *                the claims, `tests/math/supsets.test.ts` checks them against enumerated elements.
 *
 * Preset ids (stable; lesson MDX refers to them):
 *   half-open [0,1)            open (0,1)               union-point (0,1) u {2}      int-squares {x in Z : x^2 < 10}
 *   finite {-1, 1/2, 2, 7/2}   fraction {x/(1+x) : x>0} abs-ball {x : |x-2| < 5}     squares {x^2 : x in (-1,2)}
 *   sqrt2-rationals {x in Q : x>0, x^2<2}               reciprocals {1/n}            ratio {n/(n+1)}
 *   dyadic {1-1/2^k}           alternating {(-1)^n+1/n} naturals N (not bounded above)
 * Sum pairs: sum-intervals (A = (0,1), B = [2,3), A+B = (2,4)); sum-sequences (A = {1/n}, B = {n/(n+1)}).
 */

export type Side = 'sup' | 'inf';

/** An interval piece of a set. lo <= hi; lo = hi only for the one-point piece [a, a]. Ends are always finite. */
export interface Piece {
  lo: number;
  hi: number;
  loClosed: boolean;
  hiClosed: boolean;
}

export type SetId =
  | 'half-open'
  | 'open'
  | 'union-point'
  | 'int-squares'
  | 'finite'
  | 'fraction'
  | 'abs-ball'
  | 'squares'
  | 'sqrt2-rationals'
  | 'reciprocals'
  | 'ratio'
  | 'dyadic'
  | 'alternating'
  | 'naturals';

export type SumId = 'sum-intervals' | 'sum-sequences';

/**
 * How the figure draws a set: 'pieces' = bars with open/closed ends; 'points' = the terms (first `count` of them);
 * 'dense' = the rationals of an interval: a bar of tiny ticks, both ends open.
 */
export type SetKind = 'pieces' | 'points' | 'dense';

export interface SupSet {
  id: string;
  /** TeX, for the lesson text (the figure draws `label`) */
  tex: string;
  /** the same in plain Unicode, LTR, for chips and canvas labels */
  label: string;
  /** a Hebrew name for screen readers */
  name: string;
  kind: SetKind;
  /** intervals (kind 'pieces' and 'dense'; [] for 'points'), sorted, disjoint */
  pieces: Piece[];
  /** the elements to draw (kind 'points', and the ticks of 'dense'): the first `count` terms, ascending; [] for pieces */
  points: (count?: number) => number[];
  /** exact sup; null = not bounded above */
  sup: number | null;
  supAttained: boolean;
  /** how to write the sup ('1', '√2', '3/2'); '' when unbounded */
  supText: string;
  inf: number | null;
  infAttained: boolean;
  infText: string;
  /** the part of the line the figure shows */
  view: [number, number];
  /** x ∈ A (exact on pieces and integers; a tolerance on terms of a sequence, see Failure modes) */
  contains: (x: number) => boolean;
  /** M is an upper bound of A, i.e. M >= sup A (definition 1.4.5; the tests check it against the elements) */
  isUpperBound: (M: number) => boolean;
  isLowerBound: (m: number) => boolean;
  /**
   * An element of A with a > sup - eps (side 'sup') or a < inf + eps (side 'inf'), by the formula of the proof:
   * the attained end itself; else the midpoint of the piece's part inside the band; or a closed form (n = ⌊1/ε⌋+1 for
   * {1/n}). null when A is not bounded on that side. Valid for every eps > 0.
   */
  witness: (eps: number, side: Side) => number | null;
  /** an element a > M, or null when M is an upper bound (for ℕ: ⌊M⌋ + 1); */
  exceeds: (M: number) => number | null;
  /** an element a < m, or null when m is a lower bound */
  undercuts: (m: number) => number | null;
}

const TOL = 1e-12;
const piece = (lo: number, hi: number, loClosed: boolean, hiClosed: boolean): Piece => ({ lo, hi, loClosed, hiClosed });
/** ⌊x⌋ and ⌈x⌉ that survive a rounding error of the product (n·a with a on a grid of hundredths) */
const fl = (x: number) => Math.floor(x + 1e-9);
const cl = (x: number) => Math.ceil(x - 1e-9);
/** v is within tolerance of an integer; the tolerance grows with v^2 because 1/(1-x) inflates a rounding error by n^2 */
const nearInt = (v: number) => Math.abs(v - Math.round(v)) <= 1e-9 + 1e-15 * v * v;
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const sortedUnique = (v: number[]) => [...new Set(v)].sort((x, y) => x - y);

export const inPiece = (P: Piece, x: number): boolean =>
  (P.loClosed ? x >= P.lo : x > P.lo) && (P.hiClosed ? x <= P.hi : x < P.hi);

/** The witness of an interval set: the end itself if attained, else the midpoint of (end - eps, end) ∩ the piece. */
function pieceWitness(pieces: Piece[], eps: number, side: Side): number {
  if (side === 'sup') {
    const P = pieces[pieces.length - 1];
    if (P.hiClosed) return P.hi;
    return (Math.max(P.hi - eps, P.lo) + P.hi) / 2;
  }
  const P = pieces[0];
  if (P.loClosed) return P.lo;
  return (P.lo + Math.min(P.lo + eps, P.hi)) / 2;
}

interface Core {
  id: string;
  tex: string;
  label: string;
  name: string;
  kind: SetKind;
  pieces: Piece[];
  points: (count?: number) => number[];
  sup: number | null;
  supAttained: boolean;
  supText: string;
  inf: number | null;
  infAttained: boolean;
  infText: string;
  view: [number, number];
  contains: (x: number) => boolean;
  witness: (eps: number, side: Side) => number | null;
  /** only for a side with no bound: the element beyond M (or below m) */
  exceedsUnbounded?: (M: number) => number;
  undercutsUnbounded?: (m: number) => number;
}

function finish(c: Core): SupSet {
  const { exceedsUnbounded, undercutsUnbounded, ...rest } = c;
  return {
    ...rest,
    isUpperBound: (M) => c.sup !== null && M >= c.sup - TOL,
    isLowerBound: (m) => c.inf !== null && m <= c.inf + TOL,
    exceeds: (M) => (c.sup === null ? (exceedsUnbounded ? exceedsUnbounded(M) : null) : M < c.sup - TOL ? c.witness(c.sup - M, 'sup') : null),
    undercuts: (m) => (c.inf === null ? (undercutsUnbounded ? undercutsUnbounded(m) : null) : m > c.inf + TOL ? c.witness(m - c.inf, 'inf') : null),
  };
}

/** A set that is a union of intervals; sup, inf, attained flags and witnesses follow from the pieces. */
function piecesSet(
  id: string,
  tex: string,
  label: string,
  name: string,
  pieces: Piece[],
  view: [number, number],
  kind: SetKind = 'pieces',
  texts?: { sup?: string; inf?: string },
): Core {
  const first = pieces[0];
  const last = pieces[pieces.length - 1];
  return {
    id,
    tex,
    label,
    name,
    kind,
    pieces,
    points: () => [],
    sup: last.hi,
    supAttained: last.hiClosed,
    supText: texts?.sup ?? String(last.hi),
    inf: first.lo,
    infAttained: first.loClosed,
    infText: texts?.inf ?? String(first.lo),
    view,
    contains: (x) => pieces.some((P) => inPiece(P, x)),
    witness: (eps, side) => pieceWitness(pieces, eps, side),
  };
}

/** The terms of a sequence given by `term(n)`, n = 1, 2, ...; at most `cap` of them are ever listed. */
function seqPoints(term: (n: number) => number, cap = 4000) {
  return (count = 60) => sortedUnique(range(Math.min(count, cap)).map(term));
}

/** the smallest natural n with 1/n < eps: n = ⌊1/ε⌋ + 1 (lesson 1.6.2(ב)) */
export const recipBelow = (eps: number): number => fl(1 / eps) + 1;

/** r ↦ (2r+2)/(r+2), lesson 1.5.3: for r in A it gives a larger element of A */
const sqrt2Next = (p: number, q: number): [number, number] => {
  const num = 2 * p + 2 * q;
  const den = p + 2 * q;
  const g = gcd(num, den);
  return [num / g, den / g];
};
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * A rational p/q in {x in Q : x > 0, x^2 < 2} with p/q > sqrt2 - eps: start from 1 and apply r ↦ (2r+2)/(r+2) (which
 * maps A into A and increases) until the distance to sqrt 2 is below eps. p^2 < 2q^2 holds in integers.
 */
export function sqrt2Witness(eps: number): { p: number; q: number } {
  let [p, q] = [1, 1];
  // the distance to √2 shrinks by a factor ≈ 0.17 per step: 40 steps cover every eps the figure uses
  for (let i = 0; i < 40 && Math.SQRT2 - p / q >= eps; i++) [p, q] = sqrt2Next(p, q);
  return { p, q };
}

/** x = p/q with 1 <= q <= qMax (a float standing in for a rational) */
const looksRational = (x: number, qMax = 20000) => {
  for (let q = 1; q <= qMax; q++) if (Math.abs(x * q - Math.round(x * q)) < 1e-9) return true;
  return false;
};

const CORES: Core[] = [
  piecesSet('half-open', '[0,1)', '[0, 1)', 'הקטע החצי-סגור מ-0 עד 1', [piece(0, 1, true, false)], [-0.5, 1.5]),
  piecesSet('open', '(0,1)', '(0, 1)', 'הקטע הפתוח מ-0 עד 1', [piece(0, 1, false, false)], [-0.5, 1.5]),
  piecesSet(
    'union-point',
    '(0,1)\\cup\\{2\\}',
    '(0, 1) ∪ {2}',
    'הקטע הפתוח מ-0 עד 1 ואיחוד עם הנקודה 2',
    [piece(0, 1, false, false), piece(2, 2, true, true)],
    [-0.5, 2.5],
  ),
  {
    id: 'int-squares',
    tex: '\\{x\\in\\mathbb{Z} : x^2<10\\}',
    label: '{x ∈ ℤ : x² < 10}',
    name: 'השלמים שריבועם קטן מ-10',
    kind: 'points',
    pieces: [],
    points: () => [-3, -2, -1, 0, 1, 2, 3],
    sup: 3,
    supAttained: true,
    supText: '3',
    inf: -3,
    infAttained: true,
    infText: '−3',
    view: [-4.5, 4.5],
    contains: (x) => Number.isInteger(x) && x * x < 10,
    witness: (_e, side) => (side === 'sup' ? 3 : -3),
  },
  {
    id: 'finite',
    tex: '\\{-1,\\tfrac12,2,\\tfrac72\\}',
    label: '{−1, ½, 2, 7/2}',
    name: 'הקבוצה הסופית מינוס 1, חצי, 2 ושלוש וחצי',
    kind: 'points',
    pieces: [],
    points: () => [-1, 0.5, 2, 3.5],
    sup: 3.5,
    supAttained: true,
    supText: '7/2',
    inf: -1,
    infAttained: true,
    infText: '−1',
    view: [-2, 5],
    contains: (x) => [-1, 0.5, 2, 3.5].some((v) => Math.abs(x - v) < 1e-9),
    witness: (_e, side) => (side === 'sup' ? 3.5 : -1),
  },
  {
    // {x/(1+x) : x > 0} = (0,1): x/(1+x) = 1 - 1/(1+x), increasing in x, with values in (0,1)
    ...piecesSet('fraction', '\\{\\tfrac{x}{1+x} : x>0\\}', '{x/(1+x) : x > 0}', 'הערכים של x/(1+x) כש-x חיובי', [piece(0, 1, false, false)], [-0.5, 1.5]),
    // sup: x = 1/ε gives 1/(1+ε) > 1-ε because (1-ε)(1+ε) = 1-ε² < 1; inf: x = ε gives ε/(1+ε) < ε
    witness: (eps, side) => (side === 'sup' ? 1 / (1 + eps) : eps / (1 + eps)),
  },
  piecesSet('abs-ball', '\\{x : |x-2|<5\\}', '{x : |x − 2| < 5}', 'המספרים במרחק קטן מ-5 מ-2', [piece(-3, 7, false, false)], [-5, 9], 'pieces', {
    sup: '7',
    inf: '−3',
  }),
  {
    // {x² : x ∈ (-1,2)} = [0,4): 0 = 0² is attained, values near 4 come from x near 2; x ∈ (-1,0) repeats values of (0,1)
    ...piecesSet('squares', '\\{x^2 : x\\in(-1,2)\\}', '{x² : x ∈ (−1, 2)}', 'ריבועי המספרים בקטע (−1, 2)', [piece(0, 4, true, false)], [-1, 5]),
    // sup: x = 2-d with d = min(ε/4, 1): (2-d)² = 4 - 4d + d² > 4 - ε, and x lies in (-1,2) since 0 < d <= 1
    witness: (eps, side) => {
      if (side === 'inf') return 0;
      const d = Math.min(eps / 4, 1);
      return (2 - d) * (2 - d);
    },
  },
  {
    id: 'sqrt2-rationals',
    tex: '\\{x\\in\\mathbb{Q} : x>0,\\ x^2<2\\}',
    label: '{x ∈ ℚ : x > 0, x² < 2}',
    name: 'הרציונליים החיוביים שריבועם קטן מ-2',
    kind: 'dense',
    pieces: [piece(0, Math.SQRT2, false, false)],
    // the rationals p/q in (0, √2) with q <= 12, ascending: ticks that show the set is dense but not an interval
    points: (count = 12) => {
      const out: number[] = [];
      for (let q = 1; q <= count; q++) for (let p = 1; p * p < 2 * q * q; p++) out.push(p / q);
      return sortedUnique(out);
    },
    sup: Math.SQRT2,
    supAttained: false,
    supText: '√2',
    inf: 0,
    infAttained: false,
    infText: '0',
    view: [-0.25, 2.25],
    contains: (x) => x > 0 && x * x < 2 && looksRational(x),
    witness: (eps, side) => {
      if (side === 'inf') return Math.min(eps, 1) / 2;
      const { p, q } = sqrt2Witness(eps);
      return p / q;
    },
  },
  {
    id: 'reciprocals',
    tex: '\\{\\tfrac1n : n\\in\\mathbb{N}\\}',
    label: '{1/n : n ∈ ℕ}',
    name: 'ההופכיים של הטבעיים',
    kind: 'points',
    pieces: [],
    points: seqPoints((n) => 1 / n),
    sup: 1,
    supAttained: true,
    supText: '1',
    inf: 0,
    infAttained: false,
    infText: '0',
    view: [-0.25, 1.5],
    contains: (x) => x > 0 && nearInt(1 / x),
    // inf: n = ⌊1/ε⌋ + 1 gives 1/n < ε
    witness: (eps, side) => (side === 'sup' ? 1 : 1 / recipBelow(eps)),
  },
  {
    id: 'ratio',
    tex: '\\{\\tfrac{n}{n+1} : n\\in\\mathbb{N}\\}',
    label: '{n/(n+1) : n ∈ ℕ}',
    name: 'האיברים n חלקי n ועוד 1',
    kind: 'points',
    pieces: [],
    points: seqPoints((n) => n / (n + 1)),
    sup: 1,
    supAttained: false,
    supText: '1',
    inf: 0.5,
    infAttained: true,
    infText: '1/2',
    view: [0, 1.25],
    contains: (x) => x > 0 && x < 1 && nearInt(x / (1 - x)) && Math.round(x / (1 - x)) >= 1,
    // sup: n/(n+1) = 1 - 1/(n+1) > 1 - ε iff n + 1 > 1/ε; n = ⌊1/ε⌋ + 1 does it
    witness: (eps, side) => {
      if (side === 'inf') return 0.5;
      const n = recipBelow(eps);
      return n / (n + 1);
    },
  },
  {
    id: 'dyadic',
    tex: '\\{1-\\tfrac1{2^k} : k\\in\\mathbb{N}\\}',
    label: '{1 − 1/2ᵏ : k ∈ ℕ}',
    name: 'האיברים 1 פחות 1 חלקי 2 בחזקת k',
    kind: 'points',
    pieces: [],
    // 1 − 2^-k is not told from 1 in a double past k = 52: list 45 terms at most
    points: seqPoints((k) => 1 - 2 ** -k, 45),
    sup: 1,
    supAttained: false,
    supText: '1',
    inf: 0.5,
    infAttained: true,
    infText: '1/2',
    view: [0, 1.25],
    contains: (x) => x >= 0.5 && x < 1 && nearInt(-Math.log2(1 - x)) && Math.round(-Math.log2(1 - x)) >= 1,
    // sup: the least k with 2^-k < ε. The proof's k = ⌊1/ε⌋+1 also works (2^k >= 1+k by Bernoulli) but is huge.
    witness: (eps, side) => {
      if (side === 'inf') return 0.5;
      let k = Math.max(1, Math.floor(Math.log2(1 / eps)) + 1);
      while (2 ** -k >= eps) k++;
      return 1 - 2 ** -k;
    },
  },
  {
    id: 'alternating',
    tex: '\\{(-1)^n+\\tfrac1n : n\\in\\mathbb{N}\\}',
    label: '{(−1)ⁿ + 1/n : n ∈ ℕ}',
    name: 'האיברים מינוס 1 בחזקת n ועוד 1 חלקי n',
    kind: 'points',
    pieces: [],
    points: seqPoints((n) => (n % 2 === 0 ? 1 : -1) + 1 / n),
    // n = 2: 1 + 1/2 = 3/2 is the largest (even n: 1 + 1/n decreases to 1, odd n gives values below 0)
    sup: 1.5,
    supAttained: true,
    supText: '3/2',
    // odd n: -1 + 1/n decreases to -1 and never reaches it; even n give values above 1
    inf: -1,
    infAttained: false,
    infText: '−1',
    view: [-1.5, 2],
    contains: (x) => {
      if (x > 1) return nearInt(1 / (x - 1)) && Math.round(1 / (x - 1)) % 2 === 0;
      if (x > -1 && x <= 0) return nearInt(1 / (x + 1)) && Math.round(1 / (x + 1)) % 2 === 1;
      return false;
    },
    // inf: k = ⌊1/ε⌋ + 1 has 1/k < ε; the odd n = 2k + 1 ≥ k gives -1 + 1/n < -1 + ε (lesson 1.6, example 3)
    witness: (eps, side) => {
      if (side === 'sup') return 1.5;
      const k = recipBelow(eps);
      const n = 2 * k + 1;
      return -1 + 1 / n;
    },
  },
  {
    id: 'naturals',
    tex: '\\mathbb{N}',
    label: 'ℕ',
    name: 'הטבעיים',
    kind: 'points',
    pieces: [],
    points: (count = 14) => range(count),
    sup: null,
    supAttained: false,
    supText: '',
    inf: 1,
    infAttained: true,
    infText: '1',
    view: [0, 14],
    contains: (x) => Number.isInteger(x) && x >= 1,
    witness: (_e, side) => (side === 'inf' ? 1 : null),
    // lesson 1.6.1 / 1.6.2: the element above M is n = ⌊M⌋ + 1 (and 1 if M < 1)
    exceedsUnbounded: (M) => Math.max(1, fl(M) + 1),
  },
];

export const SETS: Record<SetId, SupSet> = Object.fromEntries(CORES.map((c) => [c.id, finish(c)])) as Record<SetId, SupSet>;

/** the ids in the order of the lessons that use them */
export const SET_IDS = CORES.map((c) => c.id) as SetId[];

/* ---- sums of sets (lesson 1.5.7) ---- */

/** A + B for interval sets, piece by piece (no merging): an end is closed iff both summed ends are */
export function addPieces(P: Piece[], Q: Piece[]): Piece[] {
  const out: Piece[] = [];
  for (const a of P)
    for (const b of Q) out.push(piece(a.lo + b.lo, a.hi + b.hi, a.loClosed && b.loClosed, a.hiClosed && b.hiClosed));
  return out.sort((x, y) => x.lo - y.lo);
}

export interface SumPair {
  id: SumId;
  A: SupSet;
  B: SupSet;
  AB: SupSet;
  view: [number, number];
}

function sumSet(A: SupSet, B: SupSet, parts: Pick<Core, 'id' | 'tex' | 'label' | 'name' | 'kind' | 'pieces' | 'points' | 'contains'>, view: [number, number]): SupSet {
  const sup = A.sup !== null && B.sup !== null ? A.sup + B.sup : null;
  const inf = A.inf !== null && B.inf !== null ? A.inf + B.inf : null;
  return finish({
    ...parts,
    sup,
    supAttained: A.supAttained && B.supAttained,
    supText: sup === null ? '' : fmt(sup),
    inf,
    infAttained: A.infAttained && B.infAttained,
    infText: inf === null ? '' : fmt(inf),
    view,
    // the proof of 1.5.7: a within eps/2 of sup A and b within eps/2 of sup B give a + b within eps of sup(A+B)
    witness: (eps, side) => {
      const a = A.witness(eps / 2, side);
      const b = B.witness(eps / 2, side);
      return a === null || b === null ? null : a + b;
    },
  });
}

const fmt = (v: number) => String(Number(v.toFixed(6))).replace(/^-/, '−');

const SEQ_A = SETS.reciprocals;
const SEQ_B = SETS.ratio;
const IV_A = finish(piecesSet('sum-a-open', '(0,1)', '(0, 1)', 'הקבוצה A', [piece(0, 1, false, false)], [-0.5, 4.5]));
const IV_B = finish(piecesSet('sum-b-half', '[2,3)', '[2, 3)', 'הקבוצה B', [piece(2, 3, true, false)], [-0.5, 4.5]));

/** index m <= 400 and n with x = 1/m + n/(n+1): invert n/(n+1) = x - 1/m */
const inSeqSum = (x: number): boolean => {
  for (let m = 1; m <= 400; m++) {
    const y = x - 1 / m;
    if (y > 0.5 - 1e-9 && y < 1 && SEQ_B.contains(y)) return true;
  }
  return false;
};

export const SUM_PAIRS: Record<SumId, SumPair> = {
  'sum-intervals': {
    id: 'sum-intervals',
    A: IV_A,
    B: IV_B,
    AB: sumSet(IV_A, IV_B, { id: 'sum-ab-iv', tex: 'A+B', label: 'A + B', name: 'סכום הקבוצות', kind: 'pieces', pieces: addPieces(IV_A.pieces, IV_B.pieces), points: () => [], contains: (x) => addPieces(IV_A.pieces, IV_B.pieces).some((P) => inPiece(P, x)) }, [-0.5, 4.5]),
    view: [-0.5, 4.5],
  },
  'sum-sequences': {
    id: 'sum-sequences',
    A: SEQ_A,
    B: SEQ_B,
    AB: sumSet(
      SEQ_A,
      SEQ_B,
      {
        id: 'sum-ab-seq',
        tex: 'A+B',
        label: 'A + B',
        name: 'סכום הקבוצות',
        kind: 'points',
        pieces: [],
        points: (count = 30) => {
          const out: number[] = [];
          for (let m = 1; m <= count; m++) for (let n = 1; n <= count; n++) out.push(1 / m + n / (n + 1));
          return sortedUnique(out);
        },
        contains: inSeqSum,
      },
      [-0.25, 2.5],
    ),
    view: [-0.25, 2.5],
  },
};

export const SUM_IDS = Object.keys(SUM_PAIRS) as SumId[];
export const isSumId = (id: string): id is SumId => id in SUM_PAIRS;
export const isSetId = (id: string): id is SetId => id in SETS;

/** The witnesses of lesson 1.5.7's proof: a ∈ A and b ∈ B within eps/2 of the sups (infs), and their sum in A + B. */
export function sumWitness(pair: SumPair, eps: number, side: Side): { a: number; b: number; c: number } | null {
  const a = pair.A.witness(eps / 2, side);
  const b = pair.B.witness(eps / 2, side);
  return a === null || b === null ? null : { a, b, c: a + b };
}

/* ---- the band test ---- */

/**
 * An element of the set inside the band with ends lo, hi (each open or closed), or null if the scan finds none.
 * Intervals: the midpoint of the part inside the band (an endpoint for a one-point part). Terms: the largest element
 * in the band when `prefer` is 'high' (side 'sup'), the smallest when 'low'. A numeric probe on the first 4000 terms:
 * `null` means "none among the terms listed".
 */
export function findInBand(set: SupSet, lo: number, hi: number, loClosed: boolean, hiClosed: boolean, prefer: 'high' | 'low' = 'high'): number | null {
  if (set.kind !== 'points') {
    for (const P of set.pieces) {
      const L = lo > P.lo ? lo : P.lo;
      const lc = lo > P.lo ? loClosed : lo < P.lo ? P.loClosed : loClosed && P.loClosed;
      const H = hi < P.hi ? hi : P.hi;
      const hc = hi < P.hi ? hiClosed : hi > P.hi ? P.hiClosed : hiClosed && P.hiClosed;
      if (L < H) return (L + H) / 2;
      if (L === H && lc && hc) return L;
    }
    return null;
  }
  const pts = set.points(4000);
  const inside = (x: number) => (loClosed ? x >= lo : x > lo) && (hiClosed ? x <= hi : x < hi);
  if (prefer === 'high') {
    for (let i = pts.length - 1; i >= 0; i--) if (inside(pts[i])) return pts[i];
  } else {
    for (const x of pts) if (inside(x)) return x;
  }
  return null;
}

/**
 * The band of lesson 1.4.8 around a candidate M: (M - eps, M] for side 'sup', [M, M + eps) for side 'inf', and the
 * element of the set in it (exactly the proof's witness when M is the sup/inf, a probe otherwise).
 */
export function bandWitness(set: SupSet, side: Side, M: number, eps: number): number | null {
  const bound = side === 'sup' ? set.sup : set.inf;
  if (bound !== null && Math.abs(M - bound) < TOL) return set.witness(eps, side);
  return side === 'sup' ? findInBand(set, M - eps, M, false, true, 'high') : findInBand(set, M, M + eps, true, false, 'low');
}

/**
 * M is the smallest value on the grid of `step` that is a bound (the figure's "least bound"): a bound, and M - step is not.
 * The sup itself is exactly the least bound; on a grid that does not contain it this is the nearest value above it.
 */
export function isLeastOnGrid(set: SupSet, side: Side, M: number, step: number): boolean {
  return side === 'sup'
    ? set.isUpperBound(M) && !set.isUpperBound(M - step)
    : set.isLowerBound(M) && !set.isLowerBound(M + step);
}

/* ---- archimedes mode ---- */

/** The smallest n in ℕ with n·c > M (c > 0): n = ⌊M/c⌋ + 1, and 1 when that is below 1 (lesson 1.6.2). */
export function archimedesN(M: number, c = 1): number {
  return Math.max(1, fl(M / c) + 1);
}

/* ---- density mode ---- */

export interface Density {
  /** the denominator: n > 1/(b-a), the smallest such n unless overridden */
  n: number;
  /** m = ⌊na⌋ + 1 */
  m: number;
  /** m/n */
  q: number;
  /** a < m/n < b (always true for the smallest n; may fail for an overridden n) */
  inside: boolean;
  /** how many fractions k/n lie in (a, b) */
  count: number;
}

/** Lesson 1.6.7: n = smallest natural > 1/(b-a), m = ⌊na⌋ + 1; then a < m/n < b because na < m <= na + 1 < nb. */
export function density(a: number, b: number, nOverride?: number): Density {
  const n = nOverride ?? archimedesN(1 / (b - a));
  const m = fl(n * a) + 1;
  const q = m / n;
  return { n, m, q, inside: q > a && q < b, count: Math.max(0, cl(n * b) - m) };
}

/** The fractions k/n in [lo, hi], ascending (the grid the figure draws). */
export function gridPoints(n: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let k = cl(lo * n); k <= fl(hi * n); k++) out.push((k === 0 ? 0 : k) / n);
  return out;
}

/* ---- root mode ---- */

/** The k-th root of a >= 0 by bisection on [0, max(1, a)]: a numeric probe, 200 halvings (lesson 1.7.2 proves it exists). */
export function kthRoot(a: number, k: number): number {
  let lo = 0;
  let hi = Math.max(1, a);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (mid ** k < a) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface RootStep {
  /** 'below': x^k < a (x in S); 'above': x^k > a (x is an upper bound of S); 'equal': x^k = a up to 1e-9 relative */
  kind: 'below' | 'above' | 'equal';
  xk: number;
  /** the step of the proof; 0 when equal */
  h: number;
  /** below: x + h, an element of S larger than x; above: x - h, an upper bound of S smaller than x; equal: x */
  moved: number;
  /** below: (x+h)^k - x^k and its bound h·k(x+1)^(k-1); above: x^k - (x-h)^k and its bound h·k·x^(k-1) */
  gap: number;
  gapBound: number;
}

/**
 * The two cases of lemma 1.7.1 / theorem 1.7.2 at a candidate x >= 0 for S = {y >= 0 : y^k < a}, a > 0.
 * below: h = min(1, (a - x^k) / (2k(x+1)^(k-1))): then (x+h)^k - x^k <= h·k(x+1)^(k-1) <= (a - x^k)/2 < a - x^k,
 *   so (x+h)^k < a: x + h ∈ S, x is not an upper bound.
 * above: h = (x^k - a)/(k·x^(k-1)) (< x/k): then x^k - (x-h)^k <= h·k·x^(k-1) = x^k - a, so (x-h)^k >= a: x - h is an
 *   upper bound of S (every y ∈ S has y^k < a <= (x-h)^k, so y < x - h), smaller than x: x is not the least one.
 */
export function rootStep(x: number, a: number, k: number): RootStep {
  const xk = x ** k;
  if (Math.abs(xk - a) <= 1e-9 * Math.max(1, a)) return { kind: 'equal', xk, h: 0, moved: x, gap: 0, gapBound: 0 };
  if (xk < a) {
    const c = k * (x + 1) ** (k - 1);
    const h = Math.min(1, (a - xk) / (2 * c));
    return { kind: 'below', xk, h, moved: x + h, gap: (x + h) ** k - xk, gapBound: h * c };
  }
  const c = k * x ** (k - 1);
  const h = (xk - a) / c;
  return { kind: 'above', xk, h, moved: x - h, gap: xk - (x - h) ** k, gapBound: h * c };
}
