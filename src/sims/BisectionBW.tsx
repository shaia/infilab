/**
 * BisectionBW: lesson 2.9's figure, the bisection proof of the Bolzano–Weierstrass theorem (משפט 2.9.8) played by
 * hand. The terms of a bounded sequence are points (n, aₙ) on a graph; beside it a vertical number line on the same
 * value scale shows the nested intervals I₀ ⊇ I₁ ⊇ … ⊇ I_k. Each move halves I_k into two closed halves and keeps the
 * one the student picks. For each half the readout gives the window's evidence for "infinitely many terms": how many
 * n ≤ 100 000 have aₙ in it, and how many of those lie in the second half of the window (none: it looks finite). The
 * indices of the proof, n₁ < n₂ < … with a_{n_k} ∈ I_k (each the smallest admissible), are drawn as squares.
 * Mathematics: src/math/bisection.ts. The figure counts on a window; it proves nothing, and the caption says so.
 *
 * Use:   <Spread figure={BisectionBW} figureProps={{ preset: 'alt-recip', presets: ['alt-recip', 'mod3', 'frac-sqrt2'],
 *                                                    tasks: ['toward-minus-one', 'finite-half', 'aim-dense'] }}>
 *        <Step fig="fig-2-9a" set={{ preset: 'alt-recip', path: '01', showPeaks: false }}>
 *
 * PROPS (all optional except `id`, which the .astro wrapper takes from the Spread)
 *   preset     'alt-recip' ((−1)ⁿ + 1/n, I₀ = [−2, 2]) | 'frac-sqrt2' (n√2 − ⌊n√2⌋, I₀ = [0, 1]) |
 *              'mod3' (the remainder of n on division by 3, I₀ = [0, 2]). Default 'alt-recip'.
 *   presets    the presets offered as chips (none or one: no chips).
 *   path       the choices already made, a string of '0' (lower half) and '1' (upper half), at most 10 long.
 *   showPeaks  mark the peaks of lemma 2.9.9 (places m with a_m ≥ aₙ for all later n in the window) with a triangle.
 *   tasks      task ids below.
 * STEP KEYS   preset, path, showPeaks (as the props).
 * TASKS (each ticks only on the student's own choice of a half, never on a state a text step set; a path a step set
 *        counts as not the student's: `fromStep` is the length of the path prefix that came from a step)
 *   toward-minus-one  preset alt-recip, every choice the student's own, depth ≥ 6 (length ≤ 1/16) and −1 ∈ I_k.
 *   finite-half       the student keeps a half that holds terms of the window but none in its second half
 *                     ("looks finite"); the proof cannot go on from it, and the readout says so.
 *   aim-dense         preset frac-sqrt2, every choice the student's own, depth ≥ 5 (length ≤ 1/32) and 0.7 ∈ I_k.
 * Nothing moves: there is no animation for motionAllowed() to gate; the canvas loop (useFigureCanvas) honours it.
 * Colours: the kept interval is a band in value space around the coming partial limit, drawn in the ε colours; terms
 * inside it are filled (--point-in), outside hollow (--point-out); the chosen terms a_{n_k} are squares (--curve-2).
 */

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  K_MAX,
  PRESETS,
  WINDOW,
  countIn,
  halves,
  inInterval,
  intervalsOf,
  lengthOf,
  looksInfinite,
  pickIndices,
  termsOf,
  validPath,
  windowPeaks,
  type BisectionId,
  type Count,
  type Interval,
} from '~/math/bisection';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo } from './core/canvas';
import { withAlpha } from './core/ink';
import { drawAxes, insetBox, makePlot, type Plot } from './core/plot';
import SimShell, { Toggle, type TaskDef } from './core/SimShell';

const TASK_LABEL: Record<string, string> = {
  'toward-minus-one': 'בסדרה ⁦(−1)ⁿ + 1/n⁩, מהקטע ⁦[−2, 2]⁩, בחרו בעצמכם חצאים עד קטע באורך ⁦1/16⁩ לכל היותר שמכיל את ⁦−1⁩.',
  'finite-half': 'בחרו חצי שיש בו איברים בחלון, אבל אף אחד מהם לא בחצי השני של החלון: נראה שיש בו רק מספר סופי של איברים.',
  'aim-dense': 'בסדרה של החלק השברי של ⁦n√2⁩, בחרו בעצמכם חמישה חצאים לפחות כך שהקטע עדיין מכיל את ⁦0.7⁩.',
};

/** the terms drawn on the graph: at least this many, more when a chosen index lies further */
const DRAW_MIN = 60;
const DRAW_MAX = 400;

