/**
 * Lesson 2.8's figure: the growth ladder. Two sequences of the ladder (ln n, √n, n, n², n¹⁰, 1.1ⁿ, 2ⁿ, n!, nⁿ) or
 * of the quotients the lesson studies (100ⁿ/n!, n¹⁰/2ⁿ, n!/nⁿ) are drawn as points (n, aₙ) on a logarithmic
 * value axis, so that 10³⁰⁰⁰ and 1 fit on one screen. Under them, the ratio aₙ₊₁/aₙ of each, also on a
 * logarithmic axis, with the line 1 dashed and the limit q of the ratio as a green line: the ratio test of the
 * lesson (2.8.4) asks on which side of 1 the ratio ends up. A ratio point below 1 is filled, one at or above 1
 * hollow; the first sequence is drawn with circles, the second with squares (shape, not only colour).
 *
 * The point from which one sequence stays above the other in the window is marked (accent, dashed). It is
 * computed in logarithms by src/math/growth.ts (`overtakeFrom`, `ratioBelowFrom`), and only on the window:
 * evidence, not proof, as the caption says. The proofs are 2.8.4–2.8.7.
 *
 * Props: `a`, `b` (preset ids; `b: 'none'` hides the second), `n` (the cursor), `win` (the window length, one of
 * WINDOWS), `seqs` (the presets offered), `tasks`. A text step sets the same keys (`a`, `b`, `n`, `win`).
 * Task ids (each ticks only on the student's own move of the cursor, never on a text step):
 *   `cross`        the pair n¹⁰, 2ⁿ, cursor at 59, where 2ⁿ overtakes n¹⁰ for good;
 *   `ratio-below`  100ⁿ/n! shown, cursor at 100, the first n from which its ratio stays below 1;
 *   `late`         the pair n¹⁰, 1.1ⁿ, cursor at 686 (the window has to be widened to see it).
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import { GROWTH, WINDOWS, cmpLog, fromLog10, overtakeFrom, ratioBelowFrom, type GrowthId, type GrowthPreset } from '~/math/growth';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo } from './core/canvas';
import { sci, superscript } from './core/format';
import { drawAxes, insetBox, makePlot, niceTicks, type Plot } from './core/plot';
import SimShell, { Slider, Toggle, type TaskDef } from './core/SimShell';

const TASK_LABEL: Record<string, string> = {
  cross: 'בחרו את הזוג ⁦n¹⁰⁩ ו-⁦2ⁿ⁩, והזיזו את הסמן אל ה-n שממנו ⁦2ⁿ⁩ גדולה מ-⁦n¹⁰⁩ עד סוף החלון.',
  'ratio-below': 'בסדרה ⁦100ⁿ/n!⁩ הזיזו את הסמן אל ה-n הראשון שממנו המנה ⁦aₙ₊₁/aₙ⁩ קטנה מ-1.',
  late: 'בזוג ⁦n¹⁰⁩ ו-⁦1.1ⁿ⁩ הגדילו את החלון עד שהמעריכית עוקפת, והזיזו את הסמן אל נקודת העקיפה.',
};

/** the horizon the tasks are judged on: the widest window, independent of what is drawn */
const H = WINDOWS[WINDOWS.length - 1];

interface State {
  a: GrowthId;
  b: GrowthId | null;
  /** the cursor */
  n: number;
  /** index into WINDOWS */
  wi: number;
}

export interface GrowthLadderProps {
  id: string;
  a?: GrowthId;
  b?: GrowthId | 'none';
  n?: number;
  win?: number;
  seqs?: GrowthId[];
  tasks?: string[];
}

const nearestWin = (w: number) => WINDOWS.reduce((best, v, i) => (Math.abs(v - w) < Math.abs(WINDOWS[best] - w) ? i : best), 0);
const isId = (v: unknown): v is GrowthId => typeof v === 'string' && v in GROWTH;
const clampN = (n: number, w: number) => Math.max(1, Math.min(w, Math.round(n)));

function fresh(p: GrowthLadderProps): State {
  const wi = nearestWin(p.win ?? 100);
  return { a: p.a ?? 'n10', b: p.b === 'none' ? null : (p.b ?? 'pow2'), n: clampN(p.n ?? 10, WINDOWS[wi]), wi };
}

/** a typographic minus sign in front of negative numbers */
const minus = (t: string) => t.replace(/^-/, '−');
/** A value given by its log₁₀: plain between 0.01 and 10⁴, otherwise m·10ᵏ (the number itself may overflow a double). */
function fmtLog(l: number): string {
  if (!Number.isFinite(l)) return '—';
  if (l >= -2 && l < 4) return minus(sci(10 ** l, 3));
  const { mant, exp } = fromLog10(l);
  return `${Number(mant.toPrecision(3))}·10${superscript(exp)}`;
}
const fmtRatio = (r: number) => (Number.isFinite(r) ? minus(sci(r, 3)) : '—');
const decadeLabel = (k: number) => (k === 0 ? '1' : k === 1 ? '10' : `10${superscript(k)}`);
const RATIO_TICKS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];

