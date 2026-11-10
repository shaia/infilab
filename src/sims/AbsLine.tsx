/**
 * Lesson 0.9's figure: absolute value as distance on the number line. Four views of one line (math space, LTR):
 *
 * - `band`: the set {x : |x − a| ρ r} for ρ ∈ {<, ≤, >, ≥}, drawn in the ε-band colours (it is exactly the
 *   neighbourhood lesson 2.2 calls the ε-band), with a draggable centre a, a radius handle at a + r, and a test
 *   point x that is filled inside the set and hollow with a ring outside it (shape, not only colour). An open end
 *   is a hollow circle, a closed end a filled one.
 * - `triangle`: x and y as arrows, y drawn from the tip of x, and x + y from 0; below the line, |x| + |y| and
 *   |x + y| as bars from 0. The bars are equal exactly when x and y do not have opposite signs.
 * - `two`: the set {x : |x − a| + |x − b| ρ c}, the sum of the distances to two points, for ρ ∈ {<, ≤}.
 * - `means`: two numbers a, b ≥ 0 with their arithmetic mean (a + b)/2 and geometric mean √(ab).
 *
 * Every set and every number comes from src/math/absval.ts (`solveAbs`, `solveSumDist`, `triangle`, `means`), which
 * solves by cases with exact endpoints: the drawing shows the exact solution set, not a sampled one. Values move on
 * a grid of halves.
 *
 * Tasks are ticked only by the student's own move of the control the task is about, and never in the exact state
 * the last text step produced (a step that shows the answer does not count as finding it).
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import {
  REL_SIGN,
  contains,
  fmtNum,
  fmtSet,
  means,
  minSumDist,
  solveAbs,
  solveSumDist,
  triangle,
  type IntervalSet,
  type Rel,
} from '~/math/absval';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo, type Palette } from './core/canvas';
import SimShell, { Slider, Toggle, type TaskDef } from './core/SimShell';

export type AbsMode = 'band' | 'triangle' | 'two' | 'means';
type Handle = 'a' | 'r' | 'x' | 'y' | 'b';

const TASK_LABEL: Record<string, string> = {
  'centre-radius': 'בתצוגה "קטע סביב a", הזיזו את המרכז ואת הרדיוס כך שהקבוצה תהיה בדיוק הקטע הפתוח ⁦(−1, 5)⁩.',
  'equality-case': 'בתצוגה "אי-שוויון המשולש", הזיזו את x או את y, שניהם שונים מאפס, עד ששני הפסים שמתחת לישר שווים.',
  'two-distances': 'בתצוגה "סכום מרחקים", עם הסימן "<", הגדילו את c מאפס ועצרו ב-c הגדול ביותר שבשבילו הקבוצה עדיין ריקה.',
};

const MODE_NAME: Record<AbsMode, string> = {
  band: 'קטע סביב a',
  triangle: 'אי-שוויון המשולש',
  two: 'סכום מרחקים',
  means: 'ממוצעים',
};

const HANDLES: Record<AbsMode, Handle[]> = { band: ['x', 'a', 'r'], triangle: ['x', 'y'], two: ['x', 'a', 'b'], means: ['a', 'b'] };
const HANDLE_NAME: Record<Handle, string> = { a: 'a', r: 'הרדיוס r', x: 'x', y: 'y', b: 'b' };

/** the value range of each quantity, per mode (all on a grid of halves) */
const RANGE: Record<AbsMode, Partial<Record<'a' | 'r' | 'x' | 'y' | 'b' | 'c', [number, number]>>> = {
  band: { a: [-6, 6], r: [0, 6], x: [-8, 8] },
  triangle: { x: [-4, 4], y: [-4, 4] },
  two: { a: [-6, 6], b: [-6, 6], c: [0, 14], x: [-8, 8] },
  means: { a: [0, 8], b: [0, 8] },
};
const VIEW: Record<AbsMode, [number, number]> = { band: [-8, 8], triangle: [-8, 8], two: [-8, 8], means: [-0.5, 8.5] };

interface State {
  mode: AbsMode;
  a: number;
  r: number;
  rel: Rel;
  x: number;
  y: number;
  b: number;
  c: number;
  twoRel: '<' | '<=';
  active: Handle;
}

