/**
 * SupFinder: the shared live figure of lessons 1.4-1.7 (bounds, supremum, completeness, Archimedes and density,
 * roots). Mathematics: src/math/supsets.ts (every sup, inf, witness and construction comes from there; the figure
 * draws, it proves nothing: a drawn set is evidence, the proof is in the lesson text, and the caption says so).
 *
 * Use:   <Spread figure={SupFinder} figureProps={{ preset: 'half-open', presets: [...], mode: 'bound', side: 'sup',
 *                                                  tasks: ['find-upper-bound', 'least-bound'] }}>
 *        <Step fig="fig-1-4a" set={{ preset: 'union-point', M: 1.5, showSup: true }}>
 * The canvas is math space (LTR, x grows to the right); all Hebrew text is outside the canvas except short labels.
 *
 * ---------------------------------------------------------------------------------------------------------------
 * PROPS (all optional except `id`, which the .astro wrapper takes from the Spread)
 *   id        figure id (task ids are stored as `${id}:${task}`)
 *   mode      'bound' | 'eps' | 'archimedes' | 'density' | 'root' | 'sum'. Default 'bound'.
 *   modes     the modes offered in a picker (none or one: no picker).
 *   preset    the set, one of the ids below (for mode 'sum': a sum id). Default 'half-open' ('sum-intervals' in 'sum').
 *             Ignored by 'archimedes' (always N), 'density' (an interval) and 'root' (the set S of the root).
 *   presets   the sets the learner may switch between (chips; none or one: no chips). In 'sum' mode only the sum ids
 *             of this list count (no list: both pairs); in the other modes the sum ids are ignored.
 *   side      'sup' (default) or 'inf'. Which end the figure is about: upper bound / sup, or lower bound / inf. Chips
 *             "חסם מלעיל / חסם מלרע" are offered when `sides` is true.
 *   sides     boolean. Offer the side switch to the learner. Default false.
 *   M         the candidate bound. A number, or the string 'sup' / 'inf' meaning exactly the set's sup / inf (use it for
 *             mode 'eps', where the default is the sup/inf; in 'bound' the default is a value inside the set's range,
 *             below the sup, so that a first look shows elements beyond it).
 *   eps       ε; snapped to the ladder 2, 1, 0.5, 0.25, 0.1, 0.05, 0.02, 0.01. Default 0.25 (eps, sum modes).
 *   a, b      the interval (a, b) of mode 'density' (a < b; defaults 0.31, 0.36). In mode 'root' `a` is the number whose
 *             root is taken (default 2, range 0.5..20).
 *   n         mode 'density': the denominator, chosen by hand. Omitted: the least n > 1/(b-a) (the proof's n).
 *   k         mode 'root': the exponent, 1..6 (default 2).
 *   x         mode 'root': the candidate for the root (default 1).
 *   showSup   show the sup/inf of the set as a diamond (filled: attained = max/min; hollow: not attained). Default
 *             false in 'bound', true in the other modes.
 *   tasks     task ids (below), listed under the figure with check marks.
 *
 * PRESETS (ids stable; "sup/inf, attained" are the exact values, see src/math/supsets.ts)
 *   half-open        [0,1)                         sup 1 no, inf 0 min
 *   open             (0,1)                         sup 1 no, inf 0 no
 *   union-point      (0,1) ∪ {2}                   sup 2 max, inf 0 no
 *   int-squares      {x ∈ ℤ : x² < 10} = -3..3    sup 3 max, inf -3 min
 *   finite           {-1, 1/2, 2, 7/2}             sup 7/2 max, inf -1 min
 *   fraction         {x/(1+x) : x > 0} = (0,1)     sup 1 no, inf 0 no
 *   abs-ball         {x : |x-2| < 5} = (-3,7)      sup 7 no, inf -3 no
 *   squares          {x² : x ∈ (-1,2)} = [0,4)     sup 4 no, inf 0 min
 *   sqrt2-rationals  {x ∈ ℚ : x>0, x²<2}          sup √2 no (irrational; drawn as ticks of rationals), inf 0 no
 *   reciprocals      {1/n : n ∈ ℕ}                 sup 1 max, inf 0 no
 *   ratio            {n/(n+1) : n ∈ ℕ}             sup 1 no, inf 1/2 min
 *   dyadic           {1 - 1/2ᵏ : k ∈ ℕ}            sup 1 no, inf 1/2 min
 *   alternating      {(-1)ⁿ + 1/n : n ∈ ℕ}         sup 3/2 max (n=2), inf -1 no (witness n = 2k+1, k = ⌊1/ε⌋+1)
 *   naturals         ℕ                             not bounded above; inf 1 min
 *   sum-intervals    A=(0,1), B=[2,3), A+B=(2,4)   sup(A+B)=4=1+3, inf(A+B)=2=0+2, neither attained
 *   sum-sequences    A={1/n}, B={n/(n+1)}, A+B     sup 2=1+1 no, inf 1/2=0+1/2 no
 *
 * MODES
 *   bound        Drag the candidate M (a handle below the line, the slider, or ← →). M is an upper bound (side 'sup') iff
 *                no element exceeds it: elements beyond M are drawn hollow with a ring (and a bar piece beyond M dashed),
 *                the first element beyond M is marked 'a', the half line beyond M is tinted. Readout: the verdict and,
 *                if showSup, the sup with "max"/"not in the set". Grid of M: 0.05.
 *   eps          The band (M-ε, M] (side 'sup') or [M, M+ε) (side 'inf') in the ε colours around the candidate M, and the
 *                element of the set inside it as a filled point 'a' (the witness of 1.4.8, by the formula of the proof
 *                when M is exactly the sup/inf). If the band holds no element, M is a bound and M-ε is drawn as a smaller
 *                bound: M is not the least. Controls: ε ladder, M slider (and "M = סופרמום" button).
 *   archimedes   ℕ against a candidate bound M (0..100, step 0.5): the first n > M, n = ⌊M⌋+1, marked as the element
 *                beyond M (1.6.1, 1.6.2). Elements beyond M hollow with a ring.
 *   density      The interval (a, b) in the ε colours (open ends), the grid of fractions k/n (n = least > 1/(b-a), or the
 *                `n` slider), the fractions inside (a,b) filled, the first one m/n, m = ⌊na⌋+1, marked (1.6.7). The axis
 *                zooms to the interval (the window follows a and b in powers of 2).
 *   root         S = {x ≥ 0 : xᵏ < a} = [0, s) with s = ᵏ√a (a bisection probe, labelled as such). The candidate x, and
 *                the step h of lemma 1.7.1: if xᵏ < a, x+h ∈ S (h = min(1, (a-xᵏ)/(2k(x+1)^(k-1)))) so x is not an upper
 *                bound; if xᵏ > a, x-h is an upper bound smaller than x (h = (xᵏ-a)/(k·x^(k-1))), so x is not the least.
 *                A second row shows the powers on a number line: a, xᵏ and (x±h)ᵏ, the last one filled when x+h ∈ S and
 *                a hollow ring when x−h is an upper bound (as in the upper row). Grid of x: 0.05. The readout shows
 *                s with the 4 places of fmtNum.
 *   sum          Three rows A, B, A+B with their sups (or infs): the sups add. With ε: a ∈ A within ε/2 of sup A, b ∈ B
 *                within ε/2 of sup B, and a+b ∈ A+B within ε of sup(A+B) (the proof of 1.5.7). ε ladder, side switch.
 *
 * TASKS (ticked only by the learner's own move of the control the task is about, never by a text step, and never in
 * the exact state the last text step produced)
 *   find-upper-bound  mode 'bound': M moved to a bound of the current side (upper for 'sup', lower for 'inf'). Impossible
 *                     on ℕ (sup side): do not offer it there.
 *   least-bound       mode 'bound': M moved to the least bound on the 0.05 grid (the sup itself if it is on the grid,
 *                     otherwise the first grid value above it): a bound whose predecessor on the grid is not a bound.
 *   eps-witness       mode 'eps': ε moved to 0.1 or less while M is exactly the sup/inf (so the band holds an element).
 *   beat-bound        mode 'eps': M (or ε) moved to a state where M is a bound but not the sup/inf and the band holds no
 *                     element (ε < M - sup): M-ε is a smaller bound. Mode 'archimedes': M moved to 20 or more (the
 *                     natural n beyond it is shown).
 *                     The listed label follows the mode: the eps wording in 'eps' (and 'bound'), the archimedes wording
 *                     in 'archimedes', or when `modes` offers 'archimedes' and not 'eps'.
 *   rational-between  mode 'density': the `n` slider moved (so n is chosen by hand) to a value for which a fraction m/n
 *                     lies in (a, b), with b-a ≤ 0.25. (Moving a or b afterwards with that n also counts.)
 *   root-cases        mode 'root': the learner has placed x with xᵏ < a and also x with xᵏ > a (each by their own move;
 *                     order free, remembered while the figure lives).
 *   sum-eps           mode 'sum': ε moved to 0.1 or less.
 *
 * STEP-SETTABLE KEYS (<Step fig set={{…}}>): mode, preset, side, M (number | 'sup' | 'inf'), eps, a, b, n (number or
 * null = automatic), k, x, showSup. Changing mode, preset or side without M resets M to that view's default. A step
 * never ticks a task. Unknown keys and invalid values are ignored. `a` means the root's a while the mode is 'root'.
 * ---------------------------------------------------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import { fmtNum } from '~/math/absval';
import {
  SETS,
  SUM_IDS,
  SUM_PAIRS,
  archimedesN,
  bandWitness,
  density,
  gridPoints,
  isLeastOnGrid,
  isSetId,
  isSumId,
  kthRoot,
  rootStep,
  sumWitness,
  type Side,
  type SupSet,
} from '~/math/supsets';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo, type Palette } from './core/canvas';
import { superscript } from './core/format';
import { withAlpha } from './core/ink';
import { niceTicks } from './core/plot';
import SimShell, { Slider, Toggle, type TaskDef } from './core/SimShell';

export type SupMode = 'bound' | 'eps' | 'archimedes' | 'density' | 'root' | 'sum';
type Handle = 'M' | 'a' | 'b' | 'x';

const TASK_LABEL: Record<string, string> = {
  'find-upper-bound': 'הזיזו את המועמד M אל חסם של הקבוצה: מקום שבו אף איבר אינו נמצא מעבר ל-M.',
  'least-bound': 'מצאו את החסם הקטן ביותר: זזו עם M עד שהחסם הקטן ביותר שהאיור מאפשר (בצעדים של ⁦0.05⁩) הוא M, וצעד אחד שמאלה כבר אינו חסם.',
  'eps-witness': 'כש-M הוא הסופרמום (או האינפימום), הקטינו את ε עד ⁦0.1⁩ או פחות, ובדקו שתמיד יש איבר של הקבוצה בתוך הסביבה.',
  'beat-bound': 'מצאו חסם M שאינו הקטן ביותר והראו זאת: ε קטן מספיק, כך שאין איבר בתוך הסביבה ו-⁦M − ε⁩ הוא חסם קטן יותר.',
  'rational-between': 'בחרו בעצמכם מכנה n (במחוון) כך שיש שבר ⁦m/n⁩ בתוך הקטע, כשאורך הקטע ⁦0.25⁩ או פחות.',
  'root-cases': 'הציבו מועמד x עם ⁦xᵏ < a⁩, ואחר כך מועמד x עם ⁦xᵏ > a⁩, וראו מה קורה בכל אחד מהמקרים.',
  'sum-eps': 'הקטינו את ε עד ⁦0.1⁩ או פחות וראו שסכום האיברים שבחרתם בתוך A + B קרוב ל-⁦sup(A + B)⁩.',
};

/** the label of `beat-bound` while the figure is in (or only offers) the archimedes mode: it completes at M >= 20 */
const TASK_LABEL_ARCHIMEDES_BEAT = 'הזיזו את M ל-⁦20⁩ או יותר, ומצאו את הטבעי שעובר אותו.';

