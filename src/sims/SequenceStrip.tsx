/**
 * SequenceStrip: the shared live figure of lessons 2.2–2.6 and 2.10. The terms aₙ of a sequence as points over n,
 * and per mode what the definition or theorem asks of them: the ε-band around a limit (2.2), a bound ±M (2.3), the
 * sum / product / quotient of two sequences (2.4), a sandwich of three (2.5), a level M that the terms must pass
 * (2.6), or the spread of the tail against ε (2.10). An N line the student drags; terms the definition ignores
 * (n ≤ N) are small and grey, terms that meet the condition are filled, terms that fail it are hollow with a ring
 * (shape, not only colour).
 *
 * Every number comes from src/math/sequences.ts (via ./strip/model.ts) over a finite window: the figure gathers
 * evidence for a proof's N; it proves nothing about the terms beyond the window, and the caption must say so.
 *
 * Use:   <Spread figure={SequenceStrip} figureProps={{ mode: 'combine', seq: 'pair-sum', seqs: ['pair-sum', 'pair-cancel'],
 *                                                       op: 'sum', eps: 0.1, N: 0, tasks: ['sum-N', 'cancel'] }}>
 *        <Step fig="fig-2-4a" set={{ op: 'product', eps: 0.05, N: 0, showMin: true }}>
 *
 * ---------------------------------------------------------------------------------------------------------------
 * PROPS (all optional except `id`, which the .astro wrapper takes from the Spread)
 *   id       figure id (task ids are stored as `${id}:${task}`)
 *   mode     'limit' | 'bound' | 'combine' | 'sandwich' | 'infinite' | 'cauchy'. Default 'limit'.
 *   modes    the modes offered in a picker (none or one: no picker). Not needed when steps switch the mode.
 *   seq      the preset: a sequence id (modes limit, bound, infinite, cauchy), a pair id (combine) or a triple id
 *            (sandwich). One that does not fit the mode is replaced by the first of `seqs` that does, else the
 *            mode's default: limit 'recip', bound 'ratio3', combine 'pair-sum', sandwich 'floor-x',
 *            infinite 'sqrt-n', cauchy 'inv-sq-sum'.
 *   seqs     the presets offered as chips; only those that fit the current mode are shown (none or one: no chips).
 *   op       mode combine: 'sum' | 'product' | 'quotient'. Default 'sum'. 'quotient' is not defined on
 *            'pair-cancel' (bₙ = 0 at even n): there it falls back to 'sum' and the chip is not offered.
 *   eps      ε, snapped to the ladder 0.5, 0.3, 0.2, 0.1, 0.05, 0.03, 0.02, 0.01, 0.005. Default 0.1.
 *   N        0..500. Default 0.
 *   M        mode bound: the bound (0 .. 1.1·max|y| of the preset's value window, step 0.05; step 1 when that
 *            exceeds 10); mode infinite: the level
 *            (per preset, see below). Default: about 0.6 of the window (bound), the preset's start (infinite).
 *   showMin  the mode's helper (one toggle per mode, the same key in every mode), default false:
 *              limit, infinite, cauchy: the smallest N on the window, in the readout;
 *              bound:    the proof's bound B = max(|a₁|, …, |a_N|, |L| + 1) of 2.3.3 as dashed lines ±B, with the
 *                        band L ± 1 (the N of the proof is the N slider; the readout says whether it fits ε = 1);
 *              combine:  the tolerances the proofs of 2.4 put on aₙ and bₙ (sum: ε/2 each; product: ε/(2(|b|+1))
 *                        and ε/(2K) with K = 2 ≥ |aₙ|; quotient: ε|b|/4 and min(|b|/2, εb²/(4(|a|+1)))) as dotted
 *                        bands, their N₁, N₂ as lines, and N = max(N₁, N₂) in the readout;
 *              sandwich: N₁ (lower) and N₂ (upper) where each outer sequence enters the band, as lines.
 *   tasks    task ids (below), listed under the figure with check marks.
 *
 * STEP-SETTABLE KEYS (<Step fig set={{…}}>): mode, seq, op, eps, N, L, M, showMin. A new mode keeps the preset if it
 * fits, else takes the first fitting one of `seqs`; naming a preset or mode resets L to its limit (or candidate) and
 * M to its default unless the same step gives them; naming an op resets L. Unknown keys and values that do not fit
 * are ignored. A step never ticks a task.
 *
 * CONTROLS, in this order (range inputs in brackets, for tests): preset chips, mode chips, then
 *   limit    [ε] [N] [L, only when the preset has no limit]   toggle "הראו את ה-N הקטן ביותר"
 *   bound    [M] [N]                                          toggle "הראו את החסם מההוכחה"
 *   combine  op chips, [ε] [N] [L, only when cₙ has no limit] toggle "הראו את N₁, N₂ מההוכחה"
 *   sandwich [ε] [N] [L, only for 'outer-differ']            toggle "הראו את N₁, N₂ של הסדרות החיצוניות"
 *   infinite [M] [N]                                          toggle "הראו את ה-N הקטן ביותר"
 *   cauchy   [ε] [N]                                          toggle "הראו את ה-N הקטן ביותר"
 * Keyboard on the canvas: ← → move N; ↓ ↑ narrow / widen ε, or lower / raise M in modes bound and infinite. The canvas
 * can be dragged to move N. Readouts carry data-readout="eps" | "N" | "M" | "op" | "verdict" | "min" | "legend" |
 * "proof" | "note".
 *
 * MODES
 *   limit     The ε-band (L − ε, L + ε) and the line L (the claimed limit, or a candidate L slider). Terms after N
 *             inside the band filled, outside hollow with a ring. Verdict over N < n ≤ max(2000, 4N + 100).
 *   bound     Lines y = ±M with the region between them; every term (N is not used for the verdict) filled when
 *             |aₙ| ≤ M, hollow with a ring when |aₙ| > M. The verdict is over the drawn window.
 *   combine   aₙ (small squares) and bₙ (small diamonds) in two ink tones, cₙ = aₙ + bₙ, aₙ·bₙ or aₙ/bₙ as the main
 *             points, with the band around the limit of cₙ.
 *   sandwich  lower (small ▲) ≤ middle (main points) ≤ upper (small ▼), the band around the common limit L. The verdict
 *             is about the middle; the readout also says whether N fits each outer sequence.
 *   infinite  No band: the line y = M and the region beyond it (above for → ∞ and for sequences without a claimed
 *             infinite limit; below for 'neg-quad', → −∞). Terms after N beyond M filled, the others hollow.
 *   cauchy    After N, the band from the smallest to the largest term of the tail N < n ≤ max(2000, 4N + 100),
 *             filled when its width (the largest |aₘ − aₙ|, m, n > N, on that range) is < ε, dashed otherwise; an ε
 *             ruler beside it. Tail points filled when the width is < ε, hollow otherwise.
 *
 * PRESETS (src/math/sequences.ts; limit = the claimed one, "—" none)
 *   sequences  recip 1/n → 0 · shifted (2n+1)/n → 2 · alternating 1 + (−1)ⁿ/n → 1 · bumpy (2 + (−1)ⁿ)/n → 0 ·
 *              slow 1/√n → 0 · wild-start ten terms ±3 then 1/n → 0 · sign (−1)ⁿ — (candidate 1) ·
 *              ratio3 (3n+1)/(n+2) → 3 (|aₙ − 3| = 5/(n+2), N(ε) = ⌊5/ε − 2⌋, 498 at ε = 0.01) ·
 *              quad3 (3n² + n)/(n² + 1) → 3 (largest term a₆ = 114/37) · root-diff √(n+1) − √n → 0 ·
 *              sqrt-n √n — (→ ∞; M 0..20 step 0.5, start 4; N(M) = ⌊M²⌋) · alt-ratio (−1)ⁿ n/(n+1) — ·
 *              lin n — (→ ∞; M 0..300 step 5, start 20) · zigzag n at even n, 0 at odd n — (M 0..300 step 5,
 *              start 10; no N for M ≥ 0) · neg-quad 10n − n² — (→ −∞; M −3000..0 step 50, start −500;
 *              N(M) = ⌊5 + √(25 − M)⌋) · alt-lin (−1)ⁿ n — (M 0..300 step 5, start 10) ·
 *              inv-sq-sum 1 + 1/4 + … + 1/n² — (value not claimed; Cauchy N at ε = 0.05 is 19) ·
 *              harmonic Hₙ — (→ ∞, not Cauchy; M 0..6 step 0.25, start 3) · alt-harmonic 1 − 1/2 + … — (value not
 *              claimed). Partial sums are cached running sums.
 *   pairs      pair-sum aₙ = 1 + 1/n, bₙ = 2 − 1/√n (sum → 3, product → 2, quotient → 1/2) ·
 *              pair-cancel aₙ = (−1)ⁿ, bₙ = 1 − (−1)ⁿ (sum ≡ 1; product 0, −2, … diverges, candidate L; no quotient)
 *   triples    floor-x √2 − 1/n ≤ ⌊n√2⌋/n ≤ √2 → √2 · osc-squeeze (n−1)/n ≤ (n + (−1)ⁿ)/n ≤ (n+1)/n → 1 ·
 *              zero-bounded −1/n ≤ sin(n)/n ≤ 1/n → 0 · outer-differ −1 ≤ (−1)ⁿ ≤ 1 (outer limits differ; candidate
 *              L slider, start 0)
 *
 * TASKS (ticked only by the learner's own move of the control the task is about; never by a text step; never in the
 * exact state the last text step produced, except 2.2's four tasks, which keep their original rule; never by picking
 * a preset or mode. "Fits" means no term after N fails, up to n = max(2000, 4N + 100).)
 *   find-N          limit, 'recip', ε ≤ 0.1, N moved to the smallest N (2.2)
 *   narrow          limit, a convergent preset, ε ≤ 0.02, N or ε moved and N fits (2.2)
 *   wild            limit, 'wild-start', ε ≤ 0.1, N or ε moved and N fits (2.2)
 *   no-N            limit, 'sign', L = 1, N moved to ≥ 30 (2.2)
 *   estimate        limit, 'ratio3', ε ≤ 0.01, N or ε moved and N equals the smallest N (498 at ε = 0.01; at 0.005
 *                   it is 998, past the slider)
 *   no-limit        limit, 'sign' or 'alt-ratio', ε ≤ 0.5, N ≥ 30, no N fits: each such state reached by moving N, ε
 *                   or L records its L; ticks when 3 different L have been recorded for the same preset
 *   bound-all       bound, a convergent preset, M moved so that max|aₙ| (n in the drawn window) ≤ M ≤ that + 0.05
 *   sum-N           combine, op sum, both aₙ and bₙ convergent ('pair-sum'), ε ≤ 0.05, N or ε moved and N fits cₙ
 *                   (smallest N 358 at ε = 0.05)
 *   product-N       the same with op product (smallest N 317 at ε = 0.05)
 *   cancel          combine, 'pair-cancel', op sum, ε ≤ 0.1, N moved and N fits cₙ ≡ 1 (any N does)
 *   squeeze         sandwich, a triple with a common limit, ε ≤ 0.05, N or ε moved and N fits both outer sequences
 *   outer-differ    sandwich, 'outer-differ', ε ≤ 0.2, N ≥ 30, N, ε or L moved and no N fits the middle
 *   find-N-M        infinite, 'sqrt-n', M ≥ 10, N or M moved and N equals the smallest N (⌊M²⌋, 100 at M = 10)
 *   no-N-M          infinite, 'zigzag', M ≥ 5, N ≥ 30, N or M moved and no N fits
 *   cauchy-N        cauchy, 'inv-sq-sum', ε ≤ 0.05, N or ε moved and N equals the smallest N whose tail width < ε
 *                   (19 at ε = 0.05)
 *   harmonic-grows  cauchy, 'harmonic', ε ≤ 0.5, N moved to ≥ 100 and the tail width is still ≥ ε (it always is:
 *                   > ln 4 on the checked range); the readout notes that the window is evidence and 2.10.6 the proof
 * Reset (↺) restores the props' state and forgets the last step's state and the L values tried.
 * ---------------------------------------------------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import { EPSILONS, opsOf, type CombineOp } from '~/math/sequences';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo } from './core/canvas';
import type { Plot } from './core/plot';
import SimShell, { Slider, Toggle, type TaskDef } from './core/SimShell';
import { drawStrip, fmt } from './strip/draw';
import {
  MODE_NAME,
  N_MAX,
  OP_FORMULA,
  OP_NAME,
  STRIP_MODES,
  TASK_LABEL,
  analyse,
  applyStep,
  defaultM,
  defaultSeq,
  fitsMode,
  fresh,
  limitOf,
  lRangeOf,
  mRangeOf,
  opFor,
  pair,
  single,
  snapTo,
  taskKey,
  tasksFor,
  triple,
  type Analysis,
  type SequenceStripProps,
  type StripId,
  type StripMode,
  type StripState,
} from './strip/model';

export type { SequenceStripProps } from './strip/model';

const TOGGLE_LABEL: Record<StripMode, string> = {
  limit: 'הראו את ה-N הקטן ביותר',
  bound: 'הראו את החסם מההוכחה',
  combine: 'הראו את N₁, N₂ מההוכחה',
  sandwich: 'הראו את N₁, N₂ של הסדרות החיצוניות',
  infinite: 'הראו את ה-N הקטן ביותר',
  cauchy: 'הראו את ה-N הקטן ביותר',
};

const OP_EXPR: Record<CombineOp, string> = { sum: 'aₙ + bₙ', product: 'aₙ·bₙ', quotient: 'aₙ/bₙ' };

const nameOf = (mode: StripMode, id: StripId) => {
  const k = mode === 'combine' ? pair(id) : mode === 'sandwich' ? triple(id) : single(id);
  return k.name;
};

/** the sentence a screen reader hears after a change, also the end of the canvas label */
function describe(s: StripState, an: Analysis): string {
  const e = fmt(an.eps);
  if (s.mode === 'bound') {
    const b = an.bound!;
    const head = `M = ${fmt(s.M)}. `;
    const v = an.works ? `כל האיברים בחלון, עד n = ${an.win}, בערכם המוחלט קטנים מ-M או שווים לו.` : `${an.bad.length} איברים בחלון גדולים מ-M בערכם המוחלט, הראשון ב-n = ${an.bad[0]}.`;
    const pr = s.showMin && b.proof !== null ? ` החסם מההוכחה: B = ${fmt(b.proof)}, עם N = ${s.N}${b.fits1 ? ', שמתאים ל-ε = 1' : ', שאינו מתאים ל-ε = 1'}.` : '';
    return head + v + pr;
  }
  if (s.mode === 'infinite') {
    const dir = an.infinite!.dir > 0 ? 'גדולים מ-M' : 'קטנים מ-M';
    const v = an.works ? `כל האיברים אחרי N, עד n = ${an.upTo}, ${dir}.` : `${an.bad.length} איברים אחרי N, עד n = ${an.upTo}, אינם ${dir}, הראשון ב-n = ${an.bad[0]}.`;
    const m = s.showMin ? (an.minN === null ? ' אין N שמתאים.' : ` ה-N הקטן ביותר שמתאים: ${an.minN}.`) : '';
    return `M = ${fmt(s.M)}, N = ${s.N}. ${v}${m}`;
  }
  if (s.mode === 'cauchy') {
    const c = an.cauchy!;
    const v = `רוחב הזנב אחרי N, עד n = ${an.upTo}: ${fmt(c.spread)}, ${c.below ? 'קטן מ-ε' : 'אינו קטן מ-ε'}.`;
    const m = s.showMin ? (an.minN === null ? ' אין N עד 500 שבו הרוחב קטן מ-ε.' : ` ה-N הקטן ביותר שבו הרוחב קטן מ-ε: ${an.minN}.`) : '';
    return `ε = ${e}, N = ${s.N}. ${v}${m}`;
  }
  if (s.mode === 'limit') {
    // lesson 2.2's sentence, word for word
    const parts = [`${an.formula}, סביבה של ${fmt(an.L)} עם ε = ${e}, N = ${s.N}.`];
    parts.push(an.works ? 'כל האיברים אחרי N בחלון נמצאים בתוך הסביבה.' : `${an.bad.length} איברים אחרי N מחוץ לסביבה, הראשון ב-n = ${an.bad[0]}.`);
    if (s.showMin) parts.push(an.minN === null ? 'אין N שמתאים.' : `ה-N הקטן ביותר שמתאים: ${an.minN}.`);
    return parts.join(' ');
  }
  const what = s.mode === 'combine' ? 'cₙ' : 'הסדרה האמצעית';
  const v = an.works ? `כל האיברים של ${what} אחרי N, עד n = ${an.upTo}, בתוך הסביבה.` : `${an.bad.length} איברים של ${what} אחרי N מחוץ לסביבה, הראשון ב-n = ${an.bad[0]}.`;
  let m = '';
  if (s.showMin && s.mode === 'combine' && an.combine?.tol && an.combine.N1 !== null && an.combine.N2 !== null)
    m = ` מההוכחה: N₁ = ${an.combine.N1}, N₂ = ${an.combine.N2}, N = ${Math.max(an.combine.N1, an.combine.N2)}.`;
  if (s.showMin && s.mode === 'sandwich' && an.sandwich) m = ` הסדרה התחתונה: N₁ = ${an.sandwich.Nlow ?? 'אין'}, העליונה: N₂ = ${an.sandwich.Nup ?? 'אין'}.`;
  return `סביבה של ${fmt(an.L)} עם ε = ${e}, N = ${s.N}. ${v}${m}`;
}

