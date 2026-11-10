/**
 * MODEL SPECIFICATION
 *
 * System:        a finite universe U of labelled elements and two or three subsets A, B, C of it; set
 *                expressions built from A, B, C with ∪, ∩, ∖ and the complement in U. Lesson 0.7's figure
 *                (SetVenn) draws U as a rectangle, A, B, C as circles, and each element as a point inside exactly
 *                the circles of the sets it belongs to; the learner marks the elements of an expression, or
 *                hunts for an element that tells two expressions apart.
 * Dynamics:      none; the learner marks points.
 * Boundary:      finite sets only, and every answer is exact (membership bookkeeping, no rounding). An element's
 *                membership in an expression depends only on its region: which of A, B, C it lies in
 *                (Definition 0.7.4). So comparing two expressions on the 2ᵏ regions (the "membership table")
 *                is the truth-table check of lesson 0.2: when it finds no difference the identity holds for all
 *                sets, and when it finds one, any element of that region is a counterexample. On a universe
 *                where some region is empty, two different expressions can give the same set: that is one
 *                example, not a proof, and `regionsCovered` says whether the universe has a point everywhere.
 *                The Venn geometry is a drawing aid; the tests check that every drawn point lies inside exactly
 *                the circles of its sets.
 * Ignored:       infinite sets (intervals, ℕ): the lesson proves those by double inclusion, never here.
 * Valid when:    every set is a subset of U, and an expression names only the sets the preset has.
 * Failure modes: none known; the tests check every law of the lesson on every triple of subsets of a
 *                4-element universe against the membership table.
 *
 * Use it to recompute every finite claim of lesson 0.7 (lesson, bank, workbook) and to drive SetVenn.
 */

/* ------------------------------------------------------------------ finite sets */

/** A finite set of labels, kept sorted and without repeats (so two equal sets have equal arrays). */
export type FSet = readonly number[];

export const fset = (xs: Iterable<number>): number[] => [...new Set(xs)].sort((a, b) => a - b);
export const has = (A: FSet, x: number): boolean => A.includes(x);
export const union = (A: FSet, B: FSet): number[] => fset([...A, ...B]);
export const inter = (A: FSet, B: FSet): number[] => A.filter((x) => has(B, x));
export const diff = (A: FSet, B: FSet): number[] => A.filter((x) => !has(B, x));
/** the complement in U: U ∖ A */
export const complement = (A: FSet, U: FSet): number[] => diff(U, A);
export const subset = (A: FSet, B: FSet): boolean => A.every((x) => has(B, x));
/** Definition 0.7.1: the same elements; by 0.7.3(ד), inclusion both ways */
export const equal = (A: FSet, B: FSet): boolean => subset(A, B) && subset(B, A);

/** Every subset of A (Definition 0.7.7: the power set), as sorted arrays; 2^|A| of them. */
export function powerSet(A: FSet): number[][] {
  const out: number[][] = [];
  const n = A.length;
  for (let m = 0; m < 2 ** n; m++) out.push(A.filter((_, i) => (m >> i) & 1));
  return out;
}

/** A family of sets as a set of sets: sets compare by their elements (key = the sorted list). */
const key = (X: FSet) => fset(X).join(',');
export const familyHas = (F: readonly FSet[], X: FSet): boolean => F.some((Y) => key(Y) === key(X));
export const familySubset = (F: readonly FSet[], G: readonly FSet[]): boolean => F.every((X) => familyHas(G, X));
export const familyEqual = (F: readonly FSet[], G: readonly FSet[]): boolean => familySubset(F, G) && familySubset(G, F);
export const familyUnion = (F: readonly FSet[], G: readonly FSet[]): FSet[] => [...F, ...G.filter((X) => !familyHas(F, X))];
export const familyInter = (F: readonly FSet[], G: readonly FSet[]): FSet[] => F.filter((X) => familyHas(G, X));