const MODE_NAME: Record<SupMode, string> = {
  bound: 'חסם',
  eps: 'אפסילון',
  archimedes: 'ארכימדס',
  density: 'צפיפות',
  root: 'שורש',
  sum: 'סכום קבוצות',
};

const EPS_LADDER = [2, 1, 0.5, 0.25, 0.1, 0.05, 0.02, 0.01];
const nearestEps = (e: number) => EPS_LADDER.reduce((best, v, i) => (Math.abs(Math.log(v / e)) < Math.abs(Math.log(EPS_LADDER[best] / e)) ? i : best), 0);
const MODES: SupMode[] = ['bound', 'eps', 'archimedes', 'density', 'root', 'sum'];
const STEP = 0.05;
const ARCH_MAX = 100;
const BOUND_TOL = 1e-9;

interface State {
  mode: SupMode;
  preset: string;
  side: Side;
  M: number;
  /** index into EPS_LADDER */
  ei: number;
  /** density interval */
  a: number;
  b: number;
  /** density denominator chosen by hand, or null = automatic */
  n: number | null;
  k: number;
  /** the root's a */
  ra: number;
  /** the root's candidate */
  x: number;
  showSup: boolean;
  active: Handle;
}

export interface SupFinderProps {
  id: string;
  mode?: SupMode;
  modes?: SupMode[];
  preset?: string;
  presets?: string[];
  side?: Side;
  sides?: boolean;
  M?: number | 'sup' | 'inf';
  eps?: number;
  a?: number;
  b?: number;
  n?: number;
  k?: number;
  x?: number;
  showSup?: boolean;
  tasks?: string[];
}

const snap = (v: number, step = STEP) => Math.round(v / step) * step;
/** a value on the grid, with the float noise of the multiplication removed */
const grid = (v: number, step = STEP) => Number(snap(v, step).toFixed(6));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** a formula inside Hebrew text: an isolated LTR run */
const ltr = (s: string) => `⁦${s}⁩`;
const num = fmtNum;

const boundOf = (S: SupSet, side: Side) => (side === 'sup' ? S.sup : S.inf);
const isBound = (S: SupSet, side: Side, M: number) => (side === 'sup' ? S.isUpperBound(M) : S.isLowerBound(M));
const beyondOf = (S: SupSet, side: Side, M: number) => (side === 'sup' ? S.exceeds(M) : S.undercuts(M));
const attainedOf = (S: SupSet, side: Side) => (side === 'sup' ? S.supAttained : S.infAttained);
const textOf = (S: SupSet, side: Side) => (side === 'sup' ? S.supText : S.infText);

function setFor(s: State): SupSet {
  if (s.mode === 'archimedes') return SETS.naturals;
  return isSetId(s.preset) ? SETS[s.preset] : SETS['half-open'];
}

const rootOf = (a: number, k: number) => kthRoot(a, k);
const rootMax = (a: number, k: number) => Math.ceil(rootOf(a, k)) + 1;

function defaultM(mode: SupMode, S: SupSet, side: Side): number {
  if (mode === 'archimedes') return 10.5;
  const [v0, v1] = S.view;
  const b = boundOf(S, side);
  if (mode === 'eps') return b ?? grid((v0 + v1) / 2);
  if (b === null) return grid((v0 + v1) / 2);
  const span = v1 - v0;
  return grid(clamp(side === 'sup' ? b - 0.25 * span : b + 0.25 * span, v0, v1));
}

