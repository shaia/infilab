/**
 * Cobweb: lesson 2.7's figure. Mathematics: src/math/recursion.ts (every orbit, verdict and e-number comes from there;
 * the figure draws a finite window, which is evidence and never a proof, and the caption says so).
 *
 * Use:   <Spread figure={Cobweb} figureProps={{ map: 'sqrt2', maps: ['sqrt2', 'heron', 'double'], a1: 0, tasks: [...] }}>
 *        <Step fig="fig-2-7a" set={{ map: 'sqrt2', a1: 3 }}>
 * The canvas is math space (LTR, x grows to the right); Hebrew text stays outside the canvas.
 *
 * ---------------------------------------------------------------------------------------------------------------
 * PROPS (all optional except `id`, which the .astro wrapper takes from the Spread)
 *   id      figure id (task ids are stored as `${id}:${task}`)
 *   mode    'cobweb' (default) | 'e'
 *   map     the recursion of mode 'cobweb': 'sqrt2' √(2 + x) | 'heron' (x + 2/x)/2 | 'golden' 1 + 1/x | 'double' 2x |
 *           'logistic' x(2 − x). Default 'sqrt2'.
 *   maps    the maps offered as chips (none or one: no chips)
 *   a1      the first term (snapped to the map's slider grid, see MAPS[map].a1). Default: the map's start.
 *   n       mode 'cobweb': how many terms are drawn (3..30, default 10); mode 'e': the selected n (1..300, default 1)
 *   tasks   task ids (below)
 * STEP KEYS (`set={{…}}`): mode, map, a1, n.
 *
 * MODES
 *   cobweb  Upper panel: y = f(x) (--curve), the diagonal y = x (dashed), the fixed points of f on the diagonal as green
 *           rings (--limit: candidates for the limit, 2.7.3), and the cobweb a₁ → (a₁, a₂) → (a₂, a₂) → … with the terms
 *           as dots on the diagonal. Lower panel: the terms as points (n, aₙ), the fixed points as dashed green lines,
 *           and the window's largest (for a rising tail) or smallest (falling tail) term as a dashed ink line. A term
 *           outside the drawn range is clamped to the edge and drawn hollow. Readout: the first terms and the window's
 *           monotonicity verdict (`monotoneFrom`). Controls: map chips, the a₁ slider (also: click or drag in the upper
 *           panel, ← →), the number of terms (↑ ↓).
 *   e       eₙ = (1 + 1/n)ⁿ as filled dots and fₙ = (1 + 1/n)ⁿ⁺¹ as hollow squares over n, the line y = e (--limit),
 *           and at the selected n the interval (eₙ, fₙ) as a band: by 2.7.6 e lies in it. Readout: eₙ, fₙ, fₙ − eₙ.
 *
 * TASKS (ticked only by the learner's own move of the control the task is about, never by a text step, and never in
 * the exact state the last text step produced)
 *   sqrt-down    map sqrt2: a₁ moved to a value > 2 (the sequence then decreases to 2).
 *   heron-jump   map heron: a₁ moved below √2 (then a₂ > a₁, and the sequence decreases from n = 2).
 *   double-zero  map double: a₁ moved to 0, the only start from which 2x converges.
 *   e-three      mode e: n moved to 5, the smallest n with fₙ < 3 (so e < 3).
 *   e-digit      mode e: n moved to 74, the smallest n with 2.7 < eₙ and fₙ < 2.8 (so 2.7 < e < 2.8).
 *
 * Nothing moves by itself, so there is no animation for motionAllowed() to gate; the canvas loop honours it.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import {
  MAPS,
  a1At,
  a1Index,
  a1Positions,
  cobwebPath,
  eSeq,
  fSeq,
  firstN,
  monotoneFrom,
  orbit,
  squeezeN,
  type MapId,
} from '~/math/recursion';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo, type Palette } from './core/canvas';
import { withAlpha } from './core/ink';
import { drawAxes, drawCurve, insetBox, makePlot, type Box, type Plot } from './core/plot';
import SimShell, { Slider, Toggle, type TaskDef } from './core/SimShell';

type Mode = 'cobweb' | 'e';

const TASK_LABEL: Record<string, string> = {
  'sqrt-down': 'בכלל ⁦√(2 + x)⁩ מצאו a₁ שעבורו הסדרה יורדת.',
  'heron-jump': 'בשיטת הרון מצאו a₁ שעבורו ⁦a₂ > a₁⁩: הסדרה עולה בצעד הראשון, ויורדת מ-⁦n = 2⁩ והלאה.',
  'double-zero': 'בכלל ⁦2x⁩ מצאו את ה-a₁ היחיד שעבורו הסדרה מתכנסת.',
  'e-three': 'הזיזו את n אל ה-n הקטן ביותר שעבורו ⁦fₙ < 3⁩.',
  'e-digit': 'מצאו את ה-n הקטן ביותר שעבורו הקטע ⁦(eₙ, fₙ)⁩ כולו בתוך הקטע ⁦(2.7, 2.8)⁩.',
};

const K_MIN = 3;
const K_MAX = 30;
const E_MAX = 300;
const E_Y: [number, number] = [1.9, 3.5];
/** the e-mode task answers, from the module (recomputed, never typed in) */
const E_THREE = firstN((n) => fSeq(n) < 3, E_MAX);
const E_DIGIT = squeezeN(2.7, 2.8, E_MAX);