/** An ordered pair, and the Cartesian product A × B (Definition 0.7.7). */
export type OPair = readonly [number, number];
export const product = (A: FSet, B: FSet): OPair[] => A.flatMap((a) => B.map((b) => [a, b] as const));
const pk = (p: OPair) => `${p[0]}|${p[1]}`;
export const pairsEqual = (P: readonly OPair[], Q: readonly OPair[]): boolean => {
  const a = new Set(P.map(pk));
  const b = new Set(Q.map(pk));
  return a.size === b.size && [...a].every((k) => b.has(k));
};
export const pairsUnion = (P: readonly OPair[], Q: readonly OPair[]): OPair[] => {
  const seen = new Set(P.map(pk));
  return [...P, ...Q.filter((q) => !seen.has(pk(q)))];
};
export const pairsInter = (P: readonly OPair[], Q: readonly OPair[]): OPair[] => {
  const b = new Set(Q.map(pk));
  return P.filter((p) => b.has(pk(p)));
};
export const pairsDiff = (P: readonly OPair[], Q: readonly OPair[]): OPair[] => {
  const b = new Set(Q.map(pk));
  return P.filter((p) => !b.has(pk(p)));
};

/** The union and intersection of an indexed family A_i, i ∈ I (Definition 0.7.9), inside U. I must not be empty. */
export function bigUnion(family: readonly FSet[], U: FSet): number[] {
  if (family.length === 0) throw new Error('bigUnion: the index set must not be empty');
  return U.filter((x) => family.some((A) => has(A, x)));
}
export function bigInter(family: readonly FSet[], U: FSet): number[] {
  if (family.length === 0) throw new Error('bigInter: the index set must not be empty');
  return U.filter((x) => family.every((A) => has(A, x)));
}

/* ------------------------------------------------------------------ set expressions */

export type SetName = 'A' | 'B' | 'C';
export const NAMES: readonly SetName[] = ['A', 'B', 'C'];

export type Expr =
  | { op: 'set'; name: SetName }
  | { op: 'union' | 'inter' | 'diff'; l: Expr; r: Expr }
  | { op: 'comp'; e: Expr };

export const S = (name: SetName): Expr => ({ op: 'set', name });
export const U_ = (l: Expr, r: Expr): Expr => ({ op: 'union', l, r });
export const I_ = (l: Expr, r: Expr): Expr => ({ op: 'inter', l, r });
export const D_ = (l: Expr, r: Expr): Expr => ({ op: 'diff', l, r });
export const C_ = (e: Expr): Expr => ({ op: 'comp', e });

export interface Universe {
  U: FSet;
  sets: Partial<Record<SetName, FSet>>;
}

/** The set an expression names, in a universe. */
export function evalExpr(e: Expr, u: Universe): number[] {
  switch (e.op) {
    case 'set': {
      const X = u.sets[e.name];
      if (!X) throw new Error(`evalExpr: the universe has no set ${e.name}`);
      return fset(X);
    }
    case 'union':
      return union(evalExpr(e.l, u), evalExpr(e.r, u));
    case 'inter':
      return inter(evalExpr(e.l, u), evalExpr(e.r, u));
    case 'diff':
      return diff(evalExpr(e.l, u), evalExpr(e.r, u));
    case 'comp':
      return complement(evalExpr(e.e, u), u.U);
  }
}

const SYM = { union: '∪', inter: '∩', diff: '∖' } as const;
/** An expression as plain text, fully bracketed where two operations meet: "A∖(B∪C)", "(A∩B)ᶜ". */
export function show(e: Expr): string {
  switch (e.op) {
    case 'set':
      return e.name;
    case 'comp': {
      const inner = show(e.e);
      return e.e.op === 'set' ? `${inner}ᶜ` : `(${inner})ᶜ`;
    }
    default: {
      const side = (x: Expr) => (x.op === 'set' || x.op === 'comp' ? show(x) : `(${show(x)})`);
      return `${side(e.l)}${SYM[e.op]}${side(e.r)}`;
    }
  }
}

/** The names an expression uses, in order A, B, C. */
export function namesOf(...es: Expr[]): SetName[] {
  const seen = new Set<SetName>();
  const walk = (e: Expr) => {
    if (e.op === 'set') seen.add(e.name);
    else if (e.op === 'comp') walk(e.e);
    else {
      walk(e.l);
      walk(e.r);
    }
  };
  es.forEach(walk);
  return NAMES.filter((n) => seen.has(n));
}