function resolveM(m: number | 'sup' | 'inf' | undefined, S: SupSet, side: Side): number | undefined {
  if (typeof m === 'number') return m;
  if (m === 'sup') return S.sup ?? undefined;
  if (m === 'inf') return S.inf ?? undefined;
  return undefined;
}

function fresh(p: SupFinderProps): State {
  const mode: SupMode = p.mode && MODES.includes(p.mode) ? p.mode : 'bound';
  const side: Side = p.side === 'inf' ? 'inf' : 'sup';
  const preset = mode === 'sum' ? (p.preset && isSumId(p.preset) ? p.preset : (p.presets?.find(isSumId) ?? 'sum-intervals')) : p.preset && isSetId(p.preset) ? p.preset : 'half-open';
  const S = mode === 'sum' ? SETS['half-open'] : mode === 'archimedes' ? SETS.naturals : SETS[preset as keyof typeof SETS];
  const root = mode === 'root';
  const a = root ? 0.31 : (p.a ?? 0.31);
  const b = Math.max(a + 0.01, p.b ?? a + 0.05);
  const ra = clamp(root ? (p.a ?? 2) : 2, 0.5, 20);
  const k = clamp(Math.round(p.k ?? 2), 1, 6);
  return {
    mode,
    preset,
    side,
    M: resolveM(p.M, S, side) ?? defaultM(mode, S, side),
    ei: nearestEps(p.eps ?? 0.25),
    a: root ? 0.31 : a,
    b: root ? 0.36 : b,
    n: typeof p.n === 'number' ? Math.max(1, Math.round(p.n)) : null,
    k,
    ra,
    x: clamp(p.x ?? 1, 0, rootMax(ra, k)),
    showSup: p.showSup ?? mode !== 'bound',
    active: mode === 'density' ? 'a' : mode === 'root' ? 'x' : 'M',
  };
}

/** The values a task looks at, as a string: the state a text step produced is skipped exactly. */
const taskKey = (s: State) => [s.mode, s.preset, s.side, s.M, s.ei, s.a, s.b, s.n, s.k, s.ra, s.x].join('|');

/** The view window of a mode: the set's own, the dynamic one of archimedes and density, the roots' own. */
function viewOf(s: State, S: SupSet): [number, number] {
  if (s.mode === 'archimedes') {
    const n = archimedesN(s.M);
    return [0, Math.max(12, Math.ceil((n + 2) / 5) * 5)];
  }
  if (s.mode === 'density') {
    const w = s.b - s.a;
    const vw = Math.max(0.5, 2 ** Math.ceil(Math.log2(w * 4)));
    const c = (s.a + s.b) / 2;
    const cs = Math.round(c / (vw / 2)) * (vw / 2);
    return [cs - vw, cs + vw];
  }
  if (s.mode === 'root') return [0, rootMax(s.ra, s.k)];
  if (s.mode === 'sum') return SUM_PAIRS[(isSumId(s.preset) ? s.preset : 'sum-intervals') as keyof typeof SUM_PAIRS].view;
  return S.view;
}

