/**
 * Lesson 1.2's figure (fig-1-2a): what a map does to the order of two numbers. Two number lines (math space, LTR):
 * on the upper one the learner places a and b; the lower one shows their images f(a), f(b) under the map picked in
 * the panel, x ↦ x + c, x ↦ cx, x ↦ 1/x, x ↦ x² or x ↦ |x|. A dashed segment joins each number to its image: the
 * order is kept exactly when the two segments do not cross. a is a filled circle and b a filled square, on both
 * lines (shape, not only colour). The readout states the relation between f(a) and f(b) and the numbered result of
 * the lesson that predicts it from signs alone (`predictedEffect`).
 *
 * Props: id, op (the map shown first), ops (the maps offered; one or none: no picker), a, b, c, tasks.
 * Task ids:
 * - 'reverse-c'   the map x ↦ cx with a < b, the learner's own move of c makes ca > cb;
 * - 'recip-keep'  the map x ↦ 1/x with a < b, the learner's own move of a or b makes 1/a < 1/b;
 * - 'square-flip' the map x ↦ x² with a < b, the learner's own move of a or b makes a² > b².
 * A task never ticks in the exact state the last text step produced (a step that shows the answer does not count).
 *
 * Numbers come from src/math/order.ts; a, b and c move on a grid of halves, where every comparison is exact.
 * Motion: switching the map slides the images from their old places to the new ones, only when motionAllowed().
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import { fmtValue, orderEffect, predictedEffect, type Effect, type OrderOp } from '~/math/order';
import { markTask } from '~/progress/store';
import { motionAllowed } from '~/progress/settings';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo, type Palette } from './core/canvas';
import SimShell, { Slider, Toggle, type TaskDef } from './core/SimShell';

type Handle = 'a' | 'b' | 'c';

const TASK_LABEL: Record<string, string> = {
  'reverse-c': 'בפעולה ⁦x ↦ cx⁩, עם a < b, הזיזו את c עד שהסדר של התמונות מתהפך: ca > cb.',
  'recip-keep': 'בפעולה ⁦x ↦ 1/x⁩, מצאו a < b שבשבילם גם 1/a < 1/b.',
  'square-flip': 'בפעולה ⁦x ↦ x²⁩, מצאו a < b שבשבילם a² > b².',
};

const OP_LABEL: Record<OrderOp, string> = {
  add: 'x ↦ x + c',
  mul: 'x ↦ cx',
  recip: 'x ↦ 1/x',
  square: 'x ↦ x²',
  abs: 'x ↦ |x|',
};
/** f(a), f(b) as the readout writes them */
const IMG: Record<OrderOp, [string, string]> = {
  add: ['a + c', 'b + c'],
  mul: ['ca', 'cb'],
  recip: ['1/a', '1/b'],
  square: ['a²', 'b²'],
  abs: ['|a|', '|b|'],
};
/** the range of the lower line, per map (it holds every image of the grid) */
const LOWER: Record<OrderOp, [number, number]> = {
  add: [-7.5, 7.5],
  mul: [-12.5, 12.5],
  recip: [-2.5, 2.5],
  square: [-0.5, 16.5],
  abs: [-4.5, 4.5],
};
const UPPER: [number, number] = [-4.5, 4.5];
const RANGE_AB: [number, number] = [-4, 4];
const RANGE_C: [number, number] = [-3, 3];
const USES_C = (op: OrderOp) => op === 'add' || op === 'mul';
const REASON_TEXT: Record<string, string> = {
  '(ס3)': 'אקסיומה (ס3)',
  '(ס4)': 'אקסיומה (ס4)',
  '1.1.7': 'טענה 1.1.7',
  '1.2.4(א)': 'טענה 1.2.4(א)',
  '1.2.7(ב)': 'טענה 1.2.7(ב)',
  '1.2.7(ג)': 'טענה 1.2.7(ג)',
  '1.2.7(ד)': 'טענה 1.2.7(ד)',
  '1.2.8': 'טענה 1.2.8(ב) על |a| ו-|b|, כי x² = |x|²',
};

