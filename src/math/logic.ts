/**
 * MODEL SPECIFICATION
 *
 * System:        propositional formulas over a few statement letters (P, Q, R, S) built with the five
 *                connectives of lesson 0.2: ¬ (not), ∧ (and), ∨ (inclusive or), ⇒ (implication), ⇔ (equivalence).
 *                A formula's truth table lists its value on every assignment of truth values to its letters.
 * Dynamics:      none.
 * Boundary:      at most four letters (16 rows). The rows are listed in the textbook order: the first letter
 *                changes slowest, and T comes before F (for P, Q: TT, TF, FT, FF).
 * Ignored:       quantifiers and open statements ("x > 2" with x unknown): lesson 0.3. A formula here is about
 *                truth values only, never about what the letters say.
 * Valid when:    always: a truth table over finitely many letters is exhaustive, so `equivalent` and
 *                `differingRows` are proofs, not probes (unlike a numerical window of a sequence).
 * Failure modes: a source string with a letter or symbol outside the grammar is rejected by `parse` (it throws);
 *                nothing is guessed.
 *
 * Grammar (loosest first): iff := imp ('⇔' imp)* ; imp := or ('⇒' imp)? (right-associative) ;
 * or := and ('∨' and)* ; and := not ('∧' not)* ; not := '¬' not | letter | '(' iff ')'.
 * ASCII spellings are accepted: ~ or ! for ¬, & for ∧, | for ∨, -> or => for ⇒, <-> or <=> for ⇔.
 */

export type Letter = 'P' | 'Q' | 'R' | 'S';
export const LETTERS: readonly Letter[] = ['P', 'Q', 'R', 'S'];

export type Formula =
  | { kind: 'var'; name: Letter }
  | { kind: 'not'; a: Formula }
  | { kind: 'and' | 'or' | 'implies' | 'iff'; a: Formula; b: Formula };

export type Assignment = Partial<Record<Letter, boolean>>;

const SYMBOL = { and: '∧', or: '∨', implies: '⇒', iff: '⇔' } as const;

/* ------------------------------------------------------------------ parsing */

function tokenize(src: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const three = src.slice(i, i + 3);
    const two = src.slice(i, i + 2);
    if (three === '<->' || three === '<=>') {
      out.push('⇔');
      i += 3;
    } else if (two === '->' || two === '=>') {
      out.push('⇒');
      i += 2;
    } else if ('⇔↔'.includes(c)) {
      out.push('⇔');
      i++;
    } else if ('⇒→'.includes(c)) {
      out.push('⇒');
      i++;
    } else if ('¬~!'.includes(c)) {
      out.push('¬');
      i++;
    } else if ('∧&'.includes(c)) {
      out.push('∧');
      i++;
    } else if ('∨|'.includes(c)) {
      out.push('∨');
      i++;
    } else if (c === '(' || c === ')' || (LETTERS as readonly string[]).includes(c)) {
      out.push(c);
      i++;
    } else {
      throw new Error(`logic.parse: unexpected "${c}" at ${i} in "${src}"`);
    }
  }
  return out;
}

/** Parses a formula such as "¬Q ⇒ ¬P" or "(P -> Q) & (Q -> P)". Throws on anything outside the grammar. */
export function parse(src: string): Formula {
  const t = tokenize(src);
  let k = 0;
  const peek = () => t[k];
  const eat = (s: string) => {
    if (t[k] !== s) throw new Error(`logic.parse: expected "${s}" at token ${k} in "${src}"`);
    k++;
  };
  const iff = (): Formula => {
    let f = imp();
    while (peek() === '⇔') {
      k++;
      f = { kind: 'iff', a: f, b: imp() };
    }
    return f;
  };
  const imp = (): Formula => {
    const f = or();
    if (peek() === '⇒') {
      k++;
      return { kind: 'implies', a: f, b: imp() };
    }
    return f;
  };
  const or = (): Formula => {
    let f = and();
    while (peek() === '∨') {
      k++;
      f = { kind: 'or', a: f, b: and() };
    }
    return f;
  };
  const and = (): Formula => {
    let f = not();
    while (peek() === '∧') {
      k++;
      f = { kind: 'and', a: f, b: not() };
    }
    return f;
  };
  const not = (): Formula => {
    const s = peek();
    if (s === '¬') {
      k++;
      return { kind: 'not', a: not() };
    }
    if (s === '(') {
      k++;
      const f = iff();
      eat(')');
      return f;
    }
    if (s !== undefined && (LETTERS as readonly string[]).includes(s)) {
      k++;
      return { kind: 'var', name: s as Letter };
    }
    throw new Error(`logic.parse: expected a letter, "¬" or "(" at token ${k} in "${src}"`);
  };
  const f = iff();
  if (k !== t.length) throw new Error(`logic.parse: unexpected "${t[k]}" at token ${k} in "${src}"`);
  return f;
}

/* --------------------------------------------------------------- evaluation */

/** The truth value of a formula under an assignment; a letter the assignment lacks is an error. */
export function evaluate(f: Formula, v: Assignment): boolean {
  switch (f.kind) {
    case 'var': {
      const x = v[f.name];
      if (x === undefined) throw new Error(`logic.evaluate: no value for ${f.name}`);
      return x;
    }
    case 'not':
      return !evaluate(f.a, v);
    case 'and':
      return evaluate(f.a, v) && evaluate(f.b, v);
    case 'or':
      return evaluate(f.a, v) || evaluate(f.b, v);
    case 'implies':
      // false in exactly one case: the hypothesis true and the conclusion false
      return !evaluate(f.a, v) || evaluate(f.b, v);
    case 'iff':
      return evaluate(f.a, v) === evaluate(f.b, v);
  }
}

