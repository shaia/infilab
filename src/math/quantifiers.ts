/**
 * MODEL SPECIFICATION
 *
 * System:        a statement with two quantifiers over a finite relation, "Q₁ v₁ Q₂ v₂: R(x, y)", where
 *                x ∈ {1, …, nx}, y ∈ {1, …, ny}, each Qᵢ is ∀ or ∃ and (v₁, v₂) is (x, y) or (y, x). Lesson 0.3's
 *                figure (QuantifierGame) draws R as a grid and plays the statement as a game.
 * Dynamics:      the game reading of the statement: the players choose v₁ and then v₂, left to right. A ∃ is
 *                chosen by the prover, a ∀ by the refuter, each seeing every earlier choice. The prover wins when
 *                R holds at the chosen point. The statement is true exactly when the prover has a winning
 *                strategy: for "∀x ∃y" a rule y(x), for "∃y ∀x" one y. `bestMoves` gives a player's optimal
 *                moves, so a figure that picks among them plays adversarially and can never be beaten unfairly.
 * Boundary:      finite sets only, evaluated exhaustively: every claim here is exact on the grid. Over ℕ or ℝ
 *                the same statement may change truth value (y > x on {1..6} fails at x = 6, on ℕ it holds), and
 *                there the lesson proves, the grid only illustrates.
 * Ignored:       nothing numerical: the relation is boolean, so there is no rounding.
 * Valid when:    nx, ny ≥ 1 (a quantifier over an empty set is not modelled).
 * Failure modes: none known; the tests check the negation duality and ∃∀ ⇒ ∀∃ on every relation of a 3×3 grid.
 */

export type Var = 'x' | 'y';
export type Quant = 'forall' | 'exists';
export type Side = 'prover' | 'refuter';

/** Q₁ v₁ Q₂ v₂; the second variable is the other one. */
export interface Prefix {
  q1: Quant;
  v1: Var;
  q2: Quant;
}

export type OrderId = 'AxAy' | 'AxEy' | 'ExAy' | 'ExEy' | 'AyAx' | 'AyEx' | 'EyAx' | 'EyEx';

export const ORDERS: Record<OrderId, Prefix> = {
  AxAy: { q1: 'forall', v1: 'x', q2: 'forall' },
  AxEy: { q1: 'forall', v1: 'x', q2: 'exists' },
  ExAy: { q1: 'exists', v1: 'x', q2: 'forall' },
  ExEy: { q1: 'exists', v1: 'x', q2: 'exists' },
  AyAx: { q1: 'forall', v1: 'y', q2: 'forall' },
  AyEx: { q1: 'forall', v1: 'y', q2: 'exists' },
  EyAx: { q1: 'exists', v1: 'y', q2: 'forall' },
  EyEx: { q1: 'exists', v1: 'y', q2: 'exists' },
};

export const orderId = (p: Prefix): OrderId =>
  `${p.q1 === 'forall' ? 'A' : 'E'}${p.v1}${p.q2 === 'forall' ? 'A' : 'E'}${other(p.v1)}` as OrderId;

export interface Relation {
  nx: number;
  ny: number;
  r: (x: number, y: number) => boolean;
}

export const other = (v: Var): Var => (v === 'x' ? 'y' : 'x');
export const flip = (q: Quant): Quant => (q === 'forall' ? 'exists' : 'forall');
/** who chooses the variable bound by q: ∃ is the prover's move, ∀ the refuter's */
export const owner = (q: Quant): Side => (q === 'exists' ? 'prover' : 'refuter');

/** 1, …, n */
const upTo = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
/** the values a variable ranges over */
export const valuesOf = (R: Relation, v: Var) => upTo(v === 'x' ? R.nx : R.ny);
/** the grid point (x, y) when v₁ = a and v₂ = b */
export const pointOf = (v1: Var, a: number, b: number): [number, number] => (v1 === 'x' ? [a, b] : [b, a]);

const quantify = (q: Quant, vals: number[], p: (t: number) => boolean) => (q === 'forall' ? vals.every(p) : vals.some(p));

/** the inner statement "Q₂ v₂: R" once v₁ = a is fixed */
export function inner(R: Relation, p: Prefix, a: number): boolean {
  return quantify(p.q2, valuesOf(R, other(p.v1)), (b) => R.r(...pointOf(p.v1, a, b)));
}

/** the truth value of "Q₁ v₁ Q₂ v₂: R(x, y)" */
export function holds(R: Relation, p: Prefix): boolean {
  return quantify(p.q1, valuesOf(R, p.v1), (a) => inner(R, p, a));
}

/** The negation, mechanically: every ∀ becomes ∃, every ∃ becomes ∀, the variables keep their places. */
export const negatePrefix = (p: Prefix): Prefix => ({ q1: flip(p.q1), v1: p.v1, q2: flip(p.q2) });
/** ¬R, the condition at the end negated */
export const negateRelation = (R: Relation): Relation => ({ nx: R.nx, ny: R.ny, r: (x, y) => !R.r(x, y) });

/**
 * Why a statement is true, as grid points: the prover's winning strategy.
 * - ∃v₁ ∀v₂: one value a, and the whole line v₁ = a (`line`).
 * - ∀v₁ ∃v₂: for every a one b, the first that works (a rule b(a)).
 * - ∃v₁ ∃v₂: one point.  ∀v₁ ∀v₂: every point.
 * Null when the statement is false.
 */
export interface Certificate {
  points: [number, number][];
  line?: { v: Var; value: number };
}