interface State {
  op: OrderOp;
  a: number;
  b: number;
  c: number;
  active: Handle;
}

export interface OrderLineProps {
  id: string;
  op?: OrderOp;
  ops?: OrderOp[];
  a?: number;
  b?: number;
  c?: number;
  tasks?: string[];
}

const snap = (v: number) => Math.round(v * 2) / 2;
const clamp = (v: number, [lo, hi]: [number, number]) => Math.max(lo, Math.min(hi, v));
const fmt = (v: number) => String(Number(v.toFixed(4))).replace(/^-/, '−');

function fresh(p: OrderLineProps): State {
  return { op: p.op ?? 'mul', a: p.a ?? -1, b: p.b ?? 2, c: p.c ?? 2, active: 'a' };
}

const taskKey = (s: State) => `${s.op}|${s.a}|${s.b}|${s.c}`;

/** The verdict in words. */
function verdict(s: State): { effect: Effect | 'unordered'; text: string } {
  if (!(s.a < s.b)) return { effect: 'unordered', text: s.a === s.b ? 'a = b: בחרו שני מספרים שונים, a < b' : 'a > b: הזיזו את a שמאלה מ-b' };
  const r = orderEffect(s.op, s.a, s.b, s.c);
  const [fa, fb] = IMG[s.op];
  const reason = REASON_TEXT[predictedEffect(s.op, s.a, s.b, s.c).reason];
  const why = reason ? ` (לפי ${reason})` : '';
  if (r.effect === 'undefined') return { effect: r.effect, text: 'אחד המספרים הוא 0, ול-0 אין הופכי (טענה 1.1.7)' };
  if (r.effect === 'kept') return { effect: r.effect, text: `✓ הסדר נשמר: ${fa} < ${fb}${why}` };
  if (r.effect === 'reversed') return { effect: r.effect, text: `⇄ הסדר מתהפך: ${fa} > ${fb}${why}` };
  return { effect: r.effect, text: `= התמונות שוות: ${fa} = ${fb}` };
}