interface State {
  preset: BisectionId;
  path: string;
  /** how many leading choices of `path` a text step made (they are not the student's) */
  fromStep: number;
  showPeaks: boolean;
}

export interface BisectionBWProps {
  id: string;
  preset?: BisectionId;
  presets?: BisectionId[];
  path?: string;
  showPeaks?: boolean;
  tasks?: string[];
}

function fresh(p: BisectionBWProps): State {
  const path = p.path && validPath(p.path) ? p.path : '';
  return { preset: p.preset ?? 'alt-recip', path, fromStep: path.length, showPeaks: p.showPeaks ?? false };
}

/** a typographic minus sign; dyadic endpoints print exactly */
const num = (v: number) => String(v).replace(/^-/, '−');
/** An interval as LTR-isolated text (LRI … PDI): bare in RTL prose, "[−2, 2]" renders as "[2 ,2−]". */
const iv = (I: Interval) => `⁦[${num(I.lo)}, ${num(I.hi)}]⁩`;
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = (k: number) => String(k).split('').map((d) => SUB[Number(d)]).join('');

export default function BisectionBW(props: BisectionBWProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));
  const plotRef = useRef<Plot | null>(null);

  const preset = PRESETS[s.preset];
  const terms = termsOf(s.preset);
  const Is = useMemo(() => intervalsOf(preset.I0, s.path), [s.preset, s.path]);
  const k = s.path.length;
  const Ik = Is[k];
  const [lower, upper] = halves(Ik);
  const counts = useMemo(() => [countIn(terms, lower), countIn(terms, upper)] as [Count, Count], [s.preset, s.path]);
  const current = useMemo(() => countIn(terms, Ik), [s.preset, s.path]);
  const ns = useMemo(() => pickIndices(terms, Is), [s.preset, s.path]);
  const lastN = ns.filter((n): n is number => n !== null).at(-1) ?? 0;
  const drawn = Math.min(DRAW_MAX, Math.max(DRAW_MIN, Math.ceil(lastN * 1.15) + 2));
  const peaks = useMemo(() => (s.showPeaks ? windowPeaks(terms, DRAW_MAX) : null), [s.preset, s.showPeaks]);
  const stuck = !looksInfinite(current);

  /** The student's own change. Tasks tick here only, and only on a choice of a half (see the header). */
  const userSet = (patch: Partial<State>, chose = false) => {
    const next = { ...s, ...patch };
    next.fromStep = Math.min(next.fromStep, next.path.length);
    setS(next);
    if (!chose) return;
    const has = (t: string) => props.tasks?.includes(t);
    const p = PRESETS[next.preset];
    const t = termsOf(next.preset);
    const I = intervalsOf(p.I0, next.path).at(-1)!;
    const own = next.fromStep === 0;
    const depth = next.path.length;
    if (has('toward-minus-one') && own && next.preset === 'alt-recip' && depth >= 6 && inInterval(-1, I)) markTask(`${props.id}:toward-minus-one`);
    const c = countIn(t, I);
    if (has('finite-half') && c.total > 0 && !looksInfinite(c)) markTask(`${props.id}:finite-half`);
    if (has('aim-dense') && own && next.preset === 'frac-sqrt2' && depth >= 5 && inInterval(0.7, I)) markTask(`${props.id}:aim-dense`);
  };

  const choose = (half: 0 | 1) => {
    if (s.path.length >= K_MAX) return;
    userSet({ path: s.path + String(half) }, true);
  };
  const undo = () => userSet({ path: s.path.slice(0, -1) });
  const pickPreset = (id: BisectionId) => userSet({ preset: id, path: '', fromStep: 0 });

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = { ...prev };
          if (typeof st.preset === 'string' && st.preset in PRESETS) next.preset = st.preset as BisectionId;
          if (typeof st.path === 'string' && validPath(st.path)) next.path = st.path;
          else if (typeof st.preset === 'string') next.path = '';
          next.fromStep = next.path.length;
          if (typeof st.showPeaks === 'boolean') next.showPeaks = st.showPeaks;
          return next;
        });
      }),
    [props.id],
  );

  const halfText = (name: string, I: Interval, c: Count) =>
    `${name} ${iv(I)}: ${c.total} איברים עד n = ${WINDOW}, מהם ${c.late} אחרי n = ${WINDOW / 2}${looksInfinite(c) ? '' : c.last === null ? ', אין בו אף איבר' : `, האחרון ב-n = ${c.last}`}.`;

  useEffect(() => {
    const id = setTimeout(() => {
      const parts = [`${preset.formula}. הקטע הנוכחי ${iv(Ik)} אחרי ${k} חציות.`];
      parts.push(halfText('החצי התחתון', lower, counts[0]), halfText('החצי העליון', upper, counts[1]));
      if (k > 0) parts.push(`האינדקסים שנבחרו: ${ns.map((n) => (n === null ? 'אין' : String(n))).join(', ')}.`);
      setLive(parts.join(' '));
    }, 300);
    return () => clearTimeout(id);
  }, [s]);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const narrow = view.w < 420;
    const stripW = narrow ? 70 : 104;
    const outer = { x: 0, y: 0, w: view.w - stripW, h: view.h };
    const box = insetBox(outer, { l: narrow ? 46 : 56, r: 8, t: 18, b: 46 });
    const plot = makePlot(box, { min: 0, max: drawn + 1, label: 'n' }, { min: preset.y[0], max: preset.y[1], label: 'aₙ' });
    plotRef.current = plot;

    // the kept interval I_k as a band across the graph
    const yTop = plot.py(Ik.hi);
    const yBot = plot.py(Ik.lo);
    ctx.save();
    ctx.fillStyle = p.epsBand;
    ctx.fillRect(box.x, yTop, box.w, yBot - yTop);
    ctx.strokeStyle = p.eps;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 4]);
    for (const y of [yTop, yBot]) {
      ctx.beginPath();
      ctx.moveTo(box.x, y);
      ctx.lineTo(box.x + box.w, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // the midpoint: where the next halving cuts
    ctx.strokeStyle = withAlpha(p.eps, 0.7);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    const yMid = plot.py((Ik.lo + Ik.hi) / 2);
    ctx.beginPath();
    ctx.moveTo(box.x, yMid);
    ctx.lineTo(box.x + box.w, yMid);
    ctx.stroke();
    ctx.restore();

    drawAxes(ctx, plot, p);

    // the terms: inside I_k filled, outside hollow (shape, not only colour)
    const r = Math.max(1.6, Math.min(4.2, (box.w / drawn) * 0.32));
    const chosen = new Set(ns.filter((n): n is number => n !== null));
    for (let n = 1; n <= drawn; n++) {
      const v = terms[n];
      const x = plot.px(n);
      const y = plot.py(v);
      ctx.save();
      if (inInterval(v, Ik)) {
        ctx.fillStyle = p.pointIn;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        ctx.fillStyle = p.paper;
        ctx.strokeStyle = p.pointOut;
        ctx.lineWidth = Math.max(1.2, r * 0.4);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
      if (peaks?.[n]) {
        ctx.fillStyle = p.ink;
        ctx.beginPath();
        ctx.moveTo(x, y - r - 9);
        ctx.lineTo(x - 4, y - r - 3);
        ctx.lineTo(x + 4, y - r - 3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    // the chosen terms a_{n_k}: squares with their k
    ctx.save();
    ctx.font = `600 11px ${p.fontUi}`;
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ns.forEach((n, i) => {
      if (n === null || n > drawn) return;
      const x = plot.px(n);
      const y = plot.py(terms[n]);
      const h = r + 3;
      ctx.strokeStyle = p.curve2;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - h, y - h, 2 * h, 2 * h);
      if (chosen.size <= 12) {
        ctx.fillStyle = p.curve2;
        ctx.fillText(`n${sub(i + 1)}`, x, y - h - 2);
      }
    });
    ctx.restore();

    // the number line strip: I₀ ⊇ I₁ ⊇ … ⊇ I_k as bars stepping right, on the graph's value scale
    const sx0 = box.x + box.w + 18;
    const sw = view.w - sx0 - 6;
    ctx.save();
    ctx.strokeStyle = p.ink2;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx0, box.y);
    ctx.lineTo(sx0, box.y + box.h);
    ctx.stroke();
    const step = Math.max(3, Math.min(9, (sw - 16) / (K_MAX + 1)));
    Is.forEach((I, j) => {
      const x = sx0 + 6 + j * step;
      const last = j === Is.length - 1;
      ctx.strokeStyle = last ? p.eps : p.ink3;
      ctx.lineWidth = last ? 3 : 2;
      const a = plot.py(I.lo);
      const b = plot.py(I.hi);
      ctx.beginPath();
      ctx.moveTo(x, b);
      ctx.lineTo(x, a);
      ctx.stroke();
      // closed ends: short caps
      ctx.lineWidth = 1.4;
      for (const y of [a, b]) {
        ctx.beginPath();
        ctx.moveTo(x - 2.5, y);
        ctx.lineTo(x + 2.5, y);
        ctx.stroke();
      }
    });
    // the next halving: the two halves, filled when they look infinite, hollow when they look finite
    const hx = sx0 + 6 + (Is.length + 0.6) * step;
    [lower, upper].forEach((H, i) => {
      const a = plot.py(H.lo);
      const b = plot.py(H.hi);
      const inf = looksInfinite(counts[i]);
      const x = hx + i * 7;
      ctx.lineWidth = 3;
      ctx.strokeStyle = inf ? p.pointIn : p.pointOut;
      ctx.setLineDash(inf ? [] : [3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, b + 1);
      ctx.lineTo(x, a - 1);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1.5, worldHeight: 1, animate: false });
  useEffect(invalidate, [s]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      choose(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      choose(1);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (s.path.length > 0) undo();
    }
  };

  const offered = props.presets ?? [];
  const full = s.path.length >= K_MAX;
  const verdict = (c: Count) =>
    looksInfinite(c) ? (
      <>נראה אינסופי</>
    ) : c.last === null ? (
      <>אין בו אף איבר</>
    ) : (
      <>
        נראה סופי: האחרון ב-<b class="q" data-last>n = {c.last}</b>
      </>
    );
  return (
    <SimShell
      fig={props.id}
      label={`איור חי: איברי הסדרה ${preset.formula} כנקודות מעל n, ומימין ציר מספרים אנכי עם הקטעים המקוננים. הקטע הנוכחי ${iv(Ik)}, אחרי ${k} חציות, צבוע לרוחב הגרף; איברים בתוכו מלאים ואיברים מחוצה לו חלולים. האיברים שנבחרו לתת-הסדרה מסומנים בריבוע. בחצי התחתון ${counts[0].total} איברים עד n = ${WINDOW} ובחצי העליון ${counts[1].total}. במקלדת: חץ למטה שומר את החצי התחתון, חץ למעלה את העליון, מחיקה חוזרת צעד.`}
      canvasRef={canvasRef}
      aspect={1.5}
      live={live}
      tasks={tasks}
      onKeyDown={onKeyDown}
      onReset={() => {
        setS(fresh(props));
        setLive('האיור אופס.');
      }}
      readout={
        <>
          <span data-readout="interval">
            הקטע אחרי <b class="q">{k}</b> חציות: <b class="q">{iv(Ik)}</b>, באורך <b class="q">{num(lengthOf(Ik))}</b>
          </span>
          <span data-readout="lower">
            החצי התחתון <b class="q">{iv(lower)}</b>: <b class="q">{counts[0].total}</b> איברים עד <b class="q">n = {WINDOW}</b>, מהם <b class="q">{counts[0].late}</b> אחרי <b class="q">n = {WINDOW / 2}</b>. {verdict(counts[0])}.
          </span>
          <span data-readout="upper">
            החצי העליון <b class="q">{iv(upper)}</b>: <b class="q">{counts[1].total}</b> איברים עד <b class="q">n = {WINDOW}</b>, מהם <b class="q">{counts[1].late}</b> אחרי <b class="q">n = {WINDOW / 2}</b>. {verdict(counts[1])}.
          </span>
          {k > 0 && (
            <span data-readout="indices">
              האינדקסים שנבחרו: <b class="q">{ns.map((n) => (n === null ? '—' : String(n))).join(', ')}</b>
              {lastN > DRAW_MAX && <> (חלקם מימין לחלון המצויר)</>}
            </span>
          )}
          {k > 0 && stuck && (
            <span data-readout="stuck">
              בקטע הנוכחי אין אף איבר בחצי השני של החלון: נראה שיש בו רק מספר סופי של איברים, וההוכחה לא יכולה להמשיך ממנו. חזרו צעד ובחרו את החצי השני.
            </span>
          )}
        </>
      }
      controls={
        <>
          {offered.length > 1 && (
            <div class="group" role="group" aria-label="הסדרה">
              {offered.map((id) => (
                <Toggle key={id} label={PRESETS[id].name} on={s.preset === id} onChange={() => pickPreset(id)} />
              ))}
            </div>
          )}
          <div class="group" role="group" aria-label="חציה">
            <button type="button" class="toggle" data-action="lower" onClick={() => choose(0)} disabled={full}>
              שמרו את החצי התחתון {iv(lower)}
            </button>
            <button type="button" class="toggle" data-action="upper" onClick={() => choose(1)} disabled={full}>
              שמרו את החצי העליון {iv(upper)}
            </button>
            <button type="button" class="toggle" data-action="undo" onClick={undo} disabled={s.path.length === 0}>
              חזרה צעד אחד
            </button>
          </div>
          <div class="group">
            <Toggle label="הראו פסגות" on={s.showPeaks} onChange={(on) => userSet({ showPeaks: on })} />
          </div>
        </>
      }
    />
  );
}