export default function SupFinder(props: SupFinderProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const archLabel = s.mode === 'archimedes' || (s.mode !== 'eps' && !!props.modes?.includes('archimedes') && !props.modes.includes('eps'));
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: id === 'beat-bound' && archLabel ? TASK_LABEL_ARCHIMEDES_BEAT : (TASK_LABEL[id] ?? id) }));
  const dragging = useRef<Handle | null>(null);
  const geo = useRef<{ px: (v: number) => number; wx: (sx: number) => number; handles: { h: Handle; x: number; y: number }[] } | null>(null);
  const stepKey = useRef<string | null>(null);
  const rootSeen = useRef<Set<string>>(new Set());

  const S = setFor(s);
  const pair = SUM_PAIRS[(isSumId(s.preset) ? s.preset : 'sum-intervals') as keyof typeof SUM_PAIRS];
  const eps = EPS_LADDER[s.ei];
  const rootS = rootOf(s.ra, s.k);
  const step = rootStep(s.x, s.ra, s.k);
  const dens = density(s.a, s.b, s.n ?? undefined);

  /** The learner's own change: the only path that can tick a task. */
  const userSet = (patch: Partial<State>) => {
    const next = { ...s, ...patch };
    setS(next);
    if (stepKey.current === taskKey(next)) return;
    const has = (t: string) => props.tasks?.includes(t);
    const moved = (...ks: (keyof State)[]) => ks.some((k) => patch[k] !== undefined && patch[k] !== s[k]);
    const NS = setFor(next);
    const bnd = boundOf(NS, next.side);
    if (next.mode === 'bound' && moved('M')) {
      if (has('find-upper-bound') && isBound(NS, next.side, next.M)) markTask(`${props.id}:find-upper-bound`);
      if (has('least-bound') && isLeastOnGrid(NS, next.side, next.M, STEP)) markTask(`${props.id}:least-bound`);
    }
    if (next.mode === 'eps') {
      const e = EPS_LADDER[next.ei];
      if (has('eps-witness') && moved('ei') && bnd !== null && Math.abs(next.M - bnd) < BOUND_TOL && e <= 0.1 && bandWitness(NS, next.side, next.M, e) !== null)
        markTask(`${props.id}:eps-witness`);
      if (
        has('beat-bound') &&
        moved('M', 'ei') &&
        bnd !== null &&
        isBound(NS, next.side, next.M) &&
        Math.abs(next.M - bnd) > BOUND_TOL &&
        bandWitness(NS, next.side, next.M, e) === null
      )
        markTask(`${props.id}:beat-bound`);
    }
    if (next.mode === 'archimedes' && has('beat-bound') && moved('M') && next.M >= 20) markTask(`${props.id}:beat-bound`);
    if (next.mode === 'density' && has('rational-between') && moved('n', 'a', 'b') && next.n !== null) {
      const d = density(next.a, next.b, next.n);
      if (d.inside && d.count >= 1 && next.b - next.a <= 0.25 + 1e-9) markTask(`${props.id}:rational-between`);
    }
    if (next.mode === 'root' && has('root-cases') && moved('x', 'ra', 'k')) {
      const r = rootStep(next.x, next.ra, next.k);
      if (r.kind !== 'equal') rootSeen.current.add(r.kind);
      if (rootSeen.current.has('below') && rootSeen.current.has('above')) markTask(`${props.id}:root-cases`);
    }
    if (next.mode === 'sum' && has('sum-eps') && moved('ei') && EPS_LADDER[next.ei] <= 0.1) markTask(`${props.id}:sum-eps`);
  };

  const pickMode = (mode: SupMode) => {
    if (mode === s.mode) return;
    const preset = mode === 'sum' ? (isSumId(s.preset) ? s.preset : (props.presets?.find(isSumId) ?? 'sum-intervals')) : isSumId(s.preset) ? (props.preset && isSetId(props.preset) ? props.preset : 'half-open') : s.preset;
    const next: State = { ...s, mode, preset, active: mode === 'density' ? 'a' : mode === 'root' ? 'x' : 'M' };
    next.M = defaultM(mode, setFor(next), next.side);
    next.showSup = mode !== 'bound' || s.showSup;
    setS(next);
  };

  const pickPreset = (preset: string) => {
    if (preset === s.preset) return;
    const next = { ...s, preset };
    next.M = defaultM(s.mode, setFor(next), s.side);
    setS(next);
  };

  const pickSide = (side: Side) => {
    if (side === s.side) return;
    setS({ ...s, side, M: defaultM(s.mode, S, side) });
  };

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = { ...prev };
          let reset = false;
          if (typeof st.mode === 'string' && (MODES as string[]).includes(st.mode) && st.mode !== prev.mode) {
            next.mode = st.mode as SupMode;
            reset = true;
          }
          if (typeof st.side === 'string' && (st.side === 'sup' || st.side === 'inf') && st.side !== prev.side) {
            next.side = st.side;
            reset = true;
          }
          if (typeof st.preset === 'string' && (next.mode === 'sum' ? isSumId(st.preset) : isSetId(st.preset)) && st.preset !== prev.preset) {
            next.preset = st.preset;
            reset = true;
          }
          // a mode change with an incompatible preset keeps the preset valid for the mode
          if (next.mode === 'sum' && !isSumId(next.preset)) next.preset = 'sum-intervals';
          if (next.mode !== 'sum' && isSumId(next.preset)) next.preset = 'half-open';
          const NS = setFor(next);
          if (reset) next.M = defaultM(next.mode, NS, next.side);
          const m = typeof st.M === 'number' ? st.M : st.M === 'sup' || st.M === 'inf' ? resolveM(st.M, NS, next.side) : undefined;
          if (m !== undefined) next.M = m;
          if (typeof st.eps === 'number') next.ei = nearestEps(st.eps);
          if (typeof st.k === 'number') next.k = clamp(Math.round(st.k), 1, 6);
          if (typeof st.a === 'number') {
            if (next.mode === 'root') next.ra = clamp(st.a, 0.5, 20);
            else next.a = st.a;
          }
          if (typeof st.b === 'number') next.b = st.b;
          if (next.b <= next.a) next.b = next.a + 0.01;
          if (st.n === null) next.n = null;
          else if (typeof st.n === 'number') next.n = Math.max(1, Math.round(st.n));
          if (typeof st.x === 'number') next.x = st.x;
          next.x = clamp(next.x, 0, rootMax(next.ra, next.k));
          if (typeof st.showSup === 'boolean') next.showSup = st.showSup;
          stepKey.current = taskKey(next);
          return next;
        });
      }),
    [props.id],
  );

  /** the sentence a screen reader hears after a change, also the text of the canvas label */
  const describe = (st: State): string => {
    const SS = setFor(st);
    const e = EPS_LADDER[st.ei];
    const cand = st.side === 'sup' ? 'M' : 'm';
    if (st.mode === 'bound' || st.mode === 'archimedes') {
      const above = beyondOf(SS, st.side, st.M);
      const kind = st.side === 'sup' ? 'חסם מלעיל' : 'חסם מלרע';
      if (above === null) return `${cand} = ${num(st.M)} הוא ${kind} של ${SS.name}: אף איבר אינו ${st.side === 'sup' ? 'גדול' : 'קטן'} ממנו.`;
      return `${cand} = ${num(st.M)} אינו ${kind} של ${SS.name}: האיבר ${num(above)} ${st.side === 'sup' ? 'גדול' : 'קטן'} ממנו.`;
    }
    if (st.mode === 'eps') {
      const w = bandWitness(SS, st.side, st.M, e);
      const band = st.side === 'sup' ? `(${num(st.M - e)}, ${num(st.M)}]` : `[${num(st.M)}, ${num(st.M + e)})`;
      return `הסביבה ${band}, ε = ${num(e)}: ${w === null ? 'אין בה איבר של הקבוצה' : `האיבר ${num(w)} של הקבוצה נמצא בתוכה`}.`;
    }
    if (st.mode === 'density') {
      const d = density(st.a, st.b, st.n ?? undefined);
      return `הקטע (${num(st.a)}, ${num(st.b)}), n = ${d.n}: ${d.inside ? `השבר ${d.m}/${d.n} = ${num(Number(d.q.toFixed(4)))} נמצא בתוכו` : 'אין שבר עם המכנה הזה בתוך הקטע'}.`;
    }
    if (st.mode === 'root') {
      const r = rootStep(st.x, st.ra, st.k);
      const what = r.kind === 'below' ? `x בחזקת ${st.k} קטן מ-a, ולכן x + h שייך לקבוצה ו-x אינו חסם מלעיל` : r.kind === 'above' ? `x בחזקת ${st.k} גדול מ-a, ולכן x − h הוא חסם מלעיל קטן יותר` : 'x בחזקת k שווה ל-a';
      return `a = ${num(st.ra)}, k = ${st.k}, x = ${num(st.x)}: ${what}.`;
    }
    const p = SUM_PAIRS[(isSumId(st.preset) ? st.preset : 'sum-intervals') as keyof typeof SUM_PAIRS];
    const b = boundOf(p.AB, st.side);
    return `${st.side === 'sup' ? 'הסופרמום' : 'האינפימום'} של A + B הוא ${b === null ? 'לא קיים' : num(b)}, סכום ה${st.side === 'sup' ? 'סופרמומים' : 'אינפימומים'} של A ושל B.`;
  };

  useEffect(() => {
    const id = setTimeout(() => setLive(describe(s)), 300);
    return () => clearTimeout(id);
  }, [s]);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const W = view.w;
    const H = view.h;
    const narrow = W < 440;
    const left = narrow ? 18 : 28;
    const right = narrow ? 18 : 28;
    const [v0, v1] = viewOf(s, S);
    const px = (v: number) => left + ((v - v0) / (v1 - v0)) * (W - left - right);
    const wx = (sx: number) => v0 + ((sx - left) / (W - left - right)) * (v1 - v0);
    const handles: { h: Handle; x: number; y: number }[] = [];
    const sc: Scene = { ctx, p, px, v0, v1, W, left, right, narrow };
    const cand = s.side === 'sup' ? 'M' : 'm';

    if (s.mode === 'bound' || s.mode === 'archimedes' || s.mode === 'eps') {
      const y = Math.round(H * 0.56);
      axis(sc, y);
      const arch = s.mode === 'archimedes';
      const cut = s.mode === 'bound' || arch || !isBound(S, s.side, s.M) ? { M: s.M, side: s.side } : null;
      if (cut) tint(sc, y, cut.M, cut.side);
      const count = arch ? Math.floor(v1) : undefined;
      if (s.mode === 'eps') {
        const lo = s.side === 'sup' ? s.M - eps : s.M;
        const hi = s.side === 'sup' ? s.M : s.M + eps;
        band(sc, y, lo, hi, s.side === 'sup' ? [false, true] : [true, false]);
      }
      drawSet(sc, y, S, cut, count);
      const bnd = boundOf(S, s.side);
      if (s.showSup && bnd !== null && !arch) limitMark(sc, y, bnd, attainedOf(S, s.side), `${s.side === 'sup' ? 'sup' : 'inf'} = ${textOf(S, s.side)}`);
      // the element beyond the candidate: hollow with a ring and its label (bound, archimedes), the witness in the band (eps)
      if (s.mode === 'eps') {
        const w = bandWitness(S, s.side, s.M, eps);
        if (w !== null) markPoint(sc, y, w, true, 'a');
        else if (isBound(S, s.side, s.M)) {
          const m2 = s.side === 'sup' ? s.M - eps : s.M + eps;
          marker(sc, y + 14, m2, p.eps, `${cand} ${s.side === 'sup' ? '−' : '+'} ε`, 'up', true);
        }
        const above = beyondOf(S, s.side, s.M);
        if (above !== null) markPoint(sc, y, above, false, 'a');
      } else {
        const above = beyondOf(S, s.side, s.M);
        if (above !== null) markPoint(sc, y, above, false, arch ? 'n' : 'a');
      }
      marker(sc, y + 14, s.M, p.ink, `${cand} = ${num(s.M)}`, 'up', false);
      handles.push({ h: 'M', x: px(s.M), y: y + 22 });
    } else if (s.mode === 'density') {
      const y = Math.round(H * 0.58);
      axis(sc, y);
      band(sc, y, s.a, s.b, [false, false]);
      const lo = s.a - (s.b - s.a);
      const hi = s.b + (s.b - s.a);
      const g = gridPoints(dens.n, Math.max(v0, lo - 0.5), Math.min(v1, hi + 0.5));
      ctx.save();
      for (const q of g) {
        const inside = q > s.a && q < s.b;
        const x = px(q);
        if (inside) {
          ctx.fillStyle = p.pointIn;
          ctx.beginPath();
          ctx.arc(x, y, q === dens.q ? 7 : 5, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          ctx.strokeStyle = p.ink3;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x, y - 7);
          ctx.lineTo(x, y + 7);
          ctx.stroke();
        }
      }
      ctx.restore();
      for (const [v, name] of [[s.a, 'a'], [s.b, 'b']] as const) {
        ring(ctx, px(v), y, 6, p.eps, p.paper);
        text(sc, name, px(v), y - 34, p.eps, 700, 13);
        handles.push({ h: name, x: px(v), y });
      }
      if (dens.inside) {
        text(sc, `${dens.m}/${dens.n}`, px(dens.q), y + 26, p.pointIn, 700, 13);
      } else text(sc, `n = ${dens.n}: אין שבר בקטע`, (px(s.a) + px(s.b)) / 2, y + 30, p.pointOut, 600, 12, 'rtl');
    } else if (s.mode === 'root') {
      const y1 = Math.round(H * 0.36);
      axis(sc, y1);
      drawSet(sc, y1, rootSet(s.ra, rootS), null);
      if (s.showSup) limitMark(sc, y1, rootS, false, `s ≈ ${num(rootS)}`);
      // the step of lemma 1.7.1: a bracket from x to the moved point, and the point itself
      if (step.kind !== 'equal') {
        bracket(ctx, px(s.x), px(step.moved), y1 - 18, p.eps);
        text(sc, `h ≈ ${num(Number(step.h.toFixed(4)))}`, (px(s.x) + px(step.moved)) / 2, y1 - 32, p.eps, 600, 12);
        if (step.kind === 'below') {
          dot(ctx, px(step.moved), y1, 6, p.pointIn);
          text(sc, 'x + h ∈ S', px(step.moved), y1 + 40, p.pointIn, 600, 12);
        } else {
          ring(ctx, px(step.moved), y1, 7, p.pointOut, p.paper);
          text(sc, 'x − h', px(step.moved), y1 + 40, p.pointOut, 600, 12);
        }
      }
      marker(sc, y1 + 14, s.x, p.ink, `x = ${num(Number(s.x.toFixed(3)))}`, 'up', false);
      handles.push({ h: 'x', x: px(s.x), y: y1 + 22 });
      // the powers row
      const y2 = Math.round(H * 0.84);
      const P = 2 * s.ra;
      const pp = (v: number) => left + (Math.min(v, P) / P) * (W - left - right);
      ctx.save();
      ctx.strokeStyle = p.ink2;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left, y2);
      ctx.lineTo(W - right, y2);
      ctx.stroke();
      ctx.fillStyle = p.ink2;
      ctx.font = `11px ${p.fontUi}`;
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const t of niceTicks(0, P, narrow ? 4 : 7)) {
        ctx.beginPath();
        ctx.moveTo(pp(t), y2 - 3);
        ctx.lineTo(pp(t), y2 + 3);
        ctx.stroke();
        ctx.fillText(num(t), pp(t), y2 + 6);
      }
      ctx.strokeStyle = p.limit;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(pp(s.ra), y2 - 16);
      ctx.lineTo(pp(s.ra), y2 + 4);
      ctx.stroke();
      ctx.restore();
      text(sc, `a = ${num(s.ra)}`, pp(s.ra), y2 - 24, p.limit, 700, 12);
      const k = superscript(s.k);
      dot(ctx, pp(step.xk), y2, 5, p.ink);
      text(sc, `x${k} ≈ ${num(Number(step.xk.toFixed(3)))}${step.xk > P ? ' ›' : ''}`, pp(step.xk), y2 + 22, p.ink, 600, 12);
      if (step.kind !== 'equal') {
        const mk = step.moved ** s.k;
        if (step.kind === 'below') dot(ctx, pp(mk), y2, 4, p.pointIn);
        else ring(ctx, pp(mk), y2, 5, p.pointOut, p.paper);
      }
    } else {
      const rows = [Math.round(H * 0.2), Math.round(H * 0.5), Math.round(H * 0.8)];
      const parts = [pair.A, pair.B, pair.AB] as const;
      const names = ['A', 'B', 'A + B'];
      axis(sc, rows[2] + 14);
      const w = sumWitness(pair, eps, s.side);
      parts.forEach((P, i) => {
        const y = rows[i];
        text(sc, names[i], left + 8, y - 22, p.ink, 700, 13, 'ltr', 'left');
        const bnd = boundOf(P, s.side);
        if (w && bnd !== null) {
          const e = i === 2 ? eps : eps / 2;
          band(sc, y, s.side === 'sup' ? bnd - e : bnd, s.side === 'sup' ? bnd : bnd + e, s.side === 'sup' ? [false, true] : [true, false]);
        }
        drawSet(sc, y, P, null);
        if (s.showSup && bnd !== null) limitMark(sc, y, bnd, attainedOf(P, s.side), `${s.side === 'sup' ? 'sup' : 'inf'} = ${textOf(P, s.side)}`, true);
        if (w) markPoint(sc, y, i === 0 ? w.a : i === 1 ? w.b : w.c, true, i === 0 ? 'a' : i === 1 ? 'b' : 'a + b');
      });
    }
    geo.current = { px, wx, handles };
    const act = handles.find((h) => h.h === s.active);
    if (act && handles.length > 1) {
      ctx.save();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(act.x, act.y - 8, 15, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1.6, worldHeight: 1, animate: false });
  useEffect(invalidate, [s]);

  /** the ranges and steps of the handles in the current mode */
  const rangeOf = (h: Handle): [number, number, number] => {
    if (h === 'M') return s.mode === 'archimedes' ? [0, ARCH_MAX, 0.5] : [S.view[0], S.view[1], STEP];
    if (h === 'x') return [0, rootMax(s.ra, s.k), STEP];
    return [-2, 2, 0.01];
  };
  const moveHandle = (h: Handle, v: number) => {
    const [lo, hi, st] = rangeOf(h);
    const val = grid(clamp(v, lo, hi), st);
    if (h === 'a') userSet({ a: Math.min(val, s.b - 0.01), active: 'a' });
    else if (h === 'b') userSet({ b: Math.max(val, s.a + 0.01), active: 'b' });
    else userSet({ [h]: val, active: h } as Partial<State>);
  };
  const handlesOf = (): Handle[] => (s.mode === 'density' ? ['a', 'b'] : s.mode === 'root' ? ['x'] : s.mode === 'sum' ? [] : ['M']);
  const valueOf = (h: Handle) => (h === 'M' ? s.M : h === 'x' ? s.x : h === 'a' ? s.a : s.b);

  const onPointerDown = (e: PointerEvent) => {
    const g = geo.current;
    const hs = handlesOf();
    if (!g || hs.length === 0) return;
    let best: { h: Handle; d: number } | null = null;
    for (const hd of g.handles) {
      const d = Math.abs(hd.x - e.offsetX);
      if (!best || d < best.d) best = { h: hd.h, d };
    }
    const h = best?.h ?? hs[0];
    dragging.current = h;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    moveHandle(h, g.wx(e.offsetX));
  };
  const onPointerMove = (e: PointerEvent) => {
    const g = geo.current;
    if (!dragging.current || !g) return;
    moveHandle(dragging.current, g.wx(e.offsetX));
  };
  const onPointerUp = () => {
    dragging.current = null;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const hs = handlesOf();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (hs.length === 0) return;
      e.preventDefault();
      const [, , st] = rangeOf(s.active);
      moveHandle(s.active, valueOf(s.active) + (e.key === 'ArrowRight' ? st : -st));
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (s.mode === 'density') {
        const next: Handle = s.active === 'a' ? 'b' : 'a';
        setS({ ...s, active: next });
        setLive(`החצים ימינה ושמאלה מזיזים עכשיו את ${next}.`);
      } else if (s.mode === 'eps' || s.mode === 'sum') {
        userSet({ ei: clamp(s.ei + (e.key === 'ArrowDown' ? 1 : -1), 0, EPS_LADDER.length - 1) });
      }
    }
  };

  const offeredModes = props.modes ?? [];
  const offeredSets = (props.presets ?? []).filter((id) => (s.mode === 'sum' ? isSumId(id) : isSetId(id)));
  const sumOffer = s.mode === 'sum' && (props.presets ?? []).filter(isSumId).length === 0 ? SUM_IDS : offeredSets;
  const nameOf = (id: string): string => (isSumId(id) ? (id === 'sum-intervals' ? 'קטעים' : 'סדרות') : SETS[id as keyof typeof SETS].label);
  const bnd = boundOf(S, s.side);
  const above = beyondOf(S, s.side, s.M);
  const cand = s.side === 'sup' ? 'M' : 'm';
  const kindWord = s.side === 'sup' ? 'חסם מלעיל' : 'חסם מלרע';
  const attWord = (att: boolean) => (s.side === 'sup' ? (att ? 'מקסימום' : 'אינו שייך לקבוצה') : att ? 'מינימום' : 'אינו שייך לקבוצה');
  const bandW = s.mode === 'eps' ? bandWitness(S, s.side, s.M, eps) : null;
  const bandText = s.side === 'sup' ? `(${num(s.M - eps)}, ${num(s.M)}]` : `[${num(s.M)}, ${num(s.M + eps)})`;
  const wsum = s.mode === 'sum' ? sumWitness(pair, eps, s.side) : null;
  const R = rangeOf('M');
  const Q = (p: { children: string | number | (string | number)[] }) => (
    <b class="q">
      <bdi dir="ltr">{p.children}</bdi>
    </b>
  );
  const showSupToggle = s.mode === 'bound' || s.mode === 'eps' || s.mode === 'root' || s.mode === 'sum';

  return (
    <SimShell
      fig={props.id}
      label={`איור חי: ישר המספרים, מ-${num(Number(viewOf(s, S)[0].toFixed(3)))} עד ${num(Number(viewOf(s, S)[1].toFixed(3)))}, בתצוגה "${MODE_NAME[s.mode]}". ${s.mode === 'sum' ? '' : s.mode === 'density' || s.mode === 'root' ? '' : `הקבוצה: ${S.name}. `}${describe(s)} גררו את הידית או השתמשו במחוונים; במקלדת: חץ ימינה ושמאלה מזיז את הידית, חץ למעלה ולמטה משנה את ε או בוחר ידית אחרת. האיור הוא ראיה ולא הוכחה.`}
      canvasRef={canvasRef}
      aspect={1.6}
      live={live}
      tasks={tasks}
      cursor={handlesOf().length ? 'ew-resize' : 'default'}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onReset={() => {
        setS(fresh(props));
        setLive('האיור אופס.');
      }}
      readout={
        s.mode === 'bound' || s.mode === 'archimedes' ? (
          <>
            <span data-readout="verdict">
              <Q>{`${cand} = ${num(s.M)}`}</Q>:{' '}
              {above === null ? (
                <>
                  <b>{kindWord}</b> של הקבוצה: אף איבר אינו {s.side === 'sup' ? 'גדול' : 'קטן'} ממנו.
                </>
              ) : (
                <>
                  <b>אינו {kindWord}</b>: האיבר <Q>{num(Number(above.toFixed(4)))}</Q> {s.side === 'sup' ? 'גדול' : 'קטן'} ממנו.
                  {s.mode === 'archimedes' && (
                    <>
                      {' '}
                      הטבעי הראשון מעל <Q>{num(s.M)}</Q> הוא <Q>n = {archimedesN(s.M)}</Q>.
                    </>
                  )}
                </>
              )}
            </span>
            {s.showSup && s.mode !== 'archimedes' && (
              <span data-readout="sup">
                {bnd === null ? (
                  <>הקבוצה אינה חסומה {s.side === 'sup' ? 'מלעיל' : 'מלרע'}: לכל {cand} יש איבר {s.side === 'sup' ? 'גדול' : 'קטן'} ממנו.</>
                ) : (
                  <>
                    {s.side === 'sup' ? 'הסופרמום' : 'האינפימום'}: <Q>{`${s.side} = ${textOf(S, s.side)}`}</Q>, והוא {attWord(attainedOf(S, s.side))}.
                  </>
                )}
              </span>
            )}
          </>
        ) : s.mode === 'eps' ? (
          <>
            <span data-readout="band">
              הסביבה <Q>{bandText}</Q>, <Q>{`ε = ${num(eps)}`}</Q>:{' '}
              {!isBound(S, s.side, s.M) ? (
                <>
                  <Q>{`${cand} = ${num(s.M)}`}</Q> <b>אינו {kindWord}</b>: האיבר <Q>{num(Number((above ?? 0).toFixed(4)))}</Q> {s.side === 'sup' ? 'גדול' : 'קטן'} ממנו.
                </>
              ) : bandW !== null ? (
                <>
                  האיבר <Q>{num(Number(bandW.toFixed(4)))}</Q> של הקבוצה נמצא בתוכה: ה-ε הזה אינו מראה ש-<Q>{cand}</Q> אינו הקטן ביותר.
                </>
              ) : (
                <>
                  אין בה איבר של הקבוצה, לכן <Q>{`${cand} ${s.side === 'sup' ? '−' : '+'} ε = ${num(s.side === 'sup' ? s.M - eps : s.M + eps)}`}</Q> הוא {kindWord} קטן יותר: <Q>{cand}</Q> אינו {s.side === 'sup' ? 'הסופרמום' : 'האינפימום'}.
                </>
              )}
            </span>
            {bnd !== null && (
              <span data-readout="sup">
                {s.showSup && (
                  <>
                    {s.side === 'sup' ? 'הסופרמום' : 'האינפימום'}: <Q>{`${s.side} = ${textOf(S, s.side)}`}</Q>, והוא {attWord(attainedOf(S, s.side))}.
                  </>
                )}
              </span>
            )}
          </>
        ) : s.mode === 'density' ? (
          <>
            <span data-readout="interval">
              הקטע <Q>{`(${num(s.a)}, ${num(s.b)})`}</Q>, אורכו <Q>{num(Number((s.b - s.a).toFixed(4)))}</Q>, ולכן <Q>{`1/(b − a) = ${num(Number((1 / (s.b - s.a)).toFixed(3)))}`}</Q>.
            </span>
            <span data-readout="n">
              {s.n === null ? 'המכנה הקטן ביותר' : 'המכנה שבחרתם'} <Q>{`n = ${dens.n}`}</Q>, <Q>{`m = ⌊na⌋ + 1 = ${dens.m}`}</Q>:{' '}
              {dens.inside ? (
                <>
                  השבר <Q>{`m/n = ${dens.m}/${dens.n}`}</Q> נמצא בתוך הקטע ({dens.count} שברים בסך הכול).
                </>
              ) : (
                <>
                  השבר <Q>{`${dens.m}/${dens.n}`}</Q> כבר מחוץ לקטע: המכנה קטן מדי.
                </>
              )}
            </span>
          </>
        ) : s.mode === 'root' ? (
          <>
            <span data-readout="root">
              <Q>{`S = {x ≥ 0 : x${superscript(s.k)} < ${num(s.ra)}}`}</Q>; השורש המחושב בחצייה (בדיקה מספרית): <Q>{`s ≈ ${num(rootS)}`}</Q>.
            </span>
            <span data-readout="case">
              <Q>{`x = ${num(Number(s.x.toFixed(3)))}`}</Q>, <Q>{`x${superscript(s.k)} ≈ ${num(Number(step.xk.toFixed(3)))}`}</Q>:{' '}
              {step.kind === 'below' ? (
                <>
                  קטן מ-<Q>a</Q>. עם <Q>{`h ≈ ${num(Number(step.h.toFixed(4)))}`}</Q> מתקיים <Q>{`(x+h)${superscript(s.k)} − x${superscript(s.k)} ≈ ${num(Number(step.gap.toFixed(4)))} ≤ ${num(Number(step.gapBound.toFixed(4)))}`}</Q>, לכן <Q>x + h</Q> שייך ל-S ו-<Q>x</Q> אינו חסם מלעיל.
                </>
              ) : step.kind === 'above' ? (
                <>
                  גדול מ-<Q>a</Q>. עם <Q>{`h ≈ ${num(Number(step.h.toFixed(4)))}`}</Q> מתקיים <Q>{`x${superscript(s.k)} − (x−h)${superscript(s.k)} ≈ ${num(Number(step.gap.toFixed(4)))} ≤ ${num(Number(step.gapBound.toFixed(4)))}`}</Q>, לכן <Q>x − h</Q> הוא חסם מלעיל קטן יותר ו-<Q>x</Q> אינו הקטן ביותר.
                </>
              ) : (
                <>שווה ל-<Q>a</Q> (עד דיוק החישוב): אף אחד משני המקרים אינו מתקיים.</>
              )}
            </span>
          </>
        ) : (
          <>
            <span data-readout="sums">
              <Q>{`${s.side === 'sup' ? 'sup' : 'inf'} A = ${textOf(pair.A, s.side)}`}</Q>, <Q>{`${s.side === 'sup' ? 'sup' : 'inf'} B = ${textOf(pair.B, s.side)}`}</Q>,{' '}
              <Q>{`${s.side === 'sup' ? 'sup' : 'inf'}(A + B) = ${textOf(pair.AB, s.side)}`}</Q>: סכום ה{s.side === 'sup' ? 'סופרמומים' : 'אינפימומים'}.
            </span>
            {wsum && (
              <span data-readout="witness">
                <Q>{`ε = ${num(eps)}`}</Q>: <Q>{`a = ${num(Number(wsum.a.toFixed(4)))}`}</Q> ב-A, <Q>{`b = ${num(Number(wsum.b.toFixed(4)))}`}</Q> ב-B, וסכומם <Q>{`${num(Number(wsum.c.toFixed(4)))}`}</Q> ב-A + B,
                במרחק פחות מ-ε מה-{s.side === 'sup' ? 'סופרמום' : 'אינפימום'}.
              </span>
            )}
          </>
        )
      }
      controls={
        <>
          {offeredModes.length > 1 && (
            <div class="group" role="group" aria-label="התצוגה">
              {offeredModes.map((id) => (
                <Toggle key={id} label={MODE_NAME[id]} on={s.mode === id} onChange={() => pickMode(id)} />
              ))}
            </div>
          )}
          {s.mode !== 'archimedes' && s.mode !== 'density' && s.mode !== 'root' && sumOffer.length > 1 && (
            <div class="group" role="group" aria-label="הקבוצה">
              {sumOffer.map((id) => (
                <Toggle key={id} label={<bdi dir="ltr">{nameOf(id)}</bdi>} on={s.preset === id} onChange={() => pickPreset(id)} />
              ))}
            </div>
          )}
          {props.sides && s.mode !== 'archimedes' && s.mode !== 'density' && s.mode !== 'root' && (
            <div class="group" role="group" aria-label="הצד">
              <Toggle label="חסם מלעיל, סופרמום" on={s.side === 'sup'} onChange={() => pickSide('sup')} />
              <Toggle label="חסם מלרע, אינפימום" on={s.side === 'inf'} onChange={() => pickSide('inf')} />
            </div>
          )}
          {(s.mode === 'bound' || s.mode === 'eps' || s.mode === 'archimedes') && (
            <Slider label={s.side === 'sup' || s.mode === 'archimedes' ? 'המועמד M' : 'המועמד m'} value={s.M} min={R[0]} max={R[1]} step={R[2]} format={num} onChange={(v) => userSet({ M: grid(v, R[2]), active: 'M' })} />
          )}
          {s.mode === 'eps' && bnd !== null && (
            <div class="group">
              <Toggle label={`${cand} = ${s.side === 'sup' ? 'סופרמום' : 'אינפימום'}`} on={Math.abs(s.M - bnd) < BOUND_TOL} onChange={() => userSet({ M: bnd })} />
            </div>
          )}
          {(s.mode === 'eps' || s.mode === 'sum') && (
            <Slider label="ε" value={s.ei} min={0} max={EPS_LADDER.length - 1} step={1} format={(v) => num(EPS_LADDER[Math.round(v)])} onChange={(v) => userSet({ ei: Math.round(v) })} />
          )}
          {s.mode === 'density' && (
            <>
              <Slider label="הקצה a" value={s.a} min={-2} max={2} step={0.01} format={(v) => num(Number(v.toFixed(2)))} onChange={(v) => moveHandle('a', v)} />
              <Slider label="הקצה b" value={s.b} min={-2} max={2} step={0.01} format={(v) => num(Number(v.toFixed(2)))} onChange={(v) => moveHandle('b', v)} />
              <Slider label="המכנה n" value={dens.n} min={1} max={80} step={1} format={(v) => String(Math.round(v))} onChange={(v) => userSet({ n: Math.round(v) })} />
              <div class="group">
                <Toggle label="המכנה הקטן ביותר שמספיק" on={s.n === null} onChange={() => userSet({ n: null })} />
              </div>
            </>
          )}
          {s.mode === 'root' && (
            <>
              <Slider label="a" value={s.ra} min={0.5} max={20} step={0.5} format={num} onChange={(v) => userSet({ ra: v, x: clamp(s.x, 0, rootMax(v, s.k)) })} />
              <Slider label="החזקה k" value={s.k} min={1} max={6} step={1} format={(v) => String(Math.round(v))} onChange={(v) => userSet({ k: Math.round(v), x: clamp(s.x, 0, rootMax(s.ra, Math.round(v))) })} />
              <Slider label="המועמד x" value={s.x} min={0} max={rootMax(s.ra, s.k)} step={STEP} format={(v) => num(Number(v.toFixed(2)))} onChange={(v) => userSet({ x: grid(v), active: 'x' })} />
            </>
          )}
          {showSupToggle && (
            <div class="group">
              <Toggle label={`הראו את ה${s.mode === 'root' ? 'סופרמום s' : s.side === 'sup' ? 'סופרמום' : 'אינפימום'}`} on={s.showSup} onChange={(on) => setS({ ...s, showSup: on })} />
            </div>
          )}
        </>
      }
    />
  );
}