/** The letters a formula uses, in the order P, Q, R, S. */
export function letters(...fs: Formula[]): Letter[] {
  const used = new Set<Letter>();
  const walk = (f: Formula) => {
    if (f.kind === 'var') used.add(f.name);
    else if (f.kind === 'not') walk(f.a);
    else {
      walk(f.a);
      walk(f.b);
    }
  };
  fs.forEach(walk);
  return LETTERS.filter((l) => used.has(l));
}

/** Every assignment of the letters, textbook order: the first letter slowest, T before F. */
export function rows(ls: readonly Letter[]): Assignment[] {
  const n = ls.length;
  const out: Assignment[] = [];
  for (let r = 0; r < 2 ** n; r++) {
    const a: Assignment = {};
    ls.forEach((l, i) => {
      a[l] = ((r >> (n - 1 - i)) & 1) === 0;
    });
    out.push(a);
  }
  return out;
}

/** The truth-table column of a formula over the given letters (default: its own). */
export function column(f: Formula, ls: readonly Letter[] = letters(f)): boolean[] {
  return rows(ls).map((a) => evaluate(f, a));
}

/** The row indices (over the letters of both) where two formulas take different values. */
export function differingRows(f: Formula, g: Formula, ls: readonly Letter[] = letters(f, g)): number[] {
  const cf = column(f, ls);
  const cg = column(g, ls);
  return cf.flatMap((x, i) => (x !== cg[i] ? [i] : []));
}

/** Logically equivalent: the same value in every row of the joint truth table. Exhaustive, hence a proof. */
export const equivalent = (f: Formula, g: Formula): boolean => differingRows(f, g).length === 0;

/** True in every row. */
export const tautology = (f: Formula): boolean => column(f).every(Boolean);

/** The assignments that make a formula false. */
export function falsifying(f: Formula, ls: readonly Letter[] = letters(f)): Assignment[] {
  return rows(ls).filter((a) => !evaluate(f, a));
}

/* ------------------------------------------------------------------ display */

/**
 * The formula in Unicode, e.g. "¬(P ∧ Q)", "(P ⇒ Q) ∧ (Q ⇒ P)". A binary part inside a binary connective is
 * always parenthesised (except a chain of one associative connective, "P ∧ Q ∧ R"), as the lesson writes it:
 * a first-time reader should never need the precedence rules.
 */
export function show(f: Formula): string {
  switch (f.kind) {
    case 'var':
      return f.name;
    case 'not':
      return `¬${f.a.kind === 'var' || f.a.kind === 'not' ? show(f.a) : `(${show(f.a)})`}`;
    default:
      return `${part(f.a, f.kind)} ${SYMBOL[f.kind]} ${part(f.b, f.kind)}`;
  }
}
function part(g: Formula, parent: 'and' | 'or' | 'implies' | 'iff'): string {
  if (g.kind === 'var' || g.kind === 'not') return show(g);
  if (g.kind === parent && (parent === 'and' || parent === 'or')) return show(g);
  return `(${show(g)})`;
}

/* ----------------------------------------------------------- lesson columns */

export type ColumnId =
  | 'notP'
  | 'notQ'
  | 'and'
  | 'or'
  | 'impl'
  | 'conv'
  | 'inv'
  | 'contra'
  | 'iff'
  | 'both'
  | 'notPorQ'
  | 'negImpl'
  | 'pAndNotQ'
  | 'implNotQ'
  | 'nand'
  | 'notPorNotQ';

export interface ColumnPreset {
  src: string;
  /** what the lesson calls the column, relative to the claim P ⇒ Q (empty: no name) */
  role: string;
}

/** The columns lesson 0.2's truth-table figure offers, all over P and Q. */
export const COLUMNS: Record<ColumnId, ColumnPreset> = {
  notP: { src: '¬P', role: '' },
  notQ: { src: '¬Q', role: '' },
  and: { src: 'P ∧ Q', role: 'וגם' },
  or: { src: 'P ∨ Q', role: 'או' },
  impl: { src: 'P ⇒ Q', role: 'הטענה' },
  conv: { src: 'Q ⇒ P', role: 'ההפוכה' },
  inv: { src: '¬P ⇒ ¬Q', role: 'הנגדית' },
  contra: { src: '¬Q ⇒ ¬P', role: 'הקונטרפוזיטיב' },
  iff: { src: 'P ⇔ Q', role: 'שקילות' },
  both: { src: '(P ⇒ Q) ∧ (Q ⇒ P)', role: 'שני הכיוונים' },
  notPorQ: { src: '¬P ∨ Q', role: '' },
  negImpl: { src: '¬(P ⇒ Q)', role: 'השלילה' },
  pAndNotQ: { src: 'P ∧ ¬Q', role: '' },
  implNotQ: { src: 'P ⇒ ¬Q', role: '' },
  nand: { src: '¬(P ∧ Q)', role: '' },
  notPorNotQ: { src: '¬P ∨ ¬Q', role: '' },
};

export const PQ: readonly Letter[] = ['P', 'Q'];

/** The truth-table column of a preset over P, Q (rows TT, TF, FT, FF). */
export const presetColumn = (id: ColumnId): boolean[] => column(parse(COLUMNS[id].src), PQ);
