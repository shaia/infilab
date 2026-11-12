/**
 * Lesson 1.3's figure: naturals, integers and rationals. Three views (math space, LTR):
 *
 * - `inductive`: a candidate set S on the number line (an interval drawn as a thick segment with filled / hollow
 *   ends, a progression with step 1 as dots, "→" or "…" where it goes on) and a test point x with its successor
 *   x + 1, joined by a "+1" arc. Each of x and x + 1 is filled (point-in) when it lies in S and hollow with a ring
 *   (point-out) when it does not: shape, not colour alone. A point x with x ∈ S and x + 1 ∉ S is a witness that S
 *   is not inductive (definition 1.3.1). The verdict "inductive" in the readout is the preset's, proved in the
 *   lesson; the figure tests one point at a time and never infers it.
 * - `search`: for n chosen by the learner and each denominator q = 1 … 60, the fraction p/q nearest to √n and the
 *   integer E = p² − n q², plotted against q. E = 0 would mean (p/q)² = n; such points are filled, all others hollow.
 *   For n = 2, 3, 5, 8 no point reaches the zero line, and the caption says that this is evidence, not proof.
 * - `descent`: the step of theorem 1.3.16, a/b ↦ (n b − m a)/r where a = m b + r, applied by the learner from a
 *   starting fraction: one bar per fraction, its length the denominator, with E beside it. The denominators
 *   strictly decrease, and E is multiplied by −(n − m²): an E equal to 0 would stay 0 all the way down.
 *
 * Every number comes from src/math/rationals.ts (exact integer arithmetic). Nothing moves on its own (a step is a
 * click), so there is no animation to gate behind motionAllowed().
 *
 * Tasks tick only on the learner's own change, never in the exact state the last text step produced.
 * Task ids: `witness` (inductive view, a non-inductive set, x with x ∈ S and x + 1 ∉ S), `pell` (search view,
 * n = 2, a denominator q ≥ 10 with |p² − 2q²| = 1), `descend` (descent view, n = 2, step down to an integer).
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import {
  DESCENT_STARTS,
  SETS,
  checkAt,
  descentChain,
  probe,
  type CandidateSet,
  type Piece,
  type SetId,
} from '~/math/rationals';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo, type Palette } from './core/canvas';
import SimShell, { Slider, Toggle, type TaskDef } from './core/SimShell';

export type ProbeMode = 'inductive' | 'search' | 'descent';

const MODE_NAME: Record<ProbeMode, string> = {
  inductive: 'קבוצה אינדוקטיבית?',
  search: 'שבר שריבועו n',
  descent: 'ירידה במכנים',
};

const TASK_LABEL: Record<string, string> = {
  witness: 'בתצוגה "קבוצה אינדוקטיבית?", בחרו קבוצה שאינה אינדוקטיבית והזיזו את x לנקודה שבה x בקבוצה ו-⁦x + 1⁩ לא.',
  pell: 'בתצוגה "שבר שריבועו n", עם ⁦n = 2⁩, מצאו מכנה ⁦q ≥ 10⁩ שבו ⁦p² − 2q²⁩ שווה ל-1 או ל-⁦−1⁩.',
  descend: 'בתצוגה "ירידה במכנים", עם ⁦n = 2⁩, לחצו "צעד ירידה" עד שהשבר הוא מספר שלם.',
};

const SEARCH_NS = [2, 3, 5, 8, 4, 9];
const Q_MAX = 60;
/** the inductive view's window */
const V0 = -1;
const V1 = 9;

interface State {
  mode: ProbeMode;
  set: SetId;
  x: number;
  n: number;
  q: number;
  dn: 2 | 3;
  start: number;
  steps: number;
}

export interface RationalProbeProps {
  id: string;
  mode?: ProbeMode;
  /** the views offered in the picker (none or one: no picker) */
  modes?: ProbeMode[];
  set?: SetId;
  /** the candidate sets offered in the inductive view */
  sets?: SetId[];
  x?: number;
  n?: number;
  q?: number;
  dn?: 2 | 3;
  start?: number;
  steps?: number;
  tasks?: string[];
}

const snapQ = (v: number) => Math.round(v * 4) / 4;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const LRI = '⁦';
const PDI = '⁩';
const iso = (m: string | number) => `${LRI}${m}${PDI}`;
/** a number in the readouts: minus sign, not hyphen */
const num = (v: number) => (v < 0 ? `−${-v}` : String(v));
/** x on the quarter grid as text: 1.5, −0.25 */
const fx = (v: number) => num(Number(v.toFixed(2)));