interface State {
  mode: Mode;
  map: MapId;
  /** the a₁ slider position (whole steps) */
  ai: number;
  /** cobweb: number of terms; e: the selected n */
  n: number;
}

export interface CobwebProps {
  id: string;
  mode?: Mode;
  map?: MapId;
  maps?: MapId[];
  a1?: number;
  n?: number;
  tasks?: string[];
}

const clampN = (mode: Mode, n: number) => (mode === 'e' ? Math.max(1, Math.min(E_MAX, Math.round(n))) : Math.max(K_MIN, Math.min(K_MAX, Math.round(n))));

function fresh(p: CobwebProps): State {
  const mode = p.mode ?? 'cobweb';
  const map = p.map ?? 'sqrt2';
  return { mode, map, ai: a1Index(map, p.a1 ?? MAPS[map].a1.start), n: clampN(mode, p.n ?? (mode === 'e' ? 1 : 10)) };
}

const same = (a: State | null, b: State) => !!a && a.mode === b.mode && a.map === b.map && a.ai === b.ai && a.n === b.n;

/** A number for the readout: a typographic minus, at most `d` decimals, trailing zeros dropped. */
function num(v: number, d = 4): string {
  if (!Number.isFinite(v)) return '∞';
  const t = Number(v.toFixed(d)).toString();
  return t.replace(/^-/, '−');
}

/** n in subscript digits: 12 → ₁₂ */
const sub = (n: number) => String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);

const VERDICT: Record<string, string> = {
  up: 'עולה',
  down: 'יורדת',
  flat: 'קבועה',
};