/* ------------------------------------------------------------------ regions: the membership table */

/** The region of an element: bit k set when it lies in the k-th set (A = 1, B = 2, C = 4). */
export function regionOf(x: number, u: Universe, k: number): number {
  let m = 0;
  for (let i = 0; i < k; i++) if (has(u.sets[NAMES[i]] ?? [], x)) m |= 1 << i;
  return m;
}

/** Does an element of region m (of k sets) belong to the expression? It depends on m alone. */
export function regionIn(e: Expr, m: number, k: number): boolean {
  // one representative element per region: element m lies in the i-th set exactly when bit i of m is set
  const U = Array.from({ length: 2 ** k }, (_, r) => r);
  const sets: Partial<Record<SetName, FSet>> = {};
  for (let i = 0; i < k; i++) sets[NAMES[i]] = U.filter((r) => (r >> i) & 1);
  return has(evalExpr(e, { U, sets }), m);
}

/** The regions (of k sets) an expression covers: its row of the membership table. */
export const regionsOf = (e: Expr, k: number): number[] => Array.from({ length: 2 ** k }, (_, m) => m).filter((m) => regionIn(e, m, k));

/** The regions where two expressions differ; none means the identity holds for every k sets (truth table). */
export const differingRegions = (e1: Expr, e2: Expr, k: number): number[] =>
  Array.from({ length: 2 ** k }, (_, m) => m).filter((m) => regionIn(e1, m, k) !== regionIn(e2, m, k));

export const identity = (e1: Expr, e2: Expr, k: number): boolean => differingRegions(e1, e2, k).length === 0;

/** Does the universe have an element in each of the 2ᵏ regions? Then one universe decides every identity. */
export function regionsCovered(u: Universe, k: number): boolean {
  const seen = new Set(u.U.map((x) => regionOf(x, u, k)));
  return seen.size === 2 ** k;
}

/* ------------------------------------------------------------------ the Venn drawing */

/** Units: the universe U is the rectangle [0, W] × [0, H], x to the right, y downwards (screen order). */
export const VENN_W = 1.3;
export const VENN_H = 1;

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export const CIRCLES: Record<2 | 3, Circle[]> = {
  2: [
    { x: 0.5, y: 0.5, r: 0.3 },
    { x: 0.8, y: 0.5, r: 0.3 },
  ],
  3: [
    { x: 0.5, y: 0.38, r: 0.27 },
    { x: 0.8, y: 0.38, r: 0.27 },
    { x: 0.65, y: 0.64, r: 0.27 },
  ],
};

export const inCircle = (c: Circle, x: number, y: number): boolean => (x - c.x) ** 2 + (y - c.y) ** 2 < c.r ** 2;

/** The region of a point of the drawing (bit i when it is inside circle i). */
export function regionAt(k: 2 | 3, x: number, y: number): number {
  return CIRCLES[k].reduce((m, c, i) => (inCircle(c, x, y) ? m | (1 << i) : m), 0);
}

/** Distance from a point to the nearest line of the drawing: a circle or the edge of U. */
export function clearance(k: 2 | 3, x: number, y: number): number {
  const toCircles = CIRCLES[k].map((c) => Math.abs(Math.hypot(x - c.x, y - c.y) - c.r));
  return Math.min(...toCircles, x, VENN_W - x, y, VENN_H - y);
}

/**
 * Places for `count` points in region m: on a grid inside the region, the spot with the most room first, then
 * each next spot as far as possible from the lines and from the spots already taken. Deterministic.
 */