/** Who is ahead at the end of the window, and from where on (null: tied at the end). */
function lead(A: GrowthPreset, B: GrowthPreset, w: number): { winner: 'a' | 'b'; from: number } | null {
  const c = cmpLog(A.log10(w), B.log10(w));
  if (c === 0) return null;
  const from = c > 0 ? overtakeFrom(B, A, w) : overtakeFrom(A, B, w);
  return from === null ? null : { winner: c > 0 ? 'a' : 'b', from };
}

export default function GrowthLadder(props: GrowthLadderProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));
  const dragging = useRef(false);
  const plotRef = useRef<Plot | null>(null);

  const W = WINDOWS[s.wi];
  const A = GROWTH[s.a];
  const Bp = s.b ? GROWTH[s.b] : null;
  const leadNow = Bp ? lead(A, Bp, W) : null;
  const valA = s.n >= A.first ? A.log10(s.n) : NaN;
  const valB = Bp && s.n >= Bp.first ? Bp.log10(s.n) : NaN;
  const ratA = s.n >= A.first ? A.ratio(s.n) : NaN;
  const ratB = Bp && s.n >= Bp.first ? Bp.ratio(s.n) : NaN;

  /**
   * The student's own change. Text steps go through subscribeSteps and never reach this function, so a step that
   * puts the figure exactly on an answer (the Explain steps do) ticks nothing; and a task ticks only when this
   * change moves the cursor, the control every task is about.
   */
  const userSet = (patch: Partial<State>) => {
    const next = { ...s, ...patch };
    next.n = clampN(next.n, WINDOWS[next.wi]);
    setS(next);
    if (patch.n === undefined) return;
    const has = (t: string) => props.tasks?.includes(t);
    const pair = (x: GrowthId, y: GrowthId) => (next.a === x && next.b === y) || (next.a === y && next.b === x);
    if (has('cross') && pair('n10', 'pow2') && next.n === overtakeFrom(GROWTH.n10, GROWTH.pow2, H)) markTask(`${props.id}:cross`);
    if (has('ratio-below') && (next.a === 'pow100-fact' || next.b === 'pow100-fact') && next.n === ratioBelowFrom(GROWTH['pow100-fact'], H))
      markTask(`${props.id}:ratio-below`);
    if (has('late') && pair('n10', 'pow11') && next.n === overtakeFrom(GROWTH.n10, GROWTH.pow11, H)) markTask(`${props.id}:late`);
  };

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = { ...prev };
          if (isId(st.a)) next.a = st.a;
          if (st.b === 'none') next.b = null;
          else if (isId(st.b)) next.b = st.b;
          if (typeof st.win === 'number') next.wi = nearestWin(st.win);
          if (typeof st.n === 'number') next.n = st.n;
          next.n = clampN(next.n, WINDOWS[next.wi]);
          return next;
        });
      }),
    [props.id],
  );

  const verdict = (): string => {
    if (!Bp) return '';
    if (!leadNow) return `בסוף החלון שתי הסדרות שוות.`;
    const [win, lose] = leadNow.winner === 'a' ? [A, Bp] : [Bp, A];
    const start = Math.max(A.first, Bp.first);
    return leadNow.from <= start
      ? `בכל החלון, עד n = ${W}, ${win.formula.replace('aₙ = ', '')} גדולה מ-${lose.formula.replace('aₙ = ', '')}.`
      : `מ-n = ${leadNow.from} ועד סוף החלון (n = ${W}), ${win.formula.replace('aₙ = ', '')} גדולה מ-${lose.formula.replace('aₙ = ', '')}.`;
  };

  useEffect(() => {
    const id = setTimeout(() => {
      const parts = [`n = ${s.n}. ${A.formula}: ${fmtLog(valA)}, המנה ${fmtRatio(ratA)}.`];
      if (Bp) parts.push(`${Bp.formula}: ${fmtLog(valB)}, המנה ${fmtRatio(ratB)}.`, verdict());
      setLive(parts.join(' '));
    }, 300);
    return () => clearTimeout(id);
  }, [s]);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const narrow = view.w < 420;
    const split = Math.round(view.h * 0.6);
    const ml = narrow ? 48 : 58;
    const mr = narrow ? 22 : 28;
    const top = insetBox({ x: 0, y: 0, w: view.w, h: split }, { l: ml, r: mr, t: 24, b: 6 });
    const bot = insetBox({ x: 0, y: split, w: view.w, h: view.h - split }, { l: ml, r: mr, t: 14, b: 40 });
    const seqs = [A, ...(Bp ? [Bp] : [])];

    // value range in log₁₀, over the window
    let lo = Infinity;
    let hi = -Infinity;
    let rlo = 0;
    let rhi = 0;
    for (const q of seqs)
      for (let n = q.first; n <= W; n++) {
        const l = q.log10(n);
        if (Number.isFinite(l)) {
          lo = Math.min(lo, l);
          hi = Math.max(hi, l);
        }
        const r = Math.log10(q.ratio(n));
        if (Number.isFinite(r)) {
          rlo = Math.min(rlo, r);
          rhi = Math.max(rhi, r);
        }
      }
    lo = Math.floor(Math.min(lo, 0));
    hi = Math.ceil(Math.max(hi, lo + 1));
    rlo = Math.max(-2, Math.min(-0.35, rlo - 0.1));
    rhi = Math.min(3.4, Math.max(0.35, rhi + 0.1));

    const xAxis = { min: 0.5, max: W + 0.5 };
    const decades = niceTicks(lo, hi, narrow ? 4 : 6).filter((v) => Number.isInteger(v));
    const plotTop = makePlot(top, { ...xAxis, ticks: [] }, { min: lo, max: hi, ticks: decades, format: decadeLabel, label: 'aₙ' });
    let rt = RATIO_TICKS.filter((v) => Math.log10(v) >= rlo && Math.log10(v) <= rhi);
    if (rt.length > (narrow ? 4 : 6)) rt = rt.filter((v) => Number.isInteger(Math.log10(v)));
    const plotBot = makePlot(bot, { ...xAxis, label: 'n' }, { min: rlo, max: rhi, ticks: rt.map(Math.log10), format: (v) => sci(10 ** v, 2), label: 'מנה' });
    plotRef.current = plotBot;

    drawAxes(ctx, plotTop, p);
    drawAxes(ctx, plotBot, p);

    // the line 1 under the ratio, and the limit q of each ratio
    ctx.save();
    ctx.strokeStyle = p.ink2;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(bot.x, plotBot.py(0));
    ctx.lineTo(bot.x + bot.w, plotBot.py(0));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `600 ${narrow ? 11 : 12}px ${p.fontUi}`;
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const q of seqs) {
      if (!(q.ratioLimit > 0) || !Number.isFinite(q.ratioLimit) || q.ratioLimit === 1) continue;
      const y = plotBot.py(Math.log10(q.ratioLimit));
      if (y < bot.y || y > bot.y + bot.h) continue;
      ctx.strokeStyle = p.limit;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(bot.x, y);
      ctx.lineTo(bot.x + bot.w, y);
      ctx.stroke();
      ctx.fillStyle = p.limit;
      ctx.fillText('q', bot.x + bot.w + 4, y);
    }
    ctx.fillStyle = p.ink2;
    ctx.fillText('1', bot.x + bot.w + 4, plotBot.py(0));
    ctx.restore();

    // the overtaking point
    if (leadNow && Bp && leadNow.from > Math.max(A.first, Bp.first)) {
      const x = plotTop.px(leadNow.from - 0.5);
      ctx.save();
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x, top.y);
      ctx.lineTo(x, top.y + top.h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = p.accent;
      ctx.font = `600 12px ${p.fontUi}`;
      ctx.direction = 'rtl';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`עקיפה: ${leadNow.from}`, Math.min(x + 4, top.x + top.w - 70), top.y + top.h - 4);
      ctx.restore();
    }

    // the terms and the ratios
    const r = Math.max(1.2, Math.min(3.6, (top.w / W) * 0.32));
    const mark = (x: number, y: number, square: boolean, color: string, filled: boolean, rad: number) => {
      ctx.beginPath();
      if (square) ctx.rect(x - rad, y - rad, 2 * rad, 2 * rad);
      else ctx.arc(x, y, rad, 0, 2 * Math.PI);
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.fillStyle = p.paper;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, rad * 0.5);
        ctx.stroke();
      }
    };
    seqs.forEach((q, k) => {
      const color = k === 0 ? p.curve : p.curve2;
      const square = k === 1;
      ctx.save();
      for (let n = q.first; n <= W; n++) {
        const l = q.log10(n);
        if (Number.isFinite(l)) mark(plotTop.px(n), plotTop.py(l), square, color, true, square ? r * 0.85 : r);
        const rv = Math.log10(q.ratio(n));
        if (!Number.isFinite(rv)) continue;
        const y = Math.max(bot.y, Math.min(bot.y + bot.h, plotBot.py(rv)));
        mark(plotBot.px(n), y, square, color, q.ratio(n) < 1, square ? r * 0.85 : r);
      }
      ctx.restore();
    });

    // the cursor
    const xc = plotTop.px(s.n);
    ctx.save();
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(xc, top.y);
    ctx.lineTo(xc, bot.y + bot.h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = p.ink;
    for (const [l, rv] of [
      [valA, ratA],
      [valB, ratB],
    ]) {
      if (Number.isFinite(l)) {
        ctx.beginPath();
        ctx.arc(xc, plotTop.py(l), r * 1.8 + 2, 0, 2 * Math.PI);
        ctx.stroke();
      }
      if (Number.isFinite(rv)) {
        ctx.beginPath();
        ctx.arc(xc, Math.max(bot.y, Math.min(bot.y + bot.h, plotBot.py(Math.log10(rv)))), r * 1.8 + 2, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
    ctx.fillStyle = p.ink;
    ctx.font = `700 14px ${p.fontUi}`;
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`n = ${s.n}`, Math.min(xc + 5, top.x + top.w - 60), top.y - 4);
    ctx.restore();
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1.2, worldHeight: 1, animate: false });
  useEffect(invalidate, [s]);

  const nFromPointer = (e: PointerEvent) => {
    const plot = plotRef.current;
    if (!plot) return null;
    return clampN(0.5 + ((e.offsetX - plot.box.x) / plot.box.w) * W, W);
  };
  const onPointerDown = (e: PointerEvent) => {
    const n = nFromPointer(e);
    if (n === null) return;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (n !== s.n) userSet({ n });
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging.current) return;
    const n = nFromPointer(e);
    if (n !== null && n !== s.n) userSet({ n });
  };
  const onPointerUp = () => {
    dragging.current = false;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      userSet({ n: s.n + (e.key === 'ArrowRight' ? 1 : -1) });
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      userSet({ wi: Math.max(0, Math.min(WINDOWS.length - 1, s.wi + (e.key === 'ArrowUp' ? 1 : -1))) });
    }
  };

  const offered = props.seqs ?? (Object.keys(GROWTH) as GrowthId[]);
  const nameOf = (q: GrowthPreset) => q.formula.replace('aₙ = ', '');
  return (
    <SimShell
      fig={props.id}
      label={`איור חי: שתי סדרות כנקודות מעל n, על ציר ערכים לוגריתמי, ${nameOf(A)} בעיגולים${Bp ? ` ו-${nameOf(Bp)} בריבועים` : ''}, עד n = ${W}. מתחת, המנה של איברים עוקבים, aₙ₊₁ חלקי aₙ, של כל סדרה, עם קו מקווקו בגובה 1: נקודה מתחת ל-1 מלאה, ונקודה ב-1 או מעליו חלולה. הסמן ב-n = ${s.n}. ${verdict()} חץ ימינה ושמאלה מזיז את הסמן, חץ למעלה ולמטה משנה את החלון.`}
      canvasRef={canvasRef}
      aspect={1.2}
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
          <span>
            <b class="q" data-readout="n">n = {s.n}</b>
          </span>
          <span data-readout="a">
            ● <bdi dir="ltr">{nameOf(A)}</bdi>: <b class="q">{fmtLog(valA)}</b>, המנה <b class="q">{fmtRatio(ratA)}</b>
          </span>
          {Bp && (
            <span data-readout="b">
              ■ <bdi dir="ltr">{nameOf(Bp)}</bdi>: <b class="q">{fmtLog(valB)}</b>, המנה <b class="q">{fmtRatio(ratB)}</b>
            </span>
          )}
          {Bp && <span data-readout="overtake">{verdict()} (בחלון בלבד.)</span>}
        </>
      }
      controls={
        <>
          <div class="group" role="group" aria-label="הסדרה הראשונה (עיגולים)">
            {offered.map((id) => (
              <Toggle key={id} label={GROWTH[id].name} on={s.a === id} onChange={() => userSet({ a: id })} />
            ))}
          </div>
          <div class="group" role="group" aria-label="הסדרה השנייה (ריבועים)">
            <Toggle label="בלי שנייה" on={s.b === null} onChange={() => userSet({ b: null })} />
            {offered.map((id) => (
              <Toggle key={id} label={GROWTH[id].name} on={s.b === id} onChange={() => userSet({ b: id })} />
            ))}
          </div>
          <Slider label="החלון: עד n =" value={s.wi} min={0} max={WINDOWS.length - 1} step={1} format={(v) => String(WINDOWS[Math.round(v)])} onChange={(v) => userSet({ wi: Math.round(v) })} />
          <Slider label="הסמן n" value={s.n} min={1} max={W} step={1} format={(v) => String(Math.round(v))} onChange={(v) => userSet({ n: Math.round(v) })} />
        </>
      }
    />
  );
}