function fresh(p: RationalProbeProps): State {
  const dn = p.dn ?? 2;
  return {
    mode: p.mode ?? 'inductive',
    set: p.set ?? 'short',
    x: snapQ(clamp(p.x ?? 3, V0, V1 - 1)),
    n: p.n ?? 2,
    q: Math.round(clamp(p.q ?? 5, 1, Q_MAX)),
    dn,
    start: clamp(p.start ?? 0, 0, DESCENT_STARTS[dn].length - 1),
    steps: p.steps ?? 0,
  };
}

const chainOf = (s: State) => {
  const [a, b] = DESCENT_STARTS[s.dn][s.start];
  return descentChain(a, b, s.dn);
};

/** the quantities tasks look at, as a string: the state a step produced is skipped exactly */
const taskKey = (s: State) => `${s.mode}|${s.set}|${s.x}|${s.n}|${s.q}|${s.dn}|${s.start}|${s.steps}`;

export default function RationalProbe(props: RationalProbeProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));
  const stepKey = useRef<string | null>(null);
  const dragging = useRef(false);
  const geo = useRef<{ wx: (sx: number) => number } | null>(null);

  const set = SETS[s.set];
  const at = checkAt(set, s.x);
  const pts = probe(s.n, Q_MAX);
  const cur = pts[s.q - 1];
  const chain = chainOf(s);
  const shown = chain.slice(0, Math.min(s.steps, chain.length - 1) + 1);
  const last = shown[shown.length - 1];
  const atEnd = shown.length === chain.length;

  /** The learner's own change: the only path that can tick a task. */
  const userSet = (patch: Partial<State>) => {
    const next = { ...s, ...patch };
    setS(next);
    if (taskKey(next) === stepKey.current) return;
    const has = (t: string) => props.tasks?.includes(t);
    if (has('witness') && next.mode === 'inductive' && !SETS[next.set].inductive && checkAt(SETS[next.set], next.x).breaks)
      markTask(`${props.id}:witness`);
    if (has('pell') && next.mode === 'search' && next.n === 2 && patch.q !== undefined && next.q >= 10) {
      const E = probe(2, Q_MAX)[next.q - 1].E;
      if (Math.abs(E) === 1) markTask(`${props.id}:pell`);
    }
    if (has('descend') && next.mode === 'descent' && next.dn === 2 && patch.steps !== undefined && patch.steps > s.steps) {
      const c = chainOf(next);
      if (next.steps >= c.length - 1) markTask(`${props.id}:descend`);
    }
  };

  const pickMode = (mode: ProbeMode) => {
    if (mode !== s.mode) setS({ ...s, mode });
  };

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = { ...prev };
          if (typeof st.mode === 'string' && st.mode in MODE_NAME) next.mode = st.mode as ProbeMode;
          if (typeof st.set === 'string' && st.set in SETS) next.set = st.set as SetId;
          if (typeof st.x === 'number') next.x = snapQ(clamp(st.x, V0, V1 - 1));
          if (typeof st.n === 'number' && SEARCH_NS.includes(st.n)) next.n = st.n;
          if (typeof st.q === 'number') next.q = Math.round(clamp(st.q, 1, Q_MAX));
          if (st.dn === 2 || st.dn === 3) next.dn = st.dn;
          if (typeof st.start === 'number') next.start = clamp(Math.round(st.start), 0, DESCENT_STARTS[next.dn].length - 1);
          if (typeof st.steps === 'number') next.steps = Math.max(0, Math.round(st.steps));
          stepKey.current = taskKey(next);
          return next;
        });
      }),
    [props.id],
  );

  /** the sentence a screen reader hears after a change */
  const describe = (st: State): string => {
    if (st.mode === 'inductive') {
      const S = SETS[st.set];
      const c = checkAt(S, st.x);
      const verdict = c.breaks ? 'x בקבוצה ו-x + 1 לא: דוגמה לכך שהקבוצה אינה אינדוקטיבית' : 'בנקודה הזו התנאי "אם x בקבוצה אז גם x + 1" מתקיים';
      return `הקבוצה ${S.text}. ${iso(`x = ${fx(st.x)}`)} ${c.xIn ? 'בקבוצה' : 'אינו בקבוצה'}, ${iso(`x + 1 = ${fx(st.x + 1)}`)} ${c.nextIn ? 'בקבוצה' : 'אינו בקבוצה'}: ${verdict}.`;
    }
    if (st.mode === 'search') {
      const pr = probe(st.n, Q_MAX)[st.q - 1];
      return `${iso(`n = ${st.n}, q = ${st.q}`)}: השבר הקרוב ביותר הוא ${iso(`${pr.p}/${pr.q}`)}, ו-${iso(`p² − nq² = ${num(pr.E)}`)}${pr.E === 0 ? ', כלומר ריבוע השבר שווה בדיוק ל-n' : ', שונה מאפס'}.`;
    }
    const c = chainOf(st);
    const sh = c.slice(0, Math.min(st.steps, c.length - 1) + 1);
    const l = sh[sh.length - 1];
    return `ירידה עם ${iso(`n = ${st.dn}`)}: ${sh.map((d) => iso(`${d.a}/${d.b}`)).join(', ')}. השבר האחרון ${iso(`${l.a}/${l.b}`)}, ${iso(`p² − nq² = ${num(l.E)}`)}${sh.length === c.length ? '; הוא מספר שלם, והירידה נעצרת' : ''}.`;
  };

  useEffect(() => {
    const id = setTimeout(() => setLive(describe(s)), 300);
    return () => clearTimeout(id);
  }, [s]);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const narrow = view.w < 440;
    if (s.mode === 'inductive') drawInductive(ctx, p, view.w, view.h, set, s.x, narrow, geo);
    else if (s.mode === 'search') drawSearch(ctx, p, view.w, view.h, s.n, s.q, pts, narrow);
    else drawDescent(ctx, p, view.w, view.h, s.dn, shown, atEnd, narrow);
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1.6, worldHeight: 1, animate: false });
  useEffect(invalidate, [s]);

  const moveX = (v: number) => userSet({ x: snapQ(clamp(v, V0, V1 - 1)) });
  const onPointerDown = (e: PointerEvent) => {
    if (s.mode !== 'inductive' || !geo.current) return;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    moveX(geo.current.wx(e.offsetX));
  };
  const onPointerMove = (e: PointerEvent) => {
    if (dragging.current && geo.current) moveX(geo.current.wx(e.offsetX));
  };
  const onPointerUp = () => {
    dragging.current = false;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    if (s.mode === 'inductive') moveX(s.x + d * 0.25);
    else if (s.mode === 'search') userSet({ q: clamp(s.q + d, 1, Q_MAX) });
    else if (d > 0 && !atEnd) userSet({ steps: s.steps + 1 });
    else if (d < 0 && s.steps > 0) userSet({ steps: s.steps - 1 });
  };

  const offered = props.modes ?? [];
  const offeredSets = props.sets ?? (Object.keys(SETS) as SetId[]);

  return (
    <SimShell
      fig={props.id}
      label={`איור חי, בתצוגה "${MODE_NAME[s.mode]}". ${describe(s)} ${
        s.mode === 'inductive'
          ? 'גררו את x על הישר; במקלדת: חץ ימינה ושמאלה מזיז את x ברבע.'
          : s.mode === 'search'
            ? 'במקלדת: חץ ימינה ושמאלה משנה את המכנה q.'
            : 'במקלדת: חץ ימינה עושה צעד ירידה, חץ שמאלה מבטל אותו.'
      }`}
      canvasRef={canvasRef}
      aspect={1.6}
      live={live}
      tasks={tasks}
      cursor={s.mode === 'inductive' ? 'ew-resize' : 'default'}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onReset={() => {
        setS(fresh(props));
        setLive('האיור אופס.');
      }}
      readout={
        s.mode === 'inductive' ? (
          <>
            <span data-readout="set">
              הקבוצה <b class="q">S = {set.text}</b>: <b class="q">1 ∈ S</b> {at.hasOne ? '✓' : '✗'}.{' '}
              {set.inductive ? 'הקבוצה אינדוקטיבית (ההוכחה בשיעור).' : 'הקבוצה אינה אינדוקטיבית: יש בה x כך ש-x + 1 לא בה.'}
            </span>
            <span data-readout="x">
              <b class="q">x = {fx(s.x)}</b> {at.xIn ? '∈ S' : '∉ S'}, <b class="q">x + 1 = {fx(s.x + 1)}</b> {at.nextIn ? '∈ S' : '∉ S'}:{' '}
              {at.breaks ? '✗ כאן הצעד נכשל' : '✓ כאן הצעד לא נכשל'}
            </span>
          </>
        ) : s.mode === 'search' ? (
          <span data-readout="search">
            <b class="q">
              q = {cur.q}, p = {cur.p}: p² − {s.n}q² = {cur.p * cur.p} − {s.n * cur.q * cur.q} = {num(cur.E)}
            </b>{' '}
            {cur.E === 0 ? `✓ ריבוע השבר הוא בדיוק ${s.n}` : '✗ שונה מאפס'}
          </span>
        ) : (
          <span data-readout="descent">
            <b class="q">
              {shown.map((d) => `${d.a}/${d.b}`).join(' → ')}
            </b>
            {'. '}
            <b class="q">p² − {s.dn}q² = {num(last.E)}</b>
            {atEnd ? '. השבר הוא מספר שלם, והירידה נעצרת.' : '.'}
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
          {s.mode === 'inductive' && (
            <>
              <div class="group" role="group" aria-label="הקבוצה">
                {offeredSets.map((id) => (
                  <Toggle key={id} label={<bdi dir="ltr">{SETS[id].text}</bdi>} on={s.set === id} onChange={() => userSet({ set: id })} />
                ))}
              </div>
              <Slider label="נקודת הבדיקה x" value={s.x} min={V0} max={V1 - 1} step={0.25} format={fx} onChange={(v) => moveX(v)} />
            </>
          )}
          {s.mode === 'search' && (
            <>
              <div class="group" role="group" aria-label="המספר n">
                {SEARCH_NS.map((n) => (
                  <Toggle key={n} label={<bdi dir="ltr">{`n = ${n}`}</bdi>} on={s.n === n} onChange={() => userSet({ n })} />
                ))}
              </div>
              <Slider label="המכנה q" value={s.q} min={1} max={Q_MAX} step={1} format={(v) => String(Math.round(v))} onChange={(v) => userSet({ q: Math.round(v) })} />
            </>
          )}
          {s.mode === 'descent' && (
            <>
              <div class="group" role="group" aria-label="המספר n">
                {([2, 3] as const).map((n) => (
                  <Toggle key={n} label={<bdi dir="ltr">{`n = ${n}`}</bdi>} on={s.dn === n} onChange={() => userSet({ dn: n, start: 0, steps: 0 })} />
                ))}
              </div>
              <div class="group" role="group" aria-label="שבר ההתחלה">
                {DESCENT_STARTS[s.dn].map(([a, b], i) => (
                  <Toggle key={`${a}/${b}`} label={<bdi dir="ltr">{`${a}/${b}`}</bdi>} on={s.start === i} onChange={() => userSet({ start: i, steps: 0 })} />
                ))}
              </div>
              <div class="group">
                <button type="button" class="toggle" data-action="descend" onClick={() => userSet({ steps: s.steps + 1 })} disabled={atEnd}>
                  צעד ירידה
                </button>
                <button type="button" class="toggle" data-action="restart" onClick={() => userSet({ steps: 0 })} disabled={s.steps === 0}>
                  חזרה לשבר ההתחלה
                </button>
              </div>
            </>
          )}
        </>
      }
    />
  );
}