export default function OrderLine(props: OrderLineProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));
  const dragging = useRef<Handle | null>(null);
  const geo = useRef<{ wx: (sx: number) => number; ya: number; xa: number; xb: number } | null>(null);
  const stepKey = useRef<string | null>(null);
  /** the images' screen positions at the last frame, and a running slide between two maps */
  const lastPx = useRef<{ op: OrderOp; pa: number | null; pb: number | null } | null>(null);
  const slide = useRef<{ fromA: number | null; fromB: number | null; t0: number } | null>(null);

  /** The learner's own change: the only path that can tick a task. */
  const userSet = (patch: Partial<State>) => {
    const next = { ...s, ...patch };
    setS(next);
    if (taskKey(next) === stepKey.current || !(next.a < next.b)) return;
    const has = (t: string) => props.tasks?.includes(t);
    const moved = (...k: (keyof State)[]) => k.some((key) => patch[key] !== undefined && patch[key] !== s[key]);
    const eff = orderEffect(next.op, next.a, next.b, next.c).effect;
    if (has('reverse-c') && next.op === 'mul' && moved('c') && eff === 'reversed') markTask(`${props.id}:reverse-c`);
    if (has('recip-keep') && next.op === 'recip' && moved('a', 'b') && eff === 'kept') markTask(`${props.id}:recip-keep`);
    if (has('square-flip') && next.op === 'square' && moved('a', 'b') && eff === 'reversed') markTask(`${props.id}:square-flip`);
  };

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = { ...prev };
          if (typeof st.op === 'string' && st.op in OP_LABEL) next.op = st.op as OrderOp;
          for (const k of ['a', 'b', 'c'] as const) if (typeof st[k] === 'number') next[k] = st[k] as number;
          if (next.active === 'c' && !USES_C(next.op)) next.active = 'a';
          stepKey.current = taskKey(next);
          return next;
        });
      }),
    [props.id],
  );

  const describe = (st: State): string => {
    const ra = orderEffect(st.op, st.a, st.b, st.c);
    const [fa, fb] = IMG[st.op];
    const cText = USES_C(st.op) ? `, c = ${fmt(st.c)}` : '';
    return `הפעולה ${OP_LABEL[st.op]}${cText}. a = ${fmt(st.a)}, b = ${fmt(st.b)}; ${fa} = ${fmtValue(st.op, st.a, ra.fa)}, ${fb} = ${fmtValue(st.op, st.b, ra.fb)}. ${verdict(st).text}.`;
  };

  useEffect(() => {
    const id = setTimeout(() => setLive(describe(s)), 300);
    return () => clearTimeout(id);
  }, [s]);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const narrow = view.w < 440;
    const left = narrow ? 22 : 34;
    const right = narrow ? 18 : 28;
    const W = view.w - left - right;
    const H = view.h;
    const yTop = Math.round(H * 0.3);
    const yBot = Math.round(H * 0.74);
    const lower = LOWER[s.op];
    const pxTop = (v: number) => left + ((v - UPPER[0]) / (UPPER[1] - UPPER[0])) * W;
    const pxBot = (v: number) => left + ((v - lower[0]) / (lower[1] - lower[0])) * W;
    const wx = (sx: number) => UPPER[0] + ((sx - left) / W) * (UPPER[1] - UPPER[0]);
    const font = (w: number, size: number) => `${w} ${size}px ${p.fontUi}`;

    numberLine(ctx, p, pxTop, yTop, UPPER, view.w, left, right, narrow);
    numberLine(ctx, p, pxBot, yBot, lower, view.w, left, right, narrow);
    // the names of the two lines, in the left margin above each line
    tag(ctx, p, 'x', left - 4, yTop - 40, font(700, 13));
    tag(ctx, p, `f(x), f: ${OP_LABEL[s.op]}${USES_C(s.op) ? `, c = ${fmt(s.c)}` : ''}`, left - 4, yBot - 40, font(600, 12));

    const r = orderEffect(s.op, s.a, s.b, s.c);
    const to = { a: r.fa === null ? null : pxBot(r.fa), b: r.fb === null ? null : pxBot(r.fb) };
    // a slide between two maps: from where the images were drawn to where they belong
    let shown = to;
    const sl = slide.current;
    if (sl) {
      const k = Math.min(1, (performance.now() - sl.t0) / 420);
      const e = 1 - (1 - k) ** 3;
      const mix = (from: number | null, target: number | null) => (from === null || target === null ? target : from + (target - from) * e);
      shown = { a: mix(sl.fromA, to.a), b: mix(sl.fromB, to.b) };
      if (k >= 1) slide.current = null;
    }
    lastPx.current = { op: s.op, pa: shown.a, pb: shown.b };

    // the connectors: each number to its image; they cross exactly when the order is reversed
    for (const [v, img, col] of [[s.a, shown.a, p.curve], [s.b, shown.b, p.curve2]] as const) {
      if (img === null) continue;
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(pxTop(v), yTop + 8);
      ctx.lineTo(img, yBot - 8);
      ctx.stroke();
      ctx.restore();
    }
    // the points: a a disc, b a square, on both lines
    marker(ctx, 'disc', pxTop(s.a), yTop, p.curve, p.paper);
    marker(ctx, 'square', pxTop(s.b), yTop, p.curve2, p.paper);
    label(ctx, 'a', pxTop(s.a), yTop - 18, p.curve, font(700, 13));
    label(ctx, 'b', pxTop(s.b), yTop - 18, p.curve2, font(700, 13));
    const [fa, fb] = IMG[s.op];
    const same = shown.a !== null && shown.b !== null && Math.abs(shown.a - shown.b) < 1;
    if (shown.a !== null) {
      marker(ctx, 'disc', shown.a, yBot, p.curve, p.paper);
      label(ctx, fa, shown.a, yBot + (same ? 48 : 30), p.curve, font(700, 13));
    }
    if (shown.b !== null) {
      marker(ctx, 'square', shown.b, yBot, p.curve2, p.paper);
      label(ctx, fb, shown.b, yBot + 30, p.curve2, font(700, 13));
    }
    // 1/0: a hollow ring with a cross where the image would be, never a point
    for (const [img, v] of [[r.fa, s.a], [r.fb, s.b]] as const) {
      if (img !== null) continue;
      ctx.save();
      ctx.strokeStyle = p.pointOut;
      ctx.lineWidth = 2;
      const x = pxTop(v);
      ctx.beginPath();
      ctx.arc(x, yTop, 12, 0, 2 * Math.PI);
      ctx.moveTo(x - 8, yTop - 8);
      ctx.lineTo(x + 8, yTop + 8);
      ctx.stroke();
      ctx.restore();
    }
    geo.current = { wx, ya: yTop, xa: pxTop(s.a), xb: pxTop(s.b) };
    // the active handle: a dashed ring, so a keyboard user sees what the arrows move
    if (s.active !== 'c') {
      ctx.save();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(s.active === 'a' ? pxTop(s.a) : pxTop(s.b), yTop, 15, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1.6, worldHeight: 1, animate: false });
  useEffect(invalidate, [s]);

  // switching the map: slide the images (still mode: jump)
  const prevOp = useRef(s.op);
  useEffect(() => {
    if (prevOp.current === s.op) return;
    prevOp.current = s.op;
    const last = lastPx.current;
    if (!motionAllowed() || !last) return;
    slide.current = { fromA: last.pa, fromB: last.pb, t0: performance.now() };
    let raf = 0;
    const tick = () => {
      invalidate();
      if (slide.current) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [s.op]);

  const moveTo = (h: 'a' | 'b', v: number) => userSet({ [h]: clamp(snap(v), RANGE_AB), active: h } as Partial<State>);

  const onPointerDown = (e: PointerEvent) => {
    const g = geo.current;
    if (!g) return;
    // the nearer of a and b follows the pointer
    const h: 'a' | 'b' = Math.abs(e.offsetX - g.xa) <= Math.abs(e.offsetX - g.xb) ? 'a' : 'b';
    dragging.current = h;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    moveTo(h, g.wx(e.offsetX));
  };
  const onPointerMove = (e: PointerEvent) => {
    const g = geo.current;
    const h = dragging.current;
    if (!g || !h || h === 'c') return;
    moveTo(h, g.wx(e.offsetX));
  };
  const onPointerUp = () => {
    dragging.current = null;
  };
  const handles = (op: OrderOp): Handle[] => (USES_C(op) ? ['a', 'b', 'c'] : ['a', 'b']);
  const HANDLE_NAME: Record<Handle, string> = { a: 'a', b: 'b', c: 'c' };
  const onKeyDown = (e: KeyboardEvent) => {
    const hs = handles(s.op);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 0.5 : -0.5;
      if (s.active === 'c') userSet({ c: clamp(s.c + d, RANGE_C) });
      else moveTo(s.active, s[s.active] + d);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const i = Math.max(0, hs.indexOf(s.active));
      const next = hs[(i + (e.key === 'ArrowDown' ? 1 : hs.length - 1)) % hs.length];
      setS({ ...s, active: next });
      setLive(`החצים ימינה ושמאלה מזיזים עכשיו את ${HANDLE_NAME[next]}.`);
    }
  };

  const offered = props.ops ?? [];
  const v = verdict(s);
  const r = orderEffect(s.op, s.a, s.b, s.c);
  const [fa, fb] = IMG[s.op];

  return (
    <SimShell
      fig={props.id}
      label={`איור חי: שני ישרי מספרים. על העליון a ו-b, על התחתון התמונות שלהם תחת הפעולה ${OP_LABEL[s.op]}. ${describe(s)} גררו את a ואת b; במקלדת: חץ ימינה ושמאלה מזיז את הנקודה המסומנת, חץ למעלה ולמטה בוחר נקודה אחרת.`}
      canvasRef={canvasRef}
      aspect={1.6}
      live={live}
      tasks={tasks}
      cursor="ew-resize"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onReset={() => {
        setS(fresh(props));
        setLive('האיור אופס.');
      }}
      readout={
        <>
          <span data-readout="pair">
            <b class="q">
              a = {fmt(s.a)}, b = {fmt(s.b)}
            </b>
            {'; '}
            <b class="q">
              {fa} = {fmtValue(s.op, s.a, r.fa)}, {fb} = {fmtValue(s.op, s.b, r.fb)}
            </b>
          </span>
          <span data-readout="verdict" data-effect={v.effect}>
            {v.text}
          </span>
        </>
      }
      controls={
        <>
          {offered.length > 1 && (
            <div class="group" role="group" aria-label="הפעולה">
              {offered.map((op) => (
                <Toggle
                  key={op}
                  label={<bdi dir="ltr">{OP_LABEL[op]}</bdi>}
                  on={s.op === op}
                  onChange={() => setS({ ...s, op, active: !USES_C(op) && s.active === 'c' ? 'a' : s.active })}
                />
              ))}
            </div>
          )}
          <Slider label="a" value={s.a} min={RANGE_AB[0]} max={RANGE_AB[1]} step={0.5} format={fmt} onChange={(x) => moveTo('a', x)} />
          <Slider label="b" value={s.b} min={RANGE_AB[0]} max={RANGE_AB[1]} step={0.5} format={fmt} onChange={(x) => moveTo('b', x)} />
          {USES_C(s.op) && (
            <Slider label="c" value={s.c} min={RANGE_C[0]} max={RANGE_C[1]} step={0.5} format={fmt} onChange={(x) => userSet({ c: snap(x), active: 'c' })} />
          )}
        </>
      }
    />
  );
}