export interface AbsLineProps {
  id: string;
  mode?: AbsMode;
  /** the views offered in the picker (none or one: no picker) */
  modes?: AbsMode[];
  a?: number;
  r?: number;
  rel?: Rel;
  x?: number;
  y?: number;
  b?: number;
  c?: number;
  twoRel?: '<' | '<=';
  tasks?: string[];
}

const snap = (v: number) => Math.round(v * 2) / 2;
const clamp = (v: number, [lo, hi]: [number, number]) => Math.max(lo, Math.min(hi, v));
const RELS: Rel[] = ['<', '<=', '>', '>='];

/** default positions of each view, used by the props and when the student switches views */
const DEFAULTS: Record<AbsMode, Partial<State>> = {
  band: { a: 1, r: 2, rel: '<', x: 4 },
  triangle: { x: 3, y: -2 },
  two: { a: 2, b: -1, c: 5, x: 4, twoRel: '<' },
  means: { a: 1, b: 4 },
};

function fresh(p: AbsLineProps): State {
  const mode = p.mode ?? 'band';
  const d = DEFAULTS[mode];
  return {
    mode,
    a: p.a ?? d.a ?? 1,
    r: p.r ?? d.r ?? 2,
    rel: p.rel ?? d.rel ?? '<',
    x: p.x ?? d.x ?? 3,
    y: p.y ?? d.y ?? -2,
    b: p.b ?? d.b ?? -2,
    c: p.c ?? d.c ?? 5,
    twoRel: p.twoRel ?? d.twoRel ?? '<',
    active: HANDLES[mode][0],
  };
}

/** The solution set the view draws (band and two), or null. */
function setOf(s: State): IntervalSet | null {
  if (s.mode === 'band') return solveAbs(s.a, s.r, s.rel);
  if (s.mode === 'two') return solveSumDist(s.a, s.b, s.c, s.twoRel);
  return null;
}

/** The quantities a task looks at, as a string: the state a step produced is skipped exactly. */
const taskKey = (s: State) => `${s.mode}|${s.a}|${s.r}|${s.rel}|${s.x}|${s.y}|${s.b}|${s.c}|${s.twoRel}`;