export default function Cobweb(props: CobwebProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const stepState = useRef<State | null>(null);
  const plotRef = useRef<Plot | null>(null);
  const dragging = useRef(false);
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));

  const m = MAPS[s.map];
  const a1 = a1At(s.map, s.ai);
  const terms = orbit(m.f, a1, s.n);
  const verdict = monotoneFrom(terms);

  /** the learner's own change: the only place a task can tick */
  const userSet = (patch: Partial<State>) => {
    const next = { ...s, ...patch };
    next.n = clampN(next.mode, next.n);
    setS(next);
    if (same(stepState.current, next)) return;
    const has = (t: string) => props.tasks?.includes(t);
    const v = a1At(next.map, next.ai);
    const movedA = patch.ai !== undefined;
    const movedN = patch.n !== undefined;
    if (next.mode === 'cobweb' && movedA) {
      if (has('sqrt-down') && next.map === 'sqrt2' && v > 2) markTask(`${props.id}:sqrt-down`);
      if (has('heron-jump') && next.map === 'heron' && v < Math.SQRT2) markTask(`${props.id}:heron-jump`);
      if (has('double-zero') && next.map === 'double' && v === 0) markTask(`${props.id}:double-zero`);
    }
    if (next.mode === 'e' && movedN) {
      if (has('e-three') && next.n === E_THREE) markTask(`${props.id}:e-three`);
      if (has('e-digit') && next.n === E_DIGIT) markTask(`${props.id}:e-digit`);
    }
  };

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = { ...prev };
          if (st.mode === 'cobweb' || st.mode === 'e') next.mode = st.mode;
          if (typeof st.map === 'string' && st.map in MAPS) {
            next.map = st.map as MapId;
            if (typeof st.a1 !== 'number') next.ai = a1Index(next.map, MAPS[next.map].a1.start);
          }
          if (typeof st.a1 === 'number') next.ai = a1Index(next.map, st.a1);
          if (typeof st.n === 'number') next.n = st.n;
          next.n = clampN(next.mode, next.n);
          stepState.current = next;
          return next;
        });
      }),
    [props.id],
  );

  // the screen-reader line, after the learner stops moving
  useEffect(() => {
    const id = setTimeout(() => setLive(s.mode === 'e' ? eText(s.n) : cobwebText(s.map, a1, terms, verdict)), 300);
    return () => clearTimeout(id);
  }, [s]);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const narrow = view.w < 420;
    if (s.mode === 'e') {
      const box = insetBox({ x: 0, y: 0, w: view.w, h: view.h }, { l: narrow ? 44 : 54, r: narrow ? 26 : 34, t: 22, b: 46 });
      drawE(ctx, box, p, s.n);
      plotRef.current = null;
      return;
    }
    const topH = Math.round(view.h * 0.6);
    const top = insetBox({ x: 0, y: 0, w: view.w, h: topH }, { l: narrow ? 40 : 50, r: 18, t: 14, b: 40 });
    const bottom = insetBox({ x: 0, y: topH, w: view.w, h: view.h - topH }, { l: narrow ? 40 : 50, r: 18, t: 10, b: 40 });
    plotRef.current = drawCobweb(ctx, top, p, s.map, terms);
    drawTerms(ctx, bottom, p, s.map, terms, s.n, verdict.kind);
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1.1, worldHeight: 1, animate: false });
  useEffect(invalidate, [s]);

  const aiFromPointer = (e: PointerEvent) => {
    const plot = plotRef.current;
    if (!plot || e.offsetY > plot.box.y + plot.box.h + 20) return null;
    const x = plot.x.min + ((e.offsetX - plot.box.x) / plot.box.w) * (plot.x.max - plot.x.min);
    return a1Index(s.map, x);
  };
  const onPointerDown = (e: PointerEvent) => {
    if (s.mode !== 'cobweb') return;
    const ai = aiFromPointer(e);
    if (ai === null) return;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (ai !== s.ai) userSet({ ai });
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging.current) return;
    const ai = aiFromPointer(e);
    if (ai !== null && ai !== s.ai) userSet({ ai });
  };
  const onPointerUp = () => {
    dragging.current = false;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    const dn = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0;
    if (!d && !dn) return;
    e.preventDefault();
    if (s.mode === 'e') userSet({ n: s.n + d + dn });
    else if (d) userSet({ ai: Math.max(0, Math.min(a1Positions(s.map) - 1, s.ai + d)) });
    else userSet({ n: s.n + dn });
  };

  const offered = props.maps ?? [];
  const label =
    s.mode === 'e'
      ? `איור חי: האיברים של eₙ = (1 + 1/n)ⁿ כנקודות מלאות ושל fₙ = (1 + 1/n)ⁿ⁺¹ כריבועים חלולים, מעל n. הקו הירוק הוא e. ${eText(s.n)} במקלדת: חצים משנים את n.`
      : `איור חי: דיאגרמת קורי עכביש של ${m.formula}. למעלה הגרף של f, הקו y = x, הנקודות הקבועות כטבעות ירוקות, והמסלול מ-a₁. למטה האיברים כנקודות מעל n. ${cobwebText(s.map, a1, terms, verdict)} במקלדת: חץ ימינה ושמאלה משנה את a₁, חץ למעלה ולמטה את מספר האיברים.`;

  return (
    <SimShell
      fig={props.id}
      label={label}
      canvasRef={canvasRef}
      aspect={1.1}
      live={live}
      tasks={tasks}
      cursor={s.mode === 'cobweb' ? 'ew-resize' : 'default'}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onReset={() => {
        setS(fresh(props));
        stepState.current = null;
        setLive('האיור אופס.');
      }}
      readout={s.mode === 'e' ? <EReadout n={s.n} /> : <CobwebReadout map={s.map} a1={a1} terms={terms} verdict={verdict} />}
      controls={
        s.mode === 'e' ? (
          <Slider label="n" value={s.n} min={1} max={E_MAX} step={1} format={(v) => String(Math.round(v))} onChange={(v) => userSet({ n: Math.round(v) })} />
        ) : (
          <>
            {offered.length > 1 && (
              <div class="group" role="group" aria-label="כלל הרקורסיה">
                {offered.map((id) => (
                  <Toggle key={id} label={MAPS[id].name} on={s.map === id} onChange={() => userSet({ map: id, ai: a1Index(id, MAPS[id].a1.start) })} />
                ))}
              </div>
            )}
            <Slider label="האיבר הראשון a₁" value={s.ai} min={0} max={a1Positions(s.map) - 1} step={1} format={(v) => num(a1At(s.map, Math.round(v)), 2)} onChange={(v) => userSet({ ai: Math.round(v) })} />
            <Slider label="מספר האיברים" value={s.n} min={K_MIN} max={K_MAX} step={1} format={(v) => String(Math.round(v))} onChange={(v) => userSet({ n: Math.round(v) })} />
          </>
        )
      }
    />
  );
}