/* ---- drawing helpers (canvas is math space: LTR, x grows to the right) ---- */

function numberLine(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  px: (v: number) => number,
  y: number,
  [v0, v1]: [number, number],
  w: number,
  left: number,
  right: number,
  narrow: boolean,
) {
  const width = v1 - v0;
  const tick = width > 20 ? 2 : width > 6 ? 1 : 0.5;
  const every = width > 20 ? (narrow ? 8 : 4) : width > 10 ? (narrow ? 4 : 2) : width > 6 ? (narrow ? 2 : 1) : 1;
  ctx.save();
  ctx.strokeStyle = p.ink2;
  ctx.fillStyle = p.ink2;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left - 10, y);
  ctx.lineTo(w - right + 8, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w - right + 12, y);
  ctx.lineTo(w - right + 4, y - 4);
  ctx.lineTo(w - right + 4, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.font = `11px ${p.fontUi}`;
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let k = Math.ceil(v0 / tick) * tick; k <= v1 + 1e-9; k += tick) {
    const sx = px(k);
    const isZero = Math.abs(k) < 1e-9;
    ctx.beginPath();
    ctx.moveTo(sx, y - (isZero ? 6 : 4));
    ctx.lineTo(sx, y + (isZero ? 6 : 4));
    ctx.stroke();
    const lab = Math.abs(k / every - Math.round(k / every)) < 1e-9;
    if (lab) ctx.fillText(String(Number(k.toFixed(2))).replace(/^-/, '−'), sx, y + 8);
  }
  ctx.restore();
}

function marker(ctx: CanvasRenderingContext2D, shape: 'disc' | 'square', x: number, y: number, color: string, edge: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (shape === 'disc') ctx.arc(x, y, 7, 0, 2 * Math.PI);
  else ctx.rect(x - 6.5, y - 6.5, 13, 13);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  const cw = ctx.canvas.clientWidth;
  ctx.fillText(text, Math.max(w / 2 + 4, Math.min(cw - w / 2 - 4, x)), y);
  ctx.restore();
}

function tag(ctx: CanvasRenderingContext2D, p: Palette, text: string, x: number, y: number, font: string) {
  ctx.save();
  ctx.fillStyle = p.ink2;
  ctx.font = font;
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, Math.max(4, x), y);
  ctx.restore();
}