export default function AbsLine(props: AbsLineProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));
  const dragging = useRef<Handle | null>(null);
  const geo = useRef<{ px: (v: number) => number; wx: (sx: number) => number; handles: { h: Handle; x: number; y: number }[] } | null>(null);
  /** the exact state the last text step produced: a task never ticks in it */
  const stepKey = useRef<string | null>(null);

  const S = setOf(s);

  /** The student's own change: the only path that can tick a task. */
  const userSet = (patch: Partial<State>) => {
    const next = { ...s, ...patch };
    setS(next);
    const has = (t: string) => props.tasks?.includes(t);
    if (taskKey(next) === stepKey.current) return;
    const moved = (...k: (keyof State)[]) => k.some((key) => patch[key] !== undefined && patch[key] !== s[key]);
    if (has('centre-radius') && next.mode === 'band' && moved('a', 'r', 'rel') && fmtSet(solveAbs(next.a, next.r, next.rel)) === '(−1, 5)')
      markTask(`${props.id}:centre-radius`);
    if (has('equality-case') && next.mode === 'triangle' && moved('x', 'y') && next.x !== 0 && next.y !== 0 && triangle(next.x, next.y).equal)
      markTask(`${props.id}:equality-case`);
    if (
      has('two-distances') &&
      next.mode === 'two' &&
      moved('c') &&
      next.twoRel === '<' &&
      next.a !== next.b &&
      next.c === minSumDist(next.a, next.b)
    )
      markTask(`${props.id}:two-distances`);
  };

  const pickMode = (mode: AbsMode) => {
    if (mode === s.mode) return;
    setS({ ...s, ...DEFAULTS[mode], mode, active: HANDLES[mode][0] });
  };

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = { ...prev };
          if (typeof st.mode === 'string' && st.mode in HANDLES) {
            next.mode = st.mode as AbsMode;
            if (!HANDLES[next.mode].includes(next.active)) next.active = HANDLES[next.mode][0];
          }
          for (const k of ['a', 'r', 'x', 'y', 'b', 'c'] as const) if (typeof st[k] === 'number') next[k] = st[k] as number;
          if (typeof st.rel === 'string' && RELS.includes(st.rel as Rel)) next.rel = st.rel as Rel;
          if (st.twoRel === '<' || st.twoRel === '<=') next.twoRel = st.twoRel;
          stepKey.current = taskKey(next);
          return next;
        });
      }),
    [props.id],
  );

  // the sentence a screen reader hears after a change
  const describe = (st: State): string => {
    if (st.mode === 'band') {
      const set = solveAbs(st.a, st.r, st.rel);
      const d = Math.abs(st.x - st.a);
      return `הקבוצה של כל x עם |x − ${fmtNum(st.a)}| ${REL_SIGN[st.rel]} ${fmtNum(st.r)} היא ${fmtSet(set)}. נקודת הבדיקה x = ${fmtNum(st.x)}, במרחק ${fmtNum(d)} מהמרכז, ${contains(set, st.x) ? 'בתוך הקבוצה' : 'מחוץ לקבוצה'}.`;
    }
    if (st.mode === 'triangle') {
      const t = triangle(st.x, st.y);
      return `x = ${fmtNum(st.x)}, y = ${fmtNum(st.y)}. |x + y| = ${fmtNum(t.lhs)} ו-|x| + |y| = ${fmtNum(t.rhs)}: ${t.equal ? 'שוויון' : 'אי-שוויון חזק'}.`;
    }
    if (st.mode === 'two') {
      const set = solveSumDist(st.a, st.b, st.c, st.twoRel);
      const sum = Math.abs(st.x - st.a) + Math.abs(st.x - st.b);
      return `הקבוצה של כל x עם |x − ${fmtNum(st.a)}| + |x − ${fmtNum(st.b)}| ${REL_SIGN[st.twoRel]} ${fmtNum(st.c)} היא ${fmtSet(set)}. ב-x = ${fmtNum(st.x)} סכום המרחקים ${fmtNum(sum)}.`;
    }
    const m = means(st.a, st.b);
    return `a = ${fmtNum(st.a)}, b = ${fmtNum(st.b)}. הממוצע החשבוני ${fmtNum(m.am)}, הממוצע ההנדסי ${gmText(m.gm)}.`;
  };

  useEffect(() => {
    const id = setTimeout(() => setLive(describe(s)), 300);
    return () => clearTimeout(id);
  }, [s]);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const narrow = view.w < 440;
    const left = narrow ? 18 : 28;
    const right = narrow ? 18 : 28;
    const [v0, v1] = VIEW[s.mode];
    const px = (v: number) => left + ((v - v0) / (v1 - v0)) * (view.w - left - right);
    const wx = (sx: number) => v0 + ((sx - left) / (view.w - left - right)) * (v1 - v0);
    const H = view.h;
    const lineY = Math.round(s.mode === 'triangle' ? H * 0.5 : H * 0.58);
    const handles: { h: Handle; x: number; y: number }[] = [];
    const font = (w: number, size: number) => `${w} ${size}px ${p.fontUi}`;

    drawLine(ctx, p, px, lineY, v0, v1, view.w, left, right, narrow);

    if (s.mode === 'band' || s.mode === 'two') {
      drawSet(ctx, p, px, lineY, S ?? [], view.w, left, right);
      if (s.mode === 'band') {
        // the centre a: a diamond in the limit colour, on the line
        diamond(ctx, px(s.a), lineY, 7, p.limit, p.paper);
        label(ctx, p, 'a', px(s.a), lineY - 18, p.limit, font(700, 13));
        handles.push({ h: 'a', x: px(s.a), y: lineY });
        // the radius: a dimension line from a to a + r above the line
        const ry = lineY - 30;
        if (s.r > 0) {
          dimension(ctx, px(s.a), px(s.a + s.r), ry, p.eps);
          label(ctx, p, `r = ${fmtNum(s.r)}`, (px(s.a) + px(s.a + s.r)) / 2, ry - 10, p.eps, font(600, 12));
        }
        square(ctx, px(s.a + s.r), ry, 6, p.eps);
        handles.push({ h: 'r', x: px(s.a + s.r), y: ry });
        testPoint(ctx, p, px, lineY, s.x, contains(S ?? [], s.x), [{ from: s.a, dy: 48, text: `|x − a| = ${fmtNum(Math.abs(s.x - s.a))}` }], narrow);
        handles.push({ h: 'x', x: px(s.x), y: lineY - 62 });
      } else {
        for (const [h, v] of [['a', s.a], ['b', s.b]] as const) {
          diamond(ctx, px(v), lineY, 7, p.limit, p.paper);
          label(ctx, p, h, px(v), lineY - 18, p.limit, font(700, 13));
          handles.push({ h, x: px(v), y: lineY });
        }
        const sum = Math.abs(s.x - s.a) + Math.abs(s.x - s.b);
        testPoint(
          ctx,
          p,
          px,
          lineY,
          s.x,
          contains(S ?? [], s.x),
          [
            { from: s.a, dy: 48, text: `|x − a| = ${fmtNum(Math.abs(s.x - s.a))}` },
            { from: s.b, dy: 66, text: `|x − b| = ${fmtNum(Math.abs(s.x - s.b))}` },
          ],
          narrow,
        );
        label(ctx, p, `סכום ${fmtNum(sum)}`, px(s.x), lineY - 84, p.ink, font(600, 12), 'rtl');
        handles.push({ h: 'x', x: px(s.x), y: lineY - 62 });
      }
    } else if (s.mode === 'triangle') {
      const sum = s.x + s.y;
      const rows = { x: lineY - 76, y: lineY - 52, xy: lineY - 26 };
      arrow(ctx, px(0), px(s.x), rows.x, p.curve, 2.4);
      label(ctx, p, 'x', px(s.x / 2), rows.x - 9, p.curve, font(700, 13));
      arrow(ctx, px(s.x), px(sum), rows.y, p.curve2, 2.4);
      label(ctx, p, 'y', px(s.x + s.y / 2), rows.y - 9, p.curve2, font(700, 13));
      arrow(ctx, px(0), px(sum), rows.xy, p.delta, 2.4);
      label(ctx, p, 'x + y', px(sum / 2), rows.xy - 9, p.delta, font(700, 13));
      // dotted guides from the tips down to the line
      ctx.save();
      ctx.strokeStyle = p.ink3;
      ctx.setLineDash([2, 3]);
      for (const [v, y] of [[s.x, rows.x], [sum, rows.y]] as const) {
        ctx.beginPath();
        ctx.moveTo(px(v), y);
        ctx.lineTo(px(v), lineY);
        ctx.stroke();
      }
      ctx.restore();
      handles.push({ h: 'x', x: px(s.x), y: rows.x }, { h: 'y', x: px(sum), y: rows.y });
      // the comparison: |x| + |y| as two pieces end to end, and |x + y|, both from 0 to the right
      const t = triangle(s.x, s.y);
      const by1 = lineY + 34;
      const by2 = lineY + 54;
      bar(ctx, px(0), px(Math.abs(s.x)), by1, p.curve);
      bar(ctx, px(Math.abs(s.x)), px(t.rhs), by1, p.curve2);
      bar(ctx, px(0), px(t.lhs), by2, p.delta);
      ctx.save();
      ctx.font = font(600, 12);
      ctx.direction = 'ltr';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = p.ink;
      ctx.fillText(`|x| + |y| = ${fmtNum(t.rhs)}`, px(0) - 8, by1);
      ctx.fillText(`|x + y| = ${fmtNum(t.lhs)}`, px(0) - 8, by2);
      ctx.restore();
    } else {
      const m = means(s.a, s.b);
      for (const [h, v] of [['a', s.a], ['b', s.b]] as const) {
        dot(ctx, px(v), lineY, 6, p.curve);
        label(ctx, p, h, px(v), lineY - 16, p.curve, font(700, 13));
        handles.push({ h, x: px(v), y: lineY });
      }
      // AM above the line, GM below it: different shapes, and the gap between them as a segment
      const yAm = lineY - 44;
      const yGm = lineY + 44;
      ctx.save();
      ctx.strokeStyle = p.ink3;
      ctx.setLineDash([3, 3]);
      for (const [v, y] of [[m.am, yAm], [m.gm, yGm]] as const) {
        ctx.beginPath();
        ctx.moveTo(px(v), y);
        ctx.lineTo(px(v), lineY);
        ctx.stroke();
      }
      ctx.restore();
      // AM: a square above the line; GM: a disc below it (shapes the lesson names; not triangles, which would echo
      // the triangle inequality)
      square(ctx, px(m.am), yAm, 6, p.delta);
      label(ctx, p, `(a + b)/2 = ${fmtNum(m.am)}`, px(m.am), yAm - 16, p.delta, font(600, 12));
      dot(ctx, px(m.gm), yGm, 7, p.curve2);
      label(ctx, p, `√(ab) ${gmText(m.gm)}`, px(m.gm), yGm + 18, p.curve2, font(600, 12));
    }
    geo.current = { px, wx, handles };
    // the active handle: a ring, so the keyboard user sees what the arrows move
    const act = handles.find((h) => h.h === s.active);
    if (act) {
      ctx.save();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(act.x, act.y, 14, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1.6, worldHeight: 1, animate: false });
  useEffect(invalidate, [s]);

  /** Move a handle to a number on the line (snapped to halves and kept in range). */
  const moveHandle = (h: Handle, v: number) => {
    const R = RANGE[s.mode];
    if (h === 'r') userSet({ r: clamp(snap(v - s.a), R.r!), active: 'r' });
    else if (s.mode === 'triangle' && h === 'y') userSet({ y: clamp(snap(v - s.x), R.y!), active: 'y' });
    else userSet({ [h]: clamp(snap(v), R[h]!), active: h } as Partial<State>);
  };

  const onPointerDown = (e: PointerEvent) => {
    const g = geo.current;
    if (!g) return;
    let best: { h: Handle; d: number } | null = null;
    for (const hd of g.handles) {
      const d = Math.hypot(hd.x - e.offsetX, hd.y - e.offsetY);
      if (d < 30 && (!best || d < best.d)) best = { h: hd.h, d };
    }
    // a press away from every handle moves the test point there (or the first handle of the view)
    const h = best?.h ?? HANDLES[s.mode][0];
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
  const valueOf = (h: Handle) => (h === 'r' ? s.a + s.r : s.mode === 'triangle' && h === 'y' ? s.x + s.y : s[h]);
  const onKeyDown = (e: KeyboardEvent) => {
    const hs = HANDLES[s.mode];
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      moveHandle(s.active, valueOf(s.active) + (e.key === 'ArrowRight' ? 0.5 : -0.5));
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const i = hs.indexOf(s.active);
      const next = hs[(i + (e.key === 'ArrowDown' ? 1 : hs.length - 1)) % hs.length];
      setS({ ...s, active: next });
      setLive(`החצים ימינה ושמאלה מזיזים עכשיו את ${HANDLE_NAME[next]}.`);
    }
  };

  const offered = props.modes ?? [];
  const R = RANGE[s.mode];
  const slider = (key: 'a' | 'r' | 'x' | 'y' | 'b' | 'c', name: string) => (
    <Slider
      key={key}
      label={name}
      value={s[key]}
      min={R[key]![0]}
      max={R[key]![1]}
      step={0.5}
      format={fmtNum}
      onChange={(v) => userSet({ [key]: snap(v), active: key === 'c' ? s.active : (key as Handle) } as Partial<State>)}
    />
  );

  const tri = triangle(s.x, s.y);
  const m = s.mode === 'means' ? means(s.a, s.b) : null;
  const sum = Math.abs(s.x - s.a) + Math.abs(s.x - s.b);

  return (
    <SimShell
      fig={props.id}
      label={`איור חי: ישר המספרים, מ-${fmtNum(VIEW[s.mode][0])} עד ${fmtNum(VIEW[s.mode][1])}, בתצוגה "${MODE_NAME[s.mode]}". ${describe(s)} גררו את הנקודות; במקלדת: חץ ימינה ושמאלה מזיז את הנקודה המסומנת בטבעת, חץ למעלה ולמטה בוחר נקודה אחרת.`}
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
        s.mode === 'band' ? (
          <>
            <span data-readout="set">
              הקבוצה{' '}
              <b class="q">
                {'{'}x : |x − {fmtNum(s.a)}| {REL_SIGN[s.rel]} {fmtNum(s.r)}
                {'}'} = {fmtSet(S ?? [])}
              </b>
            </span>
            <span data-readout="x">
              <b class="q">x = {fmtNum(s.x)}</b>, המרחק מהמרכז <b class="q">{fmtNum(Math.abs(s.x - s.a))}</b>:{' '}
              {contains(S ?? [], s.x) ? '✓ בתוך הקבוצה' : '✗ מחוץ לקבוצה'}
            </span>
          </>
        ) : s.mode === 'triangle' ? (
          <span data-readout="tri">
            <b class="q">
              |x + y| = {fmtNum(tri.lhs)} {tri.equal ? '=' : '<'} {fmtNum(tri.rhs)} = |x| + |y|
            </b>{' '}
            {tri.equal ? '✓ שוויון' : '✗ אי-שוויון חזק: x ו-y בסימנים מנוגדים'}
          </span>
        ) : s.mode === 'two' ? (
          <>
            <span data-readout="set">
              הקבוצה{' '}
              <b class="q">
                {'{'}x : |x − {fmtNum(s.a)}| + |x − {fmtNum(s.b)}| {REL_SIGN[s.twoRel]} {fmtNum(s.c)}
                {'}'} = {fmtSet(S ?? [])}
              </b>
            </span>
            <span data-readout="x">
              ב-<b class="q">x = {fmtNum(s.x)}</b> סכום המרחקים <b class="q">{fmtNum(sum)}</b>, והקטן ביותר האפשרי{' '}
              <b class="q">|a − b| = {fmtNum(minSumDist(s.a, s.b))}</b>
            </span>
          </>
        ) : (
          <span data-readout="means">
            <b class="q">(a + b)/2 = {fmtNum(m!.am)}</b>, <b class="q">√(ab) {gmText(m!.gm)}</b>:{' '}
            {s.a === s.b ? 'שווים, כי a = b' : 'הממוצע ההנדסי קטן יותר'}
          </span>
        )
      }
      controls={
        <>
          {offered.length > 1 && (
            <div class="group" role="group" aria-label="התצוגה">
              {offered.map((id) => (
                <Toggle key={id} label={MODE_NAME[id]} on={s.mode === id} onChange={() => pickMode(id)} />
              ))}
            </div>
          )}
          {s.mode === 'band' && (
            <>
              <div class="group" role="group" aria-label="הסימן">
                {RELS.map((rel) => (
                  <Toggle key={rel} label={<bdi dir="ltr">{`|x − a| ${REL_SIGN[rel]} r`}</bdi>} on={s.rel === rel} onChange={() => userSet({ rel })} />
                ))}
              </div>
              {slider('a', 'המרכז a')}
              {slider('r', 'הרדיוס r')}
              {slider('x', 'נקודת הבדיקה x')}
            </>
          )}
          {s.mode === 'triangle' && (
            <>
              {slider('x', 'x')}
              {slider('y', 'y')}
            </>
          )}
          {s.mode === 'two' && (
            <>
              <div class="group" role="group" aria-label="הסימן">
                {(['<', '<='] as const).map((rel) => (
                  <Toggle key={rel} label={<bdi dir="ltr">{`סכום ${REL_SIGN[rel]} c`}</bdi>} on={s.twoRel === rel} onChange={() => userSet({ twoRel: rel })} />
                ))}
              </div>
              {slider('a', 'הנקודה a')}
              {slider('b', 'הנקודה b')}
              {slider('c', 'c')}
              {slider('x', 'נקודת הבדיקה x')}
            </>
          )}
          {s.mode === 'means' && (
            <>
              {slider('a', 'a')}
              {slider('b', 'b')}
            </>
          )}
        </>
      }
    />
  );
}