/* ------------------------------------------------------------------ text */

function verdictText(v: ReturnType<typeof monotoneFrom>): string {
  if (v.kind === 'none' || v.from === null) return 'בחלון הסדרה אינה מונוטונית.';
  if (v.kind === 'flat') return v.from === 1 ? 'בחלון הסדרה קבועה.' : `בחלון הסדרה קבועה מ-n = ${v.from}.`;
  const word = VERDICT[v.kind] + (v.strict ? ' ממש' : '');
  return v.from === 1 ? `בחלון הסדרה ${word}.` : `בחלון הסדרה ${word} מ-n = ${v.from} והלאה.`;
}

function cobwebText(map: MapId, a1: number, terms: number[], v: ReturnType<typeof monotoneFrom>): string {
  const shown = terms.slice(0, 5).map((t, i) => `a${sub(i + 1)} = ${num(t)}`).join(', ');
  const stop = terms.length === 0 ? 'a₁ מחוץ לתחום של f.' : '';
  return `${MAPS[map].formula}, a₁ = ${num(a1, 2)}. ${stop}${shown}. ${verdictText(v)}`;
}

function eText(n: number): string {
  return `n = ${n}: eₙ = ${eSeq(n).toFixed(6)}, fₙ = ${fSeq(n).toFixed(6)}, ולכן e בין שניהם.`;
}

function CobwebReadout(p: { map: MapId; a1: number; terms: number[]; verdict: ReturnType<typeof monotoneFrom> }) {
  const m = MAPS[p.map];
  const last = p.terms[p.terms.length - 1];
  const outside = p.terms.some((t) => t < m.y[0] || t > m.y[1]);
  return (
    <>
      <span>
        <b class="q" data-readout="a1">
          <bdi dir="ltr">a₁ = {num(p.a1, 2)}</bdi>
        </b>
      </span>
      <span data-readout="terms">
        <bdi dir="ltr">{p.terms.slice(0, 5).map((t, i) => `a${sub(i + 1)} = ${num(t)}`).join(',  ')}</bdi>
        {p.terms.length > 5 && (
          <>
            {' '}
            … <bdi dir="ltr">a{sub(p.terms.length)} = {num(last)}</bdi>
          </>
        )}
      </span>
      <span data-readout="verdict">{p.terms.length === 0 ? 'a₁ מחוץ לתחום של f: אין סדרה.' : verdictText(p.verdict)}</span>
      <span data-readout="fixed">
        נקודות קבועות של f (מועמדות לגבול): <bdi dir="ltr">{m.fixed.map((x) => num(x)).join(', ')}</bdi>
        {outside && <> · יש איברים מחוץ לתחום הציור (מסומנים חלולים בשפה).</>}
      </span>
    </>
  );
}