/* ---- drawing (canvas is math space: LTR, x grows to the right) ---- */

function text(ctx: CanvasRenderingContext2D, p: Palette, t: string, x: number, y: number, color: string, size: number, weight = 500, align: CanvasTextAlign = 'center') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${p.fontUi}`;
  ctx.direction = 'ltr';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(t).width;
  const cw = ctx.canvas.clientWidth;
  let tx = x;
  if (align === 'center') tx = Math.max(w / 2 + 4, Math.min(cw - w / 2 - 4, x));
  ctx.fillText(t, tx, y);
  ctx.restore();
}

/** a point: filled when in, hollow with a ring when out */
function point(ctx: CanvasRenderingContext2D, p: Palette, x: number, y: number, inside: boolean, r = 7) {
  ctx.save();
  if (inside) {
    ctx.fillStyle = p.pointIn;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
  } else {
    ctx.fillStyle = p.paper;
    ctx.strokeStyle = p.pointOut;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

function drawInductive(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  w: number,
  h: number,
  S: CandidateSet,
  x: number,
  narrow: boolean,
  geo: { current: { wx: (sx: number) => number } | null },
) {
  const left = narrow ? 18 : 28;
  const right = narrow ? 22 : 34;
  const px = (v: number) => left + ((v - V0) / (V1 - V0)) * (w - left - right);
  geo.current = { wx: (sx: number) => V0 + ((sx - left) / (w - left - right)) * (V1 - V0) };
  // the "x + 1" label sits 116 px above the line: keep it inside a short (phone-width) canvas
  const lineY = Math.round(Math.max(h * 0.62, Math.min(h - 50, 140)));
  const xmax = w - right + 6;

  // the number line, with integer ticks
  ctx.save();
  ctx.strokeStyle = p.ink2;
  ctx.fillStyle = p.ink2;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left - 10, lineY);
  ctx.lineTo(w - right + 14, lineY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w - right + 18, lineY);
  ctx.lineTo(w - right + 10, lineY - 4);
  ctx.lineTo(w - right + 10, lineY + 4);
  ctx.closePath();
  ctx.fill();
  ctx.font = `11px ${p.fontUi}`;
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let k = V0; k <= V1; k++) {
    ctx.beginPath();
    ctx.moveTo(px(k), lineY - (k === 0 ? 6 : 4));
    ctx.lineTo(px(k), lineY + (k === 0 ? 6 : 4));
    ctx.stroke();
    ctx.fillText(num(k), px(k), lineY + 22);
  }
  ctx.restore();

  // the set, in the curve colour
  const pieceY = lineY;
  for (const piece of S.pieces) drawPiece(ctx, p, piece, px, pieceY, xmax);
  text(ctx, p, `S = ${S.text}`, left + 4, 22, p.curve, narrow ? 13 : 14, 700, 'left');

  // x, x + 1 and the "+1" arc above the line
  const y = lineY - 58;
  const at = checkAt(S, x);
  const sx = px(x);
  const sx1 = px(x + 1);
  ctx.save();
  ctx.strokeStyle = p.ink3;
  ctx.setLineDash([3, 3]);
  for (const v of [sx, sx1]) {
    ctx.beginPath();
    ctx.moveTo(v, y + 8);
    ctx.lineTo(v, lineY - 10);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = at.breaks ? p.pointOut : p.ink2;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(sx, y - 10);
  ctx.quadraticCurveTo((sx + sx1) / 2, y - 46, sx1, y - 10);
  ctx.stroke();
  // arrow head at x + 1
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(sx1, y - 9);
  ctx.lineTo(sx1 - 8, y - 15);
  ctx.lineTo(sx1 - 2, y - 19);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  text(ctx, p, '+1', (sx + sx1) / 2, y - 38, p.ink2, 12, 600);
  point(ctx, p, sx, y, at.xIn);
  point(ctx, p, sx1, y, at.nextIn);
  text(ctx, p, `x = ${fx(x)}`, sx, y + 24, p.ink, narrow ? 11 : 12, 700);
  text(ctx, p, `x + 1 = ${fx(x + 1)}`, sx1, y - 58, p.ink, narrow ? 11 : 12, 700);
  if (at.breaks) text(ctx, p, 'x ∈ S, x + 1 ∉ S', w / 2, h - 16, p.pointOut, 13, 700);
}

/** One piece of a candidate set on the line: a segment with filled / hollow ends, or dots, going on to the right. */
function drawPiece(ctx: CanvasRenderingContext2D, p: Palette, piece: Piece, px: (v: number) => number, y: number, xmax: number) {
  ctx.save();
  ctx.strokeStyle = p.curve;
  ctx.fillStyle = p.curve;
  if (piece.kind === 'interval') {
    const x0 = px(piece.lo);
    const x1 = piece.hi === Infinity ? xmax : px(piece.hi);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    const ends: [number, boolean][] = [[x0, piece.loClosed]];
    if (piece.hi !== Infinity) ends.push([x1, piece.hiClosed]);
    for (const [ex, closed] of ends) {
      ctx.beginPath();
      ctx.arc(ex, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = closed ? p.curve : p.paper;
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
    if (piece.hi === Infinity) {
      ctx.fillStyle = p.curve;
      ctx.beginPath();
      ctx.moveTo(xmax + 10, y);
      ctx.lineTo(xmax, y - 6);
      ctx.lineTo(xmax, y + 6);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    let k = 0;
    while (k < piece.count && px(piece.start + k) <= xmax) {
      ctx.beginPath();
      ctx.arc(px(piece.start + k), y, 5, 0, 2 * Math.PI);
      ctx.fill();
      k++;
    }
    if (piece.count === Infinity) {
      ctx.font = `700 14px ${p.fontUi}`;
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('…', xmax + 2, y - 12);
    }
  }
  ctx.restore();
}

function drawSearch(ctx: CanvasRenderingContext2D, p: Palette, w: number, h: number, n: number, q: number, pts: { q: number; p: number; E: number }[], narrow: boolean) {
  const left = narrow ? 44 : 56;
  const right = 16;
  const top = 48;
  const bottom = 34;
  const yMax = Math.max(2, ...pts.map((d) => Math.abs(d.E)));
  const sx = (k: number) => left + ((k - 0.5) / Q_MAX) * (w - left - right);
  const sy = (E: number) => top + ((yMax - E) / (2 * yMax)) * (h - top - bottom);

  // axes: q to the right, E up
  ctx.save();
  ctx.strokeStyle = p.ink3;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top - 6);
  ctx.lineTo(left, h - bottom);
  ctx.lineTo(w - right, h - bottom);
  ctx.stroke();
  ctx.restore();
  for (const E of [yMax, -yMax]) text(ctx, p, num(E), left - 6, sy(E), p.ink2, 11, 500, 'right');
  for (const k of [1, 10, 20, 30, 40, 50, 60]) text(ctx, p, String(k), sx(k), h - bottom + 14, p.ink2, 11);
  text(ctx, p, 'q', w - right - 4, h - bottom - 10, p.ink2, 12, 700);
  text(ctx, p, `p² − ${n}q²`, left + 4, top - 22, p.ink2, 12, 700, 'left');

  // the target: E = 0, in the limit colour
  ctx.save();
  ctx.strokeStyle = p.limit;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, sy(0));
  ctx.lineTo(w - right, sy(0));
  ctx.stroke();
  ctx.restore();
  text(ctx, p, '0', left - 6, sy(0), p.limit, 12, 700, 'right');

  // the current q: a vertical guide
  ctx.save();
  ctx.strokeStyle = p.ink3;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(sx(q), top - 6);
  ctx.lineTo(sx(q), h - bottom);
  ctx.stroke();
  ctx.restore();

  const r = narrow ? 3 : 4;
  for (const d of pts) {
    if (d.q > q) break;
    ctx.save();
    if (d.E === 0) {
      ctx.fillStyle = p.pointIn;
      ctx.beginPath();
      ctx.arc(sx(d.q), sy(d.E), r + 1, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      ctx.fillStyle = p.paper;
      ctx.strokeStyle = p.pointOut;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(sx(d.q), sy(d.E), r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  const c = pts[q - 1];
  ctx.save();
  ctx.strokeStyle = p.ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(sx(q), sy(c.E), r + 6, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();
  text(ctx, p, `${c.p}/${c.q}`, sx(q), sy(c.E) + (c.E >= 0 ? 20 : -20), p.ink, 12, 700);
}

function drawDescent(
  ctx: CanvasRenderingContext2D,
  p: Palette,
  w: number,
  h: number,
  n: number,
  shown: { a: number; b: number; m: number; r: number; E: number }[],
  atEnd: boolean,
  narrow: boolean,
) {
  const top = 48;
  const rows = 9;
  const rowH = (h - top - 12) / rows;
  const labelW = narrow ? 84 : 104;
  const eW = narrow ? 86 : 120;
  const x0 = labelW + 8;
  const barMax = w - x0 - eW - 8;
  const b0 = shown[0].b;
  text(ctx, p, `n = ${n}:  a/b ↦ (${n}b − ma)/r,  a = mb + r`, 12, 22, p.ink, narrow ? 12 : 14, 700, 'left');
  shown.forEach((d, i) => {
    const y = top + (i + 0.5) * rowH;
    const len = Math.max(3, (d.b / b0) * barMax);
    ctx.save();
    ctx.fillStyle = p.curve;
    ctx.globalAlpha = i === shown.length - 1 ? 1 : 0.55;
    ctx.fillRect(x0, y - Math.min(9, rowH * 0.3), len, Math.min(18, rowH * 0.6));
    ctx.restore();
    text(ctx, p, `${d.a}/${d.b}`, labelW, y, p.ink, narrow ? 12 : 13, 700, 'right');
    text(ctx, p, `b = ${d.b}`, x0 + len + 6, y, p.ink2, 11, 500, 'left');
    text(ctx, p, `E = ${num(d.E)}`, w - 8, y, d.E === 0 ? p.pointIn : p.ink2, narrow ? 11 : 12, 600, 'right');
  });
  if (atEnd) {
    const l = shown[shown.length - 1];
    text(ctx, p, `${l.a}/${l.b} = ${l.m}`, x0 + barMax / 2, top + (shown.length + 0.5) * rowH, p.limit, 13, 700);
  }
}