/** √(ab) as text: exact when it is a multiple of 1/4 on the grid, otherwise "≈" and three decimals. */
function gmText(gm: number): string {
  const q = Math.round(gm * 4) / 4;
  return Math.abs(q - gm) < 1e-12 ? `= ${fmtNum(q)}` : `≈ ${fmtNum(Number(gm.toFixed(3)))}`;
}

/* ---- drawing helpers (canvas is math space: LTR, x grows to the right) ---- */

function drawLine(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  px: (v: number) => number,
  y: number,
  v0: number,
  v1: number,
  w: number,
  left: number,
  right: number,
  narrow: boolean,
) {
  ctx.save();
  ctx.strokeStyle = p.ink2;
  ctx.fillStyle = p.ink2;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left - 10, y);
  ctx.lineTo(w - right + 8, y);
  ctx.stroke();
  // the arrow head: the line goes on to the right
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
  for (let k = Math.ceil(v0); k <= Math.floor(v1); k++) {
    const sx = px(k);
    ctx.beginPath();
    ctx.moveTo(sx, y - (k === 0 ? 6 : 4));
    ctx.lineTo(sx, y + (k === 0 ? 6 : 4));
    ctx.stroke();
    if (!narrow || k % 2 === 0) ctx.fillText(fmtNum(k), sx, y + 8);
  }
  ctx.restore();
}