function EReadout(p: { n: number }) {
  const e = eSeq(p.n);
  const f = fSeq(p.n);
  return (
    <>
      <span>
        <b class="q" data-readout="n">n = {p.n}</b>
      </span>
      <span data-readout="en">
        <bdi dir="ltr">eₙ = {e.toFixed(6)}</bdi>
      </span>
      <span data-readout="fn">
        <bdi dir="ltr">fₙ = {f.toFixed(6)}</bdi>
      </span>
      <span data-readout="gap">
        <bdi dir="ltr">fₙ − eₙ = eₙ/n = {(f - e).toFixed(6)}</bdi>
      </span>
      <span data-readout="verdict">
        לפי טענה 2.7.6: <bdi dir="ltr">{e.toFixed(6)} &lt; e &lt; {f.toFixed(6)}</bdi>
      </span>
    </>
  );
}

/* ------------------------------------------------------------------ drawing */

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, width = 2) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.stroke();
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

function hline(ctx: CanvasRenderingContext2D, plot: Plot, y: number, color: string, dash: number[], width = 1.4) {
  const sy = plot.py(y);
  if (sy < plot.box.y - 1 || sy > plot.box.y + plot.box.h + 1) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(plot.box.x, sy);
  ctx.lineTo(plot.box.x + plot.box.w, sy);
  ctx.stroke();
  ctx.restore();
}

function label(ctx: CanvasRenderingContext2D, p: Palette, text: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left') {
  ctx.save();
  ctx.font = `600 12px ${p.fontUi}`;
  ctx.direction = 'ltr';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawCobweb(ctx: CanvasRenderingContext2D, box: Box, p: Palette, map: MapId, terms: number[]): Plot {
  const m = MAPS[map];
  const plot = makePlot(box, { min: m.view[0], max: m.view[1], label: 'x' }, { min: m.view[0], max: m.view[1], label: 'y' });
  drawAxes(ctx, plot, p);
  // the diagonal y = x
  drawCurve(ctx, plot, (x) => x, { color: p.ink3, width: 1.4, dash: [6, 5], samples: 2 });
  // the graph of f
  drawCurve(ctx, plot, m.f, { color: p.curve, width: 2.4, samples: 400 });
  label(ctx, p, 'y = x', plot.px(m.view[1]) - 4, plot.py(m.view[1]) + 10, p.ink2, 'right');

  // the cobweb, clipped to the box
  const pts = cobwebPath(terms);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.strokeStyle = p.curve2;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(plot.px(x), plot.py(y)) : ctx.lineTo(plot.px(x), plot.py(y))));
  ctx.stroke();
  // the terms on the diagonal, the first one larger
  terms.forEach((t, i) => dot(ctx, plot.px(t), plot.py(t), i === 0 ? 5 : 3, p.curve2));
  ctx.restore();

  // the fixed points: green rings on the diagonal (a candidate, not yet a limit)
  for (const L of m.fixed) {
    const x = plot.px(L);
    const y = plot.py(L);
    if (x < box.x || x > box.x + box.w) continue;
    ring(ctx, x, y, 6.5, p.limit, 2.2);
    dot(ctx, x, y, 1.8, p.limit);
  }
  if (terms.length) label(ctx, p, 'a₁', plot.px(terms[0]) + 7, Math.min(box.y + box.h - 8, plot.py(terms[0]) + 12), p.curve2);
  return plot;
}