export default function SequenceStrip(props: SequenceStripProps) {
  const [s, setS] = useState<StripState>(() => fresh(props));
  const [live, setLive] = useState('');
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));
  const dragging = useRef(false);
  const plotRef = useRef<Plot | null>(null);
  const cache = useRef(new Map<string, number | null>());
  const stepKey = useRef<string | null>(null);
  const triedL = useRef(new Map<string, Set<string>>());

  const an = analyse(s, cache.current);
  const eps = an.eps;

  /** The student's own change: the only path that can tick a task (strip/model.ts, `tasksFor`). */
  const userSet = (patch: Partial<StripState>) => {
    const next = { ...s, ...patch };
    setS(next);
    const done = tasksFor(s, patch, next, analyse(next, cache.current), {
      tasks: props.tasks ?? [],
      stepKey: stepKey.current,
      triedL: triedL.current,
    });
    for (const t of done) markTask(`${props.id}:${t}`);
  };

  // as in lesson 2.2: picking a preset starts over at N = 0 with its limit
  const pickSeq = (id: StripId) => {
    const op = opFor(id, s.op);
    userSet({ seq: id, L: limitOf(s.mode, id, op), N: 0, op, M: defaultM(s.mode, id) });
  };
  const pickMode = (mode: StripMode) => {
    if (mode === s.mode) return;
    const seq = fitsMode(s.seq, mode) ? s.seq : defaultSeq(mode, props.seqs);
    const op = opFor(seq, s.op);
    setS({ ...s, mode, seq, op, L: limitOf(mode, seq, op), M: defaultM(mode, seq), N: 0 });
  };
  const pickOp = (op: CombineOp) => {
    if (op === s.op) return;
    setS({ ...s, op, L: limitOf(s.mode, s.seq, op) });
  };

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = applyStep(prev, st, props);
          stepKey.current = taskKey(next);
          return next;
        });
      }),
    [props.id],
  );

  useEffect(() => {
    const id = setTimeout(() => setLive(describe(s, an)), 300);
    return () => clearTimeout(id);
  }, [s]);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    plotRef.current = drawStrip(ctx, view, p, s, an);
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1.5, worldHeight: 1, animate: false });
  useEffect(invalidate, [s]);

  const nFromPointer = (e: PointerEvent) => {
    const plot = plotRef.current;
    if (!plot) return null;
    const n = ((e.offsetX - plot.box.x) / plot.box.w) * (an.win + 1) - 0.5;
    return Math.max(0, Math.min(N_MAX, Math.round(n)));
  };
  const onPointerDown = (e: PointerEvent) => {
    const n = nFromPointer(e);
    if (n === null) return;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (n !== s.N) userSet({ N: n });
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging.current) return;
    const n = nFromPointer(e);
    if (n !== null && n !== s.N) userSet({ N: n });
  };
  const onPointerUp = () => {
    dragging.current = false;
  };
  const usesM = s.mode === 'bound' || s.mode === 'infinite';
  const mRange = mRangeOf(s.mode, s.seq);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      userSet({ N: Math.max(0, Math.min(N_MAX, s.N + (e.key === 'ArrowRight' ? 1 : -1))) });
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const up = e.key === 'ArrowUp';
      if (usesM) userSet({ M: snapTo(s.M + (up ? 1 : -1) * mRange[2], mRange) });
      else userSet({ ei: Math.max(0, Math.min(EPSILONS.length - 1, s.ei + (up ? -1 : 1))) });
    }
  };

  const offered = (props.seqs ?? []).filter((id) => fitsMode(id, s.mode));
  const modes = (props.modes ?? []).filter((m) => STRIP_MODES.includes(m));
  const ops = s.mode === 'combine' ? opsOf(pair(s.seq)) : [];
  const showL = (s.mode === 'limit' || s.mode === 'combine' || s.mode === 'sandwich') && !an.claimed;
  const lRange = lRangeOf(s.mode, s.seq);
  const N = <b class="q">n = {an.upTo}</b>;

  const epsSlider = (
    <Slider
      label={s.mode === 'cauchy' ? 'ε: הרוחב המותר' : 'ε: המרחק המותר מ-L'}
      // forward narrows the band, like the arrow-down key: the lesson's move is "shrink ε"
      value={s.ei}
      min={0}
      max={EPSILONS.length - 1}
      step={1}
      format={(v) => fmt(EPSILONS[Math.round(v)])}
      onChange={(v) => userSet({ ei: Math.round(v) })}
    />
  );
  const nSlider = (
    <Slider label="N" value={s.N} min={0} max={Math.min(N_MAX, Math.max(60, an.win))} step={1} format={(v) => String(Math.round(v))} onChange={(v) => userSet({ N: Math.round(v) })} />
  );
  const mSlider = (
    <Slider
      label={s.mode === 'bound' ? 'M: החסם' : 'M: הרמה'}
      value={s.M}
      min={mRange[0]}
      max={mRange[1]}
      step={mRange[2]}
      format={fmt}
      onChange={(v) => userSet({ M: snapTo(v, mRange) })}
    />
  );

  const bandVerdict = (what: string) =>
    an.works ? (
      <>
        כל האיברים {what}אחרי N, עד {N}, בתוך הסביבה: ה-N הזה מתאים (על הטווח שנבדק).
      </>
    ) : (
      <>
        אחרי N, עד {N}, יש <b class="q">{an.bad.length}</b> איברים {what}מחוץ לסביבה, הראשון ב-<b class="q">n = {an.bad[0]}</b>.
      </>
    );

  const minLine = (none: string, some: string) =>
    s.showMin && (
      <span data-readout="min">
        {an.minN === null ? <>{none}</> : (
          <>
            {some} <b class="q">{an.minN}</b>
          </>
        )}
      </span>
    );

  const readout = () => {
    const epsRead = (
      <span>
        {s.mode === 'cauchy' ? 'הרוחב המותר' : 'הסביבה'}: <b class="q" data-readout="eps">ε = {fmt(eps)}</b>
      </span>
    );
    const nRead = (
      <span>
        <b class="q" data-readout="N">N = {s.N}</b>
      </span>
    );
    const mRead = (
      <span>
        <b class="q" data-readout="M">M = {fmt(s.M)}</b>
      </span>
    );
    if (s.mode === 'bound') {
      const b = an.bound!;
      return (
        <>
          {mRead}
          {nRead}
          <span data-readout="verdict">
            {an.works ? (
              <>
                כל האיברים בחלון, עד <b class="q">n = {an.win}</b>, נמצאים בין ⁦−M⁩ ל-M: ה-M הזה חוסם אותם.
              </>
            ) : (
              <>
                בחלון יש <b class="q">{an.bad.length}</b> איברים שערכם המוחלט גדול מ-M, הראשון ב-<b class="q">n = {an.bad[0]}</b>.
              </>
            )}{' '}
            הערך המוחלט הגדול ביותר בחלון: <b class="q">{fmt(b.max)}</b>.
          </span>
          {s.showMin && (
            <span data-readout="proof">
              {b.proof === null ? (
                <>הסדרה הזו אינה מתכנסת, ולכן אין לה חסם מההוכחה.</>
              ) : (
                <>
                  <b class="q">B = max(|a₁|, …, |a_N|, |L| + 1) = {fmt(b.proof)}</b>.{' '}
                  {b.fits1 ? (
                    <>ה-N הזה מתאים ל-⁦ε = 1⁩, ולכן כל האיברים אחריו קרובים ל-L עד כדי 1, ו-B חוסם את כולם.</>
                  ) : (
                    <>
                      ה-N הזה אינו מתאים ל-⁦ε = 1⁩, ולכן B אינו מובטח לחסום. ה-N הקטן ביותר שמתאים ל-⁦ε = 1⁩: <b class="q">{an.minN}</b>.
                    </>
                  )}
                </>
              )}
            </span>
          )}
        </>
      );
    }
    if (s.mode === 'infinite') {
      const beyondText = an.infinite!.dir > 0 ? 'גדולים מ-M' : 'קטנים מ-M';
      return (
        <>
          {mRead}
          {nRead}
          <span data-readout="verdict">
            {an.works ? (
              <>
                כל האיברים אחרי N, עד {N}, {beyondText}: ה-N הזה מתאים (על הטווח שנבדק).
              </>
            ) : (
              <>
                אחרי N, עד {N}, יש <b class="q">{an.bad.length}</b> איברים שאינם {beyondText}, הראשון ב-<b class="q">n = {an.bad[0]}</b>.
              </>
            )}
          </span>
          {minLine('אין N שמתאים ל-M הזה.', 'ה-N הקטן ביותר שמתאים:')}
        </>
      );
    }
    if (s.mode === 'cauchy') {
      const c = an.cauchy!;
      return (
        <>
          {epsRead}
          {nRead}
          <span data-readout="verdict">
            רוחב הזנב אחרי N, עד {N}: <b class="q">{fmt(c.max)} − {fmt(c.min)} = {fmt(c.spread)}</b>,{' '}
            {c.below ? <>קטן מ-ε: כל שני איברים אחרי N רחוקים זה מזה פחות מ-ε (על הטווח שנבדק).</> : <>אינו קטן מ-ε.</>}
          </span>
          {minLine('אין N עד 500 שבו רוחב הזנב קטן מ-ε.', 'ה-N הקטן ביותר שבו רוחב הזנב קטן מ-ε:')}
          {s.seq === 'harmonic' && (
            <span data-readout="note">החלון הוא ראיה בלבד. ההוכחה היא טענה 2.10.6: ⁦H₂ₙ − Hₙ ≥ 1/2⁩ לכל n.</span>
          )}
        </>
      );
    }
    if (s.mode === 'combine') {
      const cb = an.combine!;
      return (
        <>
          {epsRead}
          {nRead}
          <span data-readout="op">
            <b class="q">{OP_FORMULA[cb.op]}</b>
            {an.claimed ? <>, ושואפת ל-<b class="q">{fmt(an.L)}</b></> : <>; מועמד לגבול: <b class="q">L = {fmt(an.L)}</b></>}
          </span>
          <span data-readout="legend">■ aₙ · ◆ bₙ · ● cₙ</span>
          <span data-readout="verdict">{bandVerdict('של cₙ ')}</span>
          {s.showMin && (
            <span data-readout="proof">
              {cb.tol === null || cb.N1 === null || cb.N2 === null ? (
                <>אחת הסדרות aₙ, bₙ אינה מתכנסת: המשפט אינו אומר דבר על cₙ.</>
              ) : (
                <>
                  מההוכחה: <b class="q">N₁ = {cb.N1}</b> (אחריו ⁦|aₙ − a| &lt; {fmt(cb.tol.epsA)}⁩), <b class="q">N₂ = {cb.N2}</b> (אחריו ⁦|bₙ − b| &lt; {fmt(cb.tol.epsB)}⁩), ולכן{' '}
                  <b class="q">N = max(N₁, N₂) = {Math.max(cb.N1, cb.N2)}</b> מתאים ל-cₙ.{' '}
                  {an.minN !== null && (
                    <>
                      ה-N הקטן ביותר שמתאים ל-cₙ: <b class="q">{an.minN}</b>.
                    </>
                  )}
                </>
              )}
            </span>
          )}
        </>
      );
    }
    if (s.mode === 'sandwich') {
      const sw = an.sandwich!;
      return (
        <>
          {epsRead}
          {nRead}
          <span data-readout="legend">▲ aₙ ≤ ● bₙ ≤ ▼ cₙ</span>
          <span data-readout="verdict">
            {bandVerdict('של הסדרה האמצעית ')} ה-N הזה {sw.lowerOk ? 'מתאים' : 'אינו מתאים'} לסדרה התחתונה ו{sw.upperOk ? 'מתאים' : 'אינו מתאים'} לעליונה.
          </span>
          {s.showMin && (
            <span data-readout="min">
              הסדרה התחתונה: <b class="q">N₁ = {sw.Nlow ?? 'אין'}</b>, העליונה: <b class="q">N₂ = {sw.Nup ?? 'אין'}</b>
              {sw.Nlow !== null && sw.Nup !== null && (
                <>
                  , ולכן <b class="q">N = max(N₁, N₂) = {Math.max(sw.Nlow, sw.Nup)}</b> מתאים לשלושתן
                </>
              )}
              .
            </span>
          )}
        </>
      );
    }
    // limit: lesson 2.2's readout
    return (
      <>
        {epsRead}
        {nRead}
        <span data-readout="verdict">
          {an.works ? (
            <>
              כל האיברים אחרי N, עד <b class="q">n = {an.upTo}</b>, בתוך הסביבה: ה-N הזה מתאים (על הטווח שנבדק).
            </>
          ) : (
            <>
              אחרי N, עד <b class="q">n = {an.upTo}</b>, יש <b class="q">{an.bad.length}</b> איברים מחוץ לסביבה, הראשון ב-<b class="q">n = {an.bad[0]}</b>.
            </>
          )}
        </span>
        {s.showMin && (
          <span data-readout="min">
            {an.minN === null ? <>אין N שמתאים לסביבה הזו.</> : (
              <>
                ה-N הקטן ביותר שמתאים: <b class="q">{an.minN}</b>
              </>
            )}
          </span>
        )}
      </>
    );
  };

  const label = (() => {
    const keys = 'גררו את קו ה-N; במקלדת: חץ ימינה ושמאלה מזיז את N';
    if (s.mode === 'bound')
      return `איור חי: איברי הסדרה ${an.formula} כנקודות מעל n, והקווים M ו-⁦−M⁩. איבר שערכו המוחלט קטן מ-M או שווה לו מלא, ואיבר מחוץ לתחום חלול ומוקף בטבעת. ${describe(s, an)} ${keys}, חץ למעלה ולמטה משנה את M. החלון הוא ראיה ולא הוכחה.`;
    if (s.mode === 'infinite')
      return `איור חי: איברי הסדרה ${an.formula} כנקודות מעל n, וקו אופקי בגובה M. איברים אחרי N ש${an.infinite!.dir > 0 ? 'מעל' : 'מתחת ל'}-M מלאים, והאחרים חלולים ומוקפים בטבעת. ${describe(s, an)} ${keys}, חץ למעלה ולמטה משנה את M. החלון הוא ראיה ולא הוכחה.`;
    if (s.mode === 'cauchy')
      return `איור חי: איברי הסדרה ${an.formula} כנקודות מעל n. אחרי N מסומן הזנב: רצועה מהאיבר הקטן ביותר עד הגדול ביותר, מלאה כשרוחבה קטן מ-ε, ולידה סרגל באורך ε. ${describe(s, an)} ${keys}, חץ למטה מצמצם את ε. החלון הוא ראיה ולא הוכחה.`;
    if (s.mode === 'combine')
      return `איור חי: ${an.formula}. aₙ בריבועים קטנים, bₙ במעוינים קטנים, ו-cₙ בנקודות. סביבה סביב הגבול של cₙ: איברי cₙ אחרי N בתוכה מלאים, ומחוצה לה חלולים ומוקפים בטבעת. ${describe(s, an)} ${keys}, חץ למטה מצמצם את הסביבה. החלון הוא ראיה ולא הוכחה.`;
    if (s.mode === 'sandwich')
      return `איור חי: שלוש סדרות, ${an.formula}: התחתונה במשולשים קטנים כלפי מעלה, העליונה במשולשים קטנים כלפי מטה, והאמצעית בנקודות. סביבה סביב L: איברי האמצעית אחרי N בתוכה מלאים, ומחוצה לה חלולים ומוקפים בטבעת. ${describe(s, an)} ${keys}, חץ למטה מצמצם את הסביבה. החלון הוא ראיה ולא הוכחה.`;
    return `איור חי: איברי הסדרה ${an.formula} כנקודות מעל n. קו הגבול L = ${fmt(an.L)}, וסביבתו: המספרים שמרחקם ממנו קטן מ-ε = ${fmt(eps)}. קו אנכי מסמן את N = ${s.N}: איברים אחריו בתוך הסביבה מלאים, ואיברים אחריו מחוץ לסביבה חלולים ומוקפים בטבעת. ${an.works ? `כרגע כל האיברים מ-N + 1 עד ${an.upTo} בתוך הסביבה.` : `כרגע ${an.bad.length} איברים אחרי N, עד ${an.upTo}, מחוץ לסביבה.`} גררו את קו ה-N; במקלדת: חץ ימינה ושמאלה מזיז את N, חץ למטה מצמצם את הסביבה.`;
  })();

  return (
    <SimShell
      fig={props.id}
      label={label}
      canvasRef={canvasRef}
      aspect={1.5}
      live={live}
      tasks={tasks}
      cursor="ew-resize"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onReset={() => {
        setS(fresh(props));
        stepKey.current = null;
        triedL.current = new Map();
        setLive('האיור אופס.');
      }}
      readout={readout()}
      controls={
        <>
          {offered.length > 1 && (
            <div class="group" role="group" aria-label={s.mode === 'combine' ? 'זוג הסדרות' : s.mode === 'sandwich' ? 'שלשת הסדרות' : 'הסדרה'}>
              {offered.map((id) => (
                <Toggle key={id} label={nameOf(s.mode, id)} on={s.seq === id} onChange={() => pickSeq(id)} />
              ))}
            </div>
          )}
          {modes.length > 1 && (
            <div class="group" role="group" aria-label="התצוגה">
              {modes.map((m) => (
                <Toggle key={m} label={MODE_NAME[m]} on={s.mode === m} onChange={() => pickMode(m)} />
              ))}
            </div>
          )}
          {ops.length > 1 && (
            <div class="group" role="group" aria-label="הפעולה">
              {ops.map((op) => (
                <Toggle key={op} label={`${OP_NAME[op]} ⁦${OP_EXPR[op]}⁩`} on={s.op === op} onChange={() => pickOp(op)} />
              ))}
            </div>
          )}
          {usesM ? mSlider : epsSlider}
          {nSlider}
          {showL && (
            <Slider label="הגבול המועמד L" value={s.L} min={lRange[0]} max={lRange[1]} step={lRange[2]} format={fmt} onChange={(v) => userSet({ L: snapTo(v, lRange) })} />
          )}
          <div class="group">
            <Toggle label={TOGGLE_LABEL[s.mode]} on={s.showMin} onChange={(on) => userSet({ showMin: on })} />
          </div>
        </>
      }
    />
  );
}