export function witness(R: Relation, p: Prefix): Certificate | null {
  if (!holds(R, p)) return null;
  const as = valuesOf(R, p.v1);
  const bs = valuesOf(R, other(p.v1));
  const good = (a: number, b: number) => R.r(...pointOf(p.v1, a, b));
  if (p.q1 === 'exists') {
    const a = as.find((t) => inner(R, p, t))!;
    if (p.q2 === 'forall') return { points: bs.map((b) => pointOf(p.v1, a, b)), line: { v: p.v1, value: a } };
    return { points: [pointOf(p.v1, a, bs.find((b) => good(a, b))!)] };
  }
  if (p.q2 === 'exists') return { points: as.map((a) => pointOf(p.v1, a, bs.find((b) => good(a, b))!)) };
  return { points: as.flatMap((a) => bs.map((b) => pointOf(p.v1, a, b))) };
}

/** Why a statement is false: the witness of its negation, "the counterexample the negation promises". */
export function counterexample(R: Relation, p: Prefix): Certificate | null {
  return witness(negateRelation(R), negatePrefix(p));
}

/** how many of the line v = a satisfy R */
const lineCount = (R: Relation, v: Var, a: number) =>
  valuesOf(R, other(v)).filter((b) => R.r(...pointOf(v, a, b))).length;

/**
 * The optimal first moves (values of v₁) for the player who owns Q₁: the moves after which that player can
 * still force a win. When there are none, the moves that keep the most (prover) or fewest (refuter) true
 * points on the line, so a losing player still plays sensibly.
 */
export function bestFirstMoves(R: Relation, p: Prefix): number[] {
  const side = owner(p.q1);
  const as = valuesOf(R, p.v1);
  const winning = as.filter((a) => inner(R, p, a) === (side === 'prover'));
  if (winning.length) return winning;
  const score = (a: number) => (side === 'prover' ? 1 : -1) * lineCount(R, p.v1, a);
  const best = Math.max(...as.map(score));
  return as.filter((a) => score(a) === best);
}

/** The optimal second moves (values of v₂ once v₁ = a) for the player who owns Q₂; all values when none wins. */
export function bestSecondMoves(R: Relation, p: Prefix, a: number): number[] {
  const want = owner(p.q2) === 'prover';
  const bs = valuesOf(R, other(p.v1));
  const winning = bs.filter((b) => R.r(...pointOf(p.v1, a, b)) === want);
  return winning.length ? winning : bs;
}

/** The game ends at the point (v₁, v₂) = (a, b): the prover wins exactly when R holds there. */
export const winner = (R: Relation, p: Prefix, a: number, b: number): Side => (R.r(...pointOf(p.v1, a, b)) ? 'prover' : 'refuter');

/* ------------------------------------------------------------------ presets */

export type RelationId = 'mother' | 'master-key' | 'sum-even' | 'divides' | 'greater';

export interface RelationPreset extends Relation {
  /** button label */
  name: string;
  /** what R(x, y) says, in words (Hebrew, a formula inside LRI … PDI) */
  says: string;
  /** what x and y are */
  xIs: string;
  yIs: string;
}

/** person x's mother is woman MOTHER[x − 1]; women 3 and 4 have no children among the six */
export const MOTHER = [2, 5, 2, 1, 6, 5] as const;
/** lock x is opened by its own key KEY[x − 1], and key 4 opens every lock */
export const KEY = [2, 6, 1, 5, 3, 6] as const;
export const MASTER = 4;

export const RELATIONS: Record<RelationId, RelationPreset> = {
  mother: {
    name: 'אמא',
    says: 'האישה ⁦y⁩ היא האמא של האדם ⁦x⁩',
    xIs: '⁦x⁩: אדם (1 עד 6)',
    yIs: '⁦y⁩: אישה (1 עד 6)',
    nx: 6,
    ny: 6,
    r: (x, y) => MOTHER[x - 1] === y,
  },
  'master-key': {
    name: 'מפתח ראשי',
    says: 'המפתח ⁦y⁩ פותח את המנעול ⁦x⁩',
    xIs: '⁦x⁩: מנעול (1 עד 6)',
    yIs: '⁦y⁩: מפתח (1 עד 6)',
    nx: 6,
    ny: 6,
    r: (x, y) => y === MASTER || KEY[x - 1] === y,
  },
  'sum-even': {
    name: '⁦x + y⁩ זוגי',
    says: 'הסכום ⁦x + y⁩ זוגי',
    xIs: '⁦x⁩: מספר (1 עד 6)',
    yIs: '⁦y⁩: מספר (1 עד 6)',
    nx: 6,
    ny: 6,
    r: (x, y) => (x + y) % 2 === 0,
  },
  divides: {
    name: '⁦x⁩ מחלק את ⁦y⁩',
    says: 'המספר ⁦x⁩ מחלק את ⁦y⁩ (כלומר ⁦y⁩ הוא כפולה של ⁦x⁩)',
    xIs: '⁦x⁩: מספר (1 עד 6)',
    yIs: '⁦y⁩: מספר (1 עד 6)',
    nx: 6,
    ny: 6,
    r: (x, y) => y % x === 0,
  },
  greater: {
    name: '⁦y > x⁩',
    says: '⁦y > x⁩',
    xIs: '⁦x⁩: מספר (1 עד 6)',
    yIs: '⁦y⁩: מספר (1 עד 6)',
    nx: 6,
    ny: 6,
    r: (x, y) => y > x,
  },
};

/* ------------------------------------------------------------------ text */

const SYM: Record<Quant, string> = { forall: '∀', exists: '∃' };

/** "∀x ∃y: R(x,y)", or with `negated` the condition "¬R(x,y)": plain LTR text for readouts and labels */
export const formulaText = (p: Prefix, negated = false): string =>
  `${SYM[p.q1]}${p.v1} ${SYM[p.q2]}${other(p.v1)}: ${negated ? '¬' : ''}R(x,y)`;