function drawTerms(ctx: CanvasRenderingContext2D, box: Box, p: Palette, map: MapId, terms: number[], K: number, trend: string) {
  const m = MAPS[map];
  const plot = makePlot(box, { min: 0, max: K + 1, label: 'n' }, { min: m.y[0], max: m.y[1], label: 'aₙ' });
  drawAxes(ctx, plot, p);
  for (const L of m.fixed) hline(ctx, plot, L, p.limit, [7, 4], 1.8);
  if (terms.length >= 3 && (trend === 'up' || trend === 'down')) {
    const ext = trend === 'up' ? Math.max(...terms) : Math.min(...terms);
    hline(ctx, plot, ext, p.ink2, [2, 4], 1.2);
    label(ctx, p, trend === 'up' ? 'max' : 'min', box.x + box.w - 2, plot.py(ext) - 8, p.ink2, 'right');
  }
  const r = Math.max(2.4, Math.min(5, (box.w / (K + 1)) * 0.28));
  terms.forEach((t, i) => {
    const x = plot.px(i + 1);
    const inside = t >= m.y[0] && t <= m.y[1];
    const y = Math.max(box.y, Math.min(box.y + box.h, plot.py(t)));
    if (inside) dot(ctx, x, y, r, p.curve);
    else {
      // outside the drawn range: clamped to the edge and hollow (shape, not only colour)
      ctx.save();
      ctx.fillStyle = p.paper;
      ctx.beginPath();
      ctx.arc(x, y, r + 0.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
      ring(ctx, x, y, r + 0.5, p.pointOut, 1.8);
    }
  });
}

function drawE(ctx: CanvasRenderingContext2D, box: Box, p: Palette, n: number) {
  const W = Math.min(E_MAX + 1, Math.max(12, Math.ceil(n * 1.3) + 2));
  const plot = makePlot(box, { min: 0, max: W, label: 'n' }, { min: E_Y[0], max: E_Y[1], label: '' });
  const e = eSeq(n);
  const f = fSeq(n);
  // the interval (eₙ, fₙ), where e must lie
  const yTop = Math.max(box.y, plot.py(f));
  const yBot = Math.min(box.y + box.h, plot.py(e));
  ctx.save();
  ctx.fillStyle = p.epsBand;
  ctx.fillRect(box.x, yTop, box.w, Math.max(0, yBot - yTop));
  ctx.restore();
  drawAxes(ctx, plot, p);
  hline(ctx, plot, Math.E, p.limit, [], 2);
  label(ctx, p, 'e', box.x + box.w + 6, plot.py(Math.E), p.limit);
  for (const y of [e, f]) hline(ctx, plot, y, p.eps, [5, 4], 1);

  const r = Math.max(1.6, Math.min(4.2, (box.w / W) * 0.3));
  for (let k = 1; k < W; k++) {
    const x = plot.px(k);
    const ek = eSeq(k);
    const fk = fSeq(k);
    const sel = k === n;
    const ey = plot.py(ek);
    if (ey >= box.y && ey <= box.y + box.h) dot(ctx, x, ey, sel ? r + 1.5 : r, p.curve);
    // fₙ: a hollow square, clamped to the top edge when it is above the drawn range
    const fy = Math.max(box.y, plot.py(fk));
    const h = sel ? r + 2 : r + 0.6;
    ctx.save();
    ctx.strokeStyle = p.curve2;
    ctx.lineWidth = sel ? 2 : 1.4;
    ctx.fillStyle = p.paper;
    ctx.fillRect(x - h, fy - h, 2 * h, 2 * h);
    ctx.strokeRect(x - h, fy - h, 2 * h, 2 * h);
    ctx.restore();
  }
  // the selected n
  const xn = plot.px(n);
  ctx.save();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(xn, box.y);
  ctx.lineTo(xn, box.y + box.h);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = withAlpha(p.ink, 1);
  ctx.font = `700 13px ${p.fontUi}`;
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`n = ${n}`, Math.min(xn + 5, box.x + box.w - 50), box.y - 4);
  ctx.restore();
}