/* ---- drawing helpers (the canvas is math space: LTR, x grows to the right) ---- */

interface Scene {
  ctx: CanvasRenderingContext2D;
  p: Palette;
  px: (v: number) => number;
  v0: number;
  v1: number;
  W: number;
  left: number;
  right: number;
  narrow: boolean;
}

/** S = {x ≥ 0 : x^k < a} = [0, s) as a drawable set (a one-piece interval set) */
function rootSet(_a: number, s: number): SupSet {
  const base = SETS['half-open'];
  return { ...base, pieces: [{ lo: 0, hi: s, loClosed: true, hiClosed: false }] };
}

function text(sc: Scene, t: string, x: number, y: number, color: string, weight: number, size: number, dir: 'ltr' | 'rtl' = 'ltr', align: CanvasTextAlign = 'center') {
  const { ctx, p } = sc;
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${p.fontUi}`;
  ctx.direction = dir;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(t).width;
  const cx = align === 'left' ? x + w / 2 : x;
  ctx.fillText(t, Math.max(w / 2 + 3, Math.min(sc.W - w / 2 - 3, cx)), y);
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

/** an open end / hollow point: paper inside, coloured stroke */
function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function bracket(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  for (const x of [x0, x1]) {
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
  }
  ctx.stroke();
  ctx.restore();
}

function axis(sc: Scene, y: number) {
  const { ctx, p, px, v0, v1, W, left, right, narrow } = sc;
  ctx.save();
  ctx.strokeStyle = p.ink2;
  ctx.fillStyle = p.ink2;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left - 10, y);
  ctx.lineTo(W - right + 8, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W - right + 12, y);
  ctx.lineTo(W - right + 4, y - 4);
  ctx.lineTo(W - right + 4, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.font = `11px ${p.fontUi}`;
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const t of niceTicks(v0, v1, narrow ? 5 : 9)) {
    const x = px(t);
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y + 4);
    ctx.stroke();
    ctx.fillText(num(Number(t.toFixed(4))), x, y + 22);
  }
  ctx.restore();
}

/** the half line beyond the candidate bound, faintly tinted in the "outside" colour */
function tint(sc: Scene, y: number, M: number, side: Side) {
  const { ctx, p, px, W, left, right } = sc;
  const x = px(M);
  ctx.save();
  ctx.fillStyle = withAlpha(p.pointOut, 0.1);
  if (side === 'sup') ctx.fillRect(Math.min(W - right + 8, Math.max(left - 10, x)), y - 30, Math.max(0, W - right + 8 - Math.max(left - 10, x)), 60);
  else ctx.fillRect(left - 10, y - 30, Math.max(0, Math.min(x, W - right + 8) - (left - 10)), 60);
  ctx.restore();
}

/** the ε-band on the line: ends closed or open as given by [loClosed, hiClosed] */
function band(sc: Scene, y: number, lo: number, hi: number, closed: [boolean, boolean]) {
  const { ctx, p, px } = sc;
  const x0 = px(lo);
  const x1 = px(hi);
  ctx.save();
  ctx.fillStyle = p.epsBand;
  ctx.fillRect(x0, y - 20, Math.max(0, x1 - x0), 40);
  ctx.strokeStyle = p.eps;
  ctx.lineWidth = 1.6;
  for (const [x, c] of [[x0, closed[0]], [x1, closed[1]]] as const) {
    ctx.setLineDash(c ? [] : [5, 4]);
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x, y + 20);
    ctx.stroke();
  }
  ctx.restore();
}

/** a triangle below the line pointing up at v (a candidate), with its label under it */
function marker(sc: Scene, y: number, v: number, color: string, label: string, _dir: 'up', hollow: boolean) {
  const { ctx, p, px } = sc;
  const x = px(v);
  ctx.save();
  ctx.fillStyle = hollow ? p.paper : color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x - 7, y + 9);
  ctx.lineTo(x + 7, y + 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  text(sc, label, x, y + 40, color, 700, 12);
}

/** sup / inf: a diamond above the line (filled = attained, hollow = not) joined to the line by a dotted guide */
function limitMark(sc: Scene, y: number, v: number, attained: boolean, label: string, compact = false) {
  const { ctx, p, px } = sc;
  const x = px(v);
  const dy = compact ? 24 : 32;
  ctx.save();
  ctx.strokeStyle = p.limit;
  ctx.setLineDash([2, 3]);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y - dy + 7);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = attained ? p.limit : p.paper;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x, y - dy - 7);
  ctx.lineTo(x + 7, y - dy);
  ctx.lineTo(x, y - dy + 7);
  ctx.lineTo(x - 7, y - dy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  text(sc, label, x, y - dy - 16, p.limit, 700, 12);
}

/** an element of the set marked on the line: filled in the "inside" colour (in the band) or hollow with a ring (outside) */
function markPoint(sc: Scene, y: number, v: number, inside: boolean, label: string) {
  const { ctx, p, px } = sc;
  const x = px(v);
  if (inside) dot(ctx, x, y, 7, p.pointIn);
  else {
    ring(ctx, x, y, 7, p.pointOut, p.paper);
    ctx.save();
    ctx.strokeStyle = p.pointOut;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }
  text(sc, label, x + 12, y - 15, inside ? p.pointIn : p.pointOut, 700, 12, 'ltr', 'left');
}

/**
 * The set on the line. Elements: bars with open (hollow) and closed (filled) ends for intervals, filled discs for the
 * terms, ticks for the rationals. With `cut` (the candidate bound M and its side) everything beyond M is "outside":
 * bar parts dashed in the outside colour, terms hollow with a ring.
 */
function drawSet(sc: Scene, y: number, S: SupSet, cut: { M: number; side: Side } | null, count?: number) {
  const { ctx, p, px, v0, v1 } = sc;
  const out = (x: number) => !!cut && (cut.side === 'sup' ? x > cut.M + 1e-12 : x < cut.M - 1e-12);
  const seg = (a: number, b: number, color: string, dash: number[], width: number) => {
    const lo = Math.max(a, v0 - 1);
    const hi = Math.min(b, v1 + 1);
    if (hi <= lo) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(px(lo), y);
    ctx.lineTo(px(hi), y);
    ctx.stroke();
    ctx.restore();
  };
  if (S.kind !== 'points') {
    const width = S.kind === 'dense' ? 2 : 6;
    for (const P of S.pieces) {
      if (P.hi > P.lo) {
        // the part of the piece on the near side of M and the part beyond it
        if (!cut) seg(P.lo, P.hi, p.curve, [], width);
        else if (cut.side === 'sup') {
          seg(P.lo, Math.min(P.hi, cut.M), p.curve, [], width);
          if (P.hi > cut.M) seg(Math.max(P.lo, cut.M), P.hi, p.pointOut, [7, 5], width);
        } else {
          seg(Math.max(P.lo, cut.M), P.hi, p.curve, [], width);
          if (P.lo < cut.M) seg(P.lo, Math.min(P.hi, cut.M), p.pointOut, [7, 5], width);
        }
      }
      for (const [v, closed] of [[P.lo, P.loClosed], [P.hi, P.hiClosed]] as const) {
        if (v < v0 - 1e-9 || v > v1 + 1e-9) continue;
        const c = out(v) ? p.pointOut : p.curve;
        if (closed) dot(ctx, px(v), y, 6.5, c);
        else ring(ctx, px(v), y, 6, c, p.paper);
      }
    }
    if (S.kind === 'dense') {
      ctx.save();
      ctx.lineWidth = 1.6;
      for (const x of S.points(12)) {
        ctx.strokeStyle = out(x) ? p.pointOut : p.curve;
        ctx.beginPath();
        ctx.moveTo(px(x), y - 6);
        ctx.lineTo(px(x), y + 6);
        ctx.stroke();
      }
      ctx.restore();
    }
    return;
  }
  const pts = S.points(count);
  const r = Math.max(2.6, Math.min(5, (px(v1) - px(v0)) / Math.max(pts.length, 10) / 2.2));
  for (const x of pts) {
    if (x < v0 - 1e-9 || x > v1 + 1e-9) continue;
    if (out(x)) {
      ring(ctx, px(x), y, r, p.pointOut, p.paper);
      ctx.save();
      ctx.strokeStyle = p.pointOut;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px(x), y, r * 1.8 + 1, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    } else dot(ctx, px(x), y, r, p.curve);
  }
}