/** The solution set on the line: a band in the ε colours, hollow ends open and filled ends closed. */
function drawSet(ctx: CanvasRenderingContext2D, p: Palette, px: (v: number) => number, y: number, S: IntervalSet, w: number, left: number, right: number) {
  const xmin = left - 10;
  const xmax = w - right + 8;
  ctx.save();
  for (const I of S) {
    const x0 = Math.max(xmin, Number.isFinite(I.lo) ? px(I.lo) : xmin);
    const x1 = Math.min(xmax, Number.isFinite(I.hi) ? px(I.hi) : xmax);
    if (x1 >= x0) {
      ctx.fillStyle = p.epsBand;
      ctx.fillRect(x0, y - 9, Math.max(x1 - x0, 0), 18);
      ctx.strokeStyle = p.eps;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }
    for (const [v, closed] of [[I.lo, I.loClosed], [I.hi, I.hiClosed]] as const) {
      if (!Number.isFinite(v) || px(v) < xmin || px(v) > xmax) continue;
      ctx.beginPath();
      ctx.arc(px(v), y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = closed ? p.eps : p.paper;
      ctx.fill();
      ctx.strokeStyle = p.eps;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** The test point above the line: filled inside the set, hollow with a ring outside; distance brackets below. */
function testPoint(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  px: (v: number) => number,
  lineY: number,
  x: number,
  inside: boolean,
  brackets: { from: number; dy: number; text: string }[],
  narrow: boolean,
) {
  const sx = px(x);
  const sy = lineY - 62;
  ctx.save();
  ctx.strokeStyle = p.ink3;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(sx, sy + 7);
  ctx.lineTo(sx, lineY + 72);
  ctx.stroke();
  ctx.setLineDash([]);
  if (inside) {
    ctx.fillStyle = p.pointIn;
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, 2 * Math.PI);
    ctx.fill();
  } else {
    ctx.fillStyle = p.paper;
    ctx.strokeStyle = p.pointOut;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, 12, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = p.ink;
  ctx.font = `700 13px ${p.fontUi}`;
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('x', sx + 15, sy);
  // distance brackets from each reference point to x
  for (const b of brackets) {
    const y = lineY + b.dy - 22;
    const x0 = px(b.from);
    if (Math.abs(x0 - sx) > 1) {
      dimension(ctx, x0, sx, y, p.ink2);
    }
    ctx.fillStyle = p.ink2;
    ctx.font = `${narrow ? 11 : 12}px ${p.fontUi}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(b.text, Math.max(50, Math.min(ctx.canvas.clientWidth - 50, (x0 + sx) / 2)), y + 4);
  }
  ctx.restore();
}

function dimension(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
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

function arrow(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, color: string, width: number) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  if (Math.abs(x1 - x0) < 1) {
    // a zero arrow: a dot at its foot
    ctx.beginPath();
    ctx.arc(x0, y, 3.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
    return;
  }
  const dir = Math.sign(x1 - x0);
  const head = Math.min(10, Math.abs(x1 - x0));
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1 - dir * head * 0.6, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x1 - dir * head, y - 5);
  ctx.lineTo(x1 - dir * head, y + 5);
  ctx.closePath();
  ctx.fill();
  // the foot of the arrow
  ctx.beginPath();
  ctx.moveTo(x0, y - 5);
  ctx.lineTo(x0, y + 5);
  ctx.stroke();
  ctx.restore();
}

function bar(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, color: string) {
  if (x1 - x0 < 0.5) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x0, y - 5, x1 - x0, 10);
  ctx.restore();
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, edge: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function square(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
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


function label(ctx: CanvasRenderingContext2D, p: Palette, text: string, x: number, y: number, color: string, font: string, dir: 'ltr' | 'rtl' = 'ltr') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.direction = dir;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // keep labels inside the canvas
  const w = ctx.measureText(text).width;
  const cw = ctx.canvas.clientWidth;
  ctx.fillText(text, Math.max(w / 2 + 4, Math.min(cw - w / 2 - 4, x)), y);
  ctx.restore();
}