export function slots(k: 2 | 3, m: number, count: number): [number, number][] {
  const grid: [number, number, number][] = [];
  const step = 0.01;
  for (let x = step; x < VENN_W; x += step) {
    for (let y = step; y < VENN_H; y += step) {
      if (regionAt(k, x, y) === m) grid.push([x, y, clearance(k, x, y)]);
    }
  }
  const out: [number, number][] = [];
  for (let n = 0; n < count; n++) {
    let best: [number, number] | null = null;
    let bestScore = -Infinity;
    for (const [x, y, cl] of grid) {
      const room = out.length ? Math.min(...out.map(([a, b]) => Math.hypot(x - a, y - b))) / 2 : Infinity;
      const score = Math.min(cl, room);
      if (score > bestScore + 1e-12) {
        bestScore = score;
        best = [x, y];
      }
    }
    if (!best) throw new Error(`slots: region ${m} of ${k} sets is empty in the drawing`);
    out.push(best);
  }
  return out;
}

/** Where to draw each element of a universe: inside exactly the circles of its sets. */
export function layout(u: Universe, k: 2 | 3): Map<number, [number, number]> {
  const byRegion = new Map<number, number[]>();
  for (const x of u.U) {
    const m = regionOf(x, u, k);
    byRegion.set(m, [...(byRegion.get(m) ?? []), x]);
  }
  const pos = new Map<number, [number, number]>();
  for (const [m, xs] of byRegion) {
    const at = slots(k, m, xs.length);
    xs.forEach((x, i) => pos.set(x, at[i]));
  }
  return pos;
}

/* ------------------------------------------------------------------ presets of the figure */

/** Ten elements, one or more in each of the eight regions of A, B, C. */
const THREE: Universe = {
  U: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  sets: { A: [1, 2, 5, 6, 8], B: [3, 5, 7, 8], C: [4, 6, 7, 8] },
};
/** Eight elements: A = {1, 2, 3, 4}, B = {3, 4, 5}, the sets of the lesson's first example. */
const TWO: Universe = { U: [1, 2, 3, 4, 5, 6, 7, 8], sets: { A: [1, 2, 3, 4], B: [3, 4, 5] } };

export type VennId = 'union' | 'inter' | 'diff' | 'diff3' | 'comp-inter' | 'comp-union' | 'demorgan-right' | 'assoc-diff' | 'demorgan-wrong';

export interface VennPreset {
  /** button label: a formula sits in LRI … PDI so the RTL control panel keeps it LTR */
  name: string;
  k: 2 | 3;
  u: Universe;
  /** shade mode: the learner marks the elements of this expression */
  target: Expr;
  /** witness mode: the learner looks for an element in exactly one of `target` and `other` */
  other?: Expr;
}

const A = S('A');
const B = S('B');
const C = S('C');

export const VENN: Record<VennId, VennPreset> = {
  union: { name: '⁦A∪B⁩', k: 2, u: TWO, target: U_(A, B) },
  inter: { name: '⁦A∩B⁩', k: 2, u: TWO, target: I_(A, B) },
  diff: { name: '⁦A∖B⁩', k: 2, u: TWO, target: D_(A, B) },
  // the learner's first task: two operations at once
  diff3: { name: '⁦A∖(B∪C)⁩', k: 3, u: THREE, target: D_(A, U_(B, C)) },
  // De Morgan, one side at a time
  'comp-inter': { name: '⁦(A∩B)ᶜ⁩', k: 2, u: TWO, target: C_(I_(A, B)) },
  'comp-union': { name: '⁦(A∪B)ᶜ⁩', k: 2, u: TWO, target: C_(U_(A, B)) },
  'demorgan-right': { name: '⁦Aᶜ∪Bᶜ⁩', k: 2, u: TWO, target: U_(C_(A), C_(B)) },
  // difference is not associative: elements of A ∩ C tell the two sides apart
  'assoc-diff': { name: '⁦A∖(B∖C)⁩ מול ⁦(A∖B)∖C⁩', k: 3, u: THREE, target: D_(A, D_(B, C)), other: D_(D_(A, B), C) },
  // the wrong De Morgan: the complement does not keep ∪
  'demorgan-wrong': { name: '⁦(A∪B)ᶜ⁩ מול ⁦Aᶜ∪Bᶜ⁩', k: 2, u: TWO, target: C_(U_(A, B)), other: U_(C_(A), C_(B)) },
};
