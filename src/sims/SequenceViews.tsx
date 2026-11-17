/**
 * SequenceViews: lesson 2.1's figure. One sequence in two views at once:
 *   (1) on top, its values on a number line: every term aₙ of the window is a dot at its value, and a value that
 *       occurs at several places is a stack of dots (the set of values is what the line shows; the order is lost);
 *   (2) below, its graph: the points (n, aₙ) over n = 1 … window, never joined by a curve.
 * Draggable bound lines U (upper) and m (lower) cross both views; a term beyond a shown bound is drawn hollow in
 * --point-out, a term inside filled in --point-in (shape and colour). A toggle marks every step between consecutive
 * terms in the graph: ▲ up (filled), ▽ down (hollow), = equal; with it a line n₀ splits off the start, and the
 * readout says how the window moves from n₀ on.
 *
 * Mathematics: src/math/seqviews.ts. The window is evidence and never proof (the caption says so); the tasks are
 * checked against the facts the lesson proves (sup, inf, the place from which a sequence is monotone), so a "bound"
 * that only the drawn terms respect never ticks a task.
 *
 * ---------------------------------------------------------------------------------------------------------------
 * PROPS (all optional except `id`, which the .astro wrapper takes from the Spread)
 *   seq     preset id (below). Default 'ratio'.
 *   seqs    the presets offered as chips (none or one: no chips).
 *   win     the number of terms drawn (default: the preset's own window; at most its winMax).
 *   U, m    the upper and lower bound lines (default: inside the drawn range, near its top and bottom).
 *   showU, showM   show the bound lines (default false).
 *   steps   show the up/down marks and the n₀ line (default false).
 *   n0      the place n₀ from which the readout judges monotonicity (default 1).
 *   tasks   task ids (below).
 * STEP `set={{…}}` keys: the same as the props (seq, win, U, m, showU, showM, steps, n0). A step that changes `seq`
 * resets win, U, m and n₀ to that preset's defaults before applying the other keys.
 *
 * PRESETS (src/math/seqviews.ts): ratio n/(n+1), alt-recip (−1)ⁿ/n, root-diff √(n+1) − √n, rec-half a₁ = 0,
 *   aₙ₊₁ = aₙ/2 + 1, pow2 2ⁿ, quad10 n² − 10n, sign (−1)ⁿ, sign-shift (−1)ⁿ⁺¹, floor10 ⌊10/n⌋, n-pow-alt n^((−1)ⁿ),
 *   ratio10 n¹⁰/2ⁿ.
 *
 * TASKS (ticked only by the learner's own move of the control the task is about, never by a text step, and never in
 * the exact state the last text step produced)
 *   tight-bound    seq ratio: U moved to an upper bound of every term with U < 1.01 (exact: U ≥ 1 = sup).
 *   turn-point     seq quad10, steps on: n₀ moved to 5, the smallest place from which n² − 10n increases.
 *   finite-values  a preset picked whose set of values is finite and which is not eventually constant
 *                  ((−1)ⁿ or (−1)ⁿ⁺¹; ⌊10/n⌋ has finitely many values but is eventually 0).
 *   beat-bound     seq n-pow-alt, U shown and ≥ 50, and the window long enough to hold a term above U.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import {
  VIEW_SEQUENCES,
  evenBeyond,
  isUpperBound,
  isViewSeq,
  monotoneFrom,
  outside,
  rangeOf,
  stepSigns,
  termsOf,
  valueStacks,
  type ViewSeqId,
} from '~/math/seqviews';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo } from './core/canvas';
import { sci } from './core/format';
import { withAlpha } from './core/ink';
import { drawAxes, insetBox, makePlot, niceTicks, type Plot } from './core/plot';
import SimShell, { Slider, Toggle, type TaskDef } from './core/SimShell';

const TASK_LABEL: Record<string, string> = {
  'tight-bound': 'בסדרה ⁦n/(n+1)⁩, הזיזו את החסם מלעיל U למספר קטן מ-⁦1.01⁩ שעדיין חוסם את כל איברי הסדרה, גם את אלה שמחוץ לחלון.',
  'turn-point': 'בסדרה ⁦n² − 10n⁩, הדליקו את סימני העלייה והירידה, והזיזו את ⁦n₀⁩ אל המקום הראשון שממנו והלאה הסדרה עולה.',
  'finite-values': 'מצאו בין הסדרות סדרה שקבוצת הערכים שלה סופית, אבל היא אינה קבועה החל משום מקום.',
  'beat-bound': 'בסדרה ⁦n^((−1)ⁿ)⁩, הדליקו את החסם מלעיל, האריכו את החלון והרימו את U לפחות ל-50, כך שבחלון יופיע איבר מעליו.',
};

type Handle = 'U' | 'm' | 'n0';

interface State {
  seq: ViewSeqId;
  win: number;
  U: number;
  m: number;
  showU: boolean;
  showM: boolean;
  steps: boolean;
  n0: number;
  active: 'U' | 'm';
}

export interface SequenceViewsProps {
  id: string;
  seq?: ViewSeqId;
  seqs?: ViewSeqId[];
  win?: number;
  U?: number;
  m?: number;
  showU?: boolean;
  showM?: boolean;
  steps?: boolean;
  n0?: number;
  tasks?: string[];
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const snap = (x: number, step: number) => Number((Math.round(x / step) * step).toPrecision(12));
const minus = (t: string) => t.replace(/^-/, '−');
const fmt = (v: number) => minus(sci(v, 3));
const taskKey = (s: State) => [s.seq, s.win, s.U, s.m, s.showU, s.showM, s.steps, s.n0].join('|');

/** The defaults of a preset: its window, bound lines near the top and bottom of the drawn range, n₀ = 1. */
function presetState(seq: ViewSeqId, base: Partial<State> = {}): State {
  const p = VIEW_SEQUENCES[seq];
  const win = p.window;
  const [lo, hi] = rangeOf(p, win);
  const span = hi - lo;
  return {
    seq,
    win,
    U: snap(hi - 0.1 * span, p.step),
    m: snap(lo + 0.1 * span, p.step),
    showU: base.showU ?? false,
    showM: base.showM ?? false,
    steps: base.steps ?? false,
    n0: 1,
    active: 'U',
  };
}

function fresh(p: SequenceViewsProps): State {
  const seq = p.seq && isViewSeq(p.seq) ? p.seq : 'ratio';
  const s = presetState(seq, { showU: p.showU, showM: p.showM, steps: p.steps });
  const P = VIEW_SEQUENCES[seq];
  if (typeof p.win === 'number') s.win = clamp(Math.round(p.win), 2, P.winMax);
  if (typeof p.U === 'number') s.U = p.U;
  if (typeof p.m === 'number') s.m = p.m;
  if (typeof p.n0 === 'number') s.n0 = clamp(Math.round(p.n0), 1, s.win);
  return s;
}

/** The step of a slider over the drawn range: the preset's grid, coarsened so that a slider has at most 600 stops. */
function gridOf(seq: ViewSeqId, lo: number, hi: number): number {
  let st = VIEW_SEQUENCES[seq].step;
  while ((hi - lo) / st > 600) st *= 2;
  return st;
}

interface Geo {
  line: { y: number; px: (v: number) => number; wx: (x: number) => number; top: number; bottom: number };
  plot: Plot;
}

export default function SequenceViews(props: SequenceViewsProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));
  const stepKey = useRef<string | null>(null);
  const dragging = useRef<{ h: Handle; panel: 'line' | 'graph' } | null>(null);
  const geo = useRef<Geo | null>(null);

  const P = VIEW_SEQUENCES[s.seq];
  const values = termsOf(P, s.win);
  const [lo, hi] = rangeOf(P, s.win);
  const grid = gridOf(s.seq, lo, hi);
  const signs = stepSigns(values);
  const mono = monotoneFrom(values, s.n0);
  const out = outside(values, s.showU ? s.U : null, s.showM ? s.m : null);
  const stacks = valueStacks(values);

  /** The learner's own change: the only path that can tick a task. */
  const userSet = (patch: Partial<State>) => {
    const next = { ...s, ...patch };
    setS(next);
    if (stepKey.current === taskKey(next)) return;
    const has = (t: string) => props.tasks?.includes(t);
    const moved = (...ks: (keyof State)[]) => ks.some((k) => patch[k] !== undefined && patch[k] !== s[k]);
    const NP = VIEW_SEQUENCES[next.seq];
    if (has('tight-bound') && next.seq === 'ratio' && next.showU && moved('U') && isUpperBound(NP, next.U) && next.U < 1.01) markTask(`${props.id}:tight-bound`);
    if (has('turn-point') && next.seq === 'quad10' && next.steps && moved('n0') && NP.mono && next.n0 === NP.mono.from) markTask(`${props.id}:turn-point`);
    if (has('beat-bound') && next.seq === 'n-pow-alt' && next.showU && moved('U', 'win') && next.U >= 50 && next.win >= evenBeyond(next.U)) markTask(`${props.id}:beat-bound`);
  };

  const pickSeq = (id: ViewSeqId) => {
    if (id === s.seq) return;
    const next = presetState(id, s);
    setS(next);
    const NP = VIEW_SEQUENCES[id];
    if (props.tasks?.includes('finite-values') && NP.valuesFinite && !NP.eventuallyConstant) markTask(`${props.id}:finite-values`);
  };

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          let next = { ...prev };
          if (isViewSeq(st.seq) && st.seq !== prev.seq) next = presetState(st.seq, prev);
          const NP = VIEW_SEQUENCES[next.seq];
          if (typeof st.win === 'number') next.win = clamp(Math.round(st.win), 2, NP.winMax);
          if (typeof st.U === 'number') next.U = st.U;
          if (typeof st.m === 'number') next.m = st.m;
          if (typeof st.showU === 'boolean') next.showU = st.showU;
          if (typeof st.showM === 'boolean') next.showM = st.showM;
          if (typeof st.steps === 'boolean') next.steps = st.steps;
          if (typeof st.n0 === 'number') next.n0 = Math.round(st.n0);
          next.n0 = clamp(next.n0, 1, next.win);
          stepKey.current = taskKey(next);
          return next;
        });
      }),
    [props.id],
  );

  const monoText = (): string => {
    const from = `מ-n₀ = ${s.n0} ועד n = ${s.win}`;
    if (s.n0 >= s.win) return `${from}: יש איבר אחד בלבד, ואין מה להשוות.`;
    if (mono.strictInc) return `${from}: כל צעד הוא עלייה, כלומר עולה ממש בחלון.`;
    if (mono.strictDec) return `${from}: כל צעד הוא ירידה, כלומר יורדת ממש בחלון.`;
    if (mono.inc && mono.dec) return `${from}: כל האיברים שווים, כלומר קבועה בחלון.`;
    if (mono.inc) return `${from}: אין אף ירידה, כלומר עולה בחלון, אבל לא ממש.`;
    if (mono.dec) return `${from}: אין אף עלייה, כלומר יורדת בחלון, אבל לא ממש.`;
    return `${from}: יש עלייה (הראשונה מ-n = ${mono.firstUp}) וגם ירידה (הראשונה מ-n = ${mono.firstDown}), כלומר לא מונוטונית בחלון.`;
  };
  const boundText = (side: 'U' | 'm'): string => {
    const list = side === 'U' ? out.above : out.below;
    const where = side === 'U' ? 'מעליו' : 'מתחתיו';
    const v = side === 'U' ? s.U : s.m;
    if (list.length === 0) return `${side} = ${fmt(v)}: אף איבר בחלון אינו ${where}.`;
    return `${side} = ${fmt(v)}: ${list.length} איברים בחלון ${where}, הראשון ב-n = ${list[0]}.`;
  };
  const describe = () =>
    [
      `${P.formula}, ${s.win} האיברים הראשונים.`,
      `על הישר: ${stacks.length} ערכים שונים.`,
      s.showU ? boundText('U') : '',
      s.showM ? boundText('m') : '',
      s.steps ? monoText() : '',
    ]
      .filter(Boolean)
      .join(' ');

  useEffect(() => {
    const id = setTimeout(() => setLive(describe()), 300);
    return () => clearTimeout(id);
  }, [s]);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const narrow = view.w < 420;
    const ml = narrow ? 46 : 58;
    const mr = narrow ? 30 : 40;
    const lineH = Math.max(70, view.h * 0.27);
    const span = hi - lo;

    // ---- (1) the number line of values
    const lx0 = ml;
    const lx1 = view.w - mr;
    const ly = lineH - 22;
    const lpx = (v: number) => lx0 + ((v - lo) / span) * (lx1 - lx0);
    const lwx = (x: number) => lo + ((x - lx0) / (lx1 - lx0)) * span;
    ctx.save();
    ctx.strokeStyle = p.ink2;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx0, ly);
    ctx.lineTo(lx1, ly);
    ctx.stroke();
    ctx.fillStyle = p.ink2;
    ctx.font = `11px ${p.fontUi}`;
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const t of niceTicks(lo, hi)) {
      const x = lpx(t);
      ctx.beginPath();
      ctx.moveTo(x, ly - 3);
      ctx.lineTo(x, ly + 3);
      ctx.stroke();
      ctx.fillText(fmt(t), x, ly + 5);
    }
    ctx.restore();

    const r = narrow ? 3 : 3.6;
    const dot = (x: number, y: number, kind: 'in' | 'out' | 'plain', rad = r) => {
      ctx.save();
      if (kind === 'out') {
        ctx.fillStyle = p.paper;
        ctx.strokeStyle = p.pointOut;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(x, y, rad + 0.6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = kind === 'in' ? p.pointIn : p.curve;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.restore();
    };
    const kindOf = (v: number): 'in' | 'out' | 'plain' => {
      if (!s.showU && !s.showM) return 'plain';
      if ((s.showU && v > s.U) || (s.showM && v < s.m)) return 'out';
      return 'in';
    };
    const maxStack = Math.max(1, Math.floor((ly - 8) / (2 * r + 1.5)) - 1);
    for (const st of stacks) {
      const x = lpx(st.value);
      if (x < lx0 - 4 || x > lx1 + 4) continue;
      const k = kindOf(st.value);
      const shown = Math.min(st.places.length, maxStack);
      for (let j = 0; j < shown; j++) dot(x, ly - r - 2 - j * (2 * r + 1.5), k);
      if (st.places.length > 1) {
        ctx.save();
        ctx.fillStyle = p.ink2;
        ctx.font = `600 10px ${p.fontUi}`;
        ctx.direction = 'ltr';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`×${st.places.length}`, x + r + 3, ly - r - 2 - (shown - 1) * (2 * r + 1.5));
        ctx.restore();
      }
    }

    // ---- (2) the graph of the points (n, aₙ)
    const box = insetBox({ x: 0, y: lineH + 8, w: view.w, h: view.h - lineH - 8 }, { l: ml, r: mr, t: 10, b: 44 });
    const plot = makePlot(box, { min: 0, max: s.win + 1, label: 'n' }, { min: lo, max: hi, label: 'aₙ' });

    if (s.steps && s.n0 > 1) {
      const xN = plot.px(s.n0 - 0.5);
      ctx.save();
      ctx.fillStyle = withAlpha(p.ink3, 0.1);
      ctx.fillRect(box.x, box.y, Math.max(0, Math.min(xN, box.x + box.w) - box.x), box.h);
      ctx.restore();
    }
    drawAxes(ctx, plot, p);

    // the bound lines, across both panels
    const boundLine = (v: number, label: string, active: boolean) => {
      if (v < lo || v > hi) return;
      ctx.save();
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = active ? 2.2 : 1.6;
      ctx.setLineDash([6, 4]);
      const y = plot.py(v);
      ctx.beginPath();
      ctx.moveTo(box.x, y);
      ctx.lineTo(box.x + box.w, y);
      ctx.stroke();
      const x = lpx(v);
      ctx.beginPath();
      ctx.moveTo(x, 6);
      ctx.lineTo(x, ly + 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = p.accent;
      ctx.font = `700 13px ${p.fontUi}`;
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, box.x + box.w + 5, y);
      ctx.textBaseline = 'top';
      ctx.fillText(label, Math.min(x + 4, lx1 - 10), 4);
      ctx.restore();
    };
    if (s.showU) boundLine(s.U, 'U', s.active === 'U');
    if (s.showM) boundLine(s.m, 'm', s.active === 'm');

    const pr = Math.max(1.8, Math.min(4.4, (box.w / s.win) * 0.3));
    values.forEach((v, i) => {
      const y = clamp(plot.py(v), box.y - 4, box.y + box.h + 4);
      dot(plot.px(i + 1), y, kindOf(v), pr);
    });

    // the steps between consecutive terms, in a strip just above the n axis
    if (s.steps) {
      const gap = box.w / (s.win + 1);
      if (gap >= 5) {
        const sz = Math.min(6, gap * 0.35);
        const yy = box.y + box.h - sz - 3;
        signs.forEach((d, i) => {
          const n = i + 1;
          const x = plot.px(n + 0.5);
          const faded = n < s.n0;
          ctx.save();
          ctx.globalAlpha = faded ? 0.35 : 1;
          if (d === 1) {
            ctx.fillStyle = p.delta;
            ctx.beginPath();
            ctx.moveTo(x, yy - sz);
            ctx.lineTo(x + sz, yy + sz * 0.7);
            ctx.lineTo(x - sz, yy + sz * 0.7);
            ctx.closePath();
            ctx.fill();
          } else if (d === -1) {
            ctx.strokeStyle = p.eps;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(x, yy + sz);
            ctx.lineTo(x + sz, yy - sz * 0.7);
            ctx.lineTo(x - sz, yy - sz * 0.7);
            ctx.closePath();
            ctx.stroke();
          } else {
            ctx.strokeStyle = p.ink2;
            ctx.lineWidth = 1.4;
            for (const dy of [-2, 2]) {
              ctx.beginPath();
              ctx.moveTo(x - sz * 0.8, yy + dy);
              ctx.lineTo(x + sz * 0.8, yy + dy);
              ctx.stroke();
            }
          }
          ctx.restore();
        });
      }
      const xN = plot.px(s.n0 - 0.5);
      ctx.save();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(xN, box.y);
      ctx.lineTo(xN, box.y + box.h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = p.ink;
      ctx.font = `700 13px ${p.fontUi}`;
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`n₀ = ${s.n0}`, Math.min(xN + 5, box.x + box.w - 56), box.y + 2);
      ctx.restore();
    }

    geo.current = { line: { y: ly, px: lpx, wx: lwx, top: 0, bottom: lineH }, plot };
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1.25, worldHeight: 1, animate: false });
  useEffect(invalidate, [s]);

  const moveHandle = (h: Handle, v: number) => {
    if (h === 'n0') userSet({ n0: clamp(Math.round(v), 1, s.win) });
    else userSet({ [h]: snap(clamp(v, lo, hi), grid), active: h } as Partial<State>);
  };
  const valueAt = (h: Handle, panel: 'line' | 'graph', e: PointerEvent): number | null => {
    const g = geo.current;
    if (!g) return null;
    if (h === 'n0') return (e.offsetX - g.plot.box.x) / g.plot.box.w * (s.win + 1) + 0.5;
    if (panel === 'line') return g.line.wx(e.offsetX);
    return lo + ((g.plot.box.y + g.plot.box.h - e.offsetY) / g.plot.box.h) * (hi - lo);
  };
  const onPointerDown = (e: PointerEvent) => {
    const g = geo.current;
    if (!g) return;
    const panel: 'line' | 'graph' = e.offsetY < g.line.bottom ? 'line' : 'graph';
    const cands: { h: Handle; d: number }[] = [];
    if (panel === 'line') {
      if (s.showU) cands.push({ h: 'U', d: Math.abs(e.offsetX - g.line.px(s.U)) });
      if (s.showM) cands.push({ h: 'm', d: Math.abs(e.offsetX - g.line.px(s.m)) });
    } else {
      if (s.showU) cands.push({ h: 'U', d: Math.abs(e.offsetY - g.plot.py(s.U)) });
      if (s.showM) cands.push({ h: 'm', d: Math.abs(e.offsetY - g.plot.py(s.m)) });
      if (s.steps) cands.push({ h: 'n0', d: Math.abs(e.offsetX - g.plot.px(s.n0 - 0.5)) });
    }
    cands.sort((a, b) => a.d - b.d);
    const best = cands[0];
    if (!best || best.d > 28) return;
    dragging.current = { h: best.h, panel };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (best.h !== 'n0') setS({ ...s, active: best.h });
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = dragging.current;
    if (!d) return;
    const v = valueAt(d.h, d.panel, e);
    if (v !== null) moveHandle(d.h, v);
  };
  const onPointerUp = () => {
    dragging.current = null;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && (s.showU || s.showM)) {
      e.preventDefault();
      // the upper line, or the lower one with Shift (or when it is the only one shown)
      const h: 'U' | 'm' = (e.shiftKey && s.showM) || !s.showU ? 'm' : 'U';
      moveHandle(h, (h === 'U' ? s.U : s.m) + (e.key === 'ArrowUp' ? grid : -grid));
    } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && s.steps) {
      e.preventDefault();
      moveHandle('n0', s.n0 + (e.key === 'ArrowRight' ? 1 : -1));
    }
  };

  const offered = props.seqs ?? [];
  return (
    <SimShell
      fig={props.id}
      label={`איור חי של הסדרה ${P.formula} בשתי תצוגות. למעלה, ישר המספרים: כל איבר הוא נקודה בערך שלו, וערך שחוזר במקומות שונים מצויר כערימה של נקודות. למטה, הגרף: הנקודות (n, aₙ) עבור n מ-1 עד ${s.win}, בלי קו שמחבר ביניהן. ${describe()} גררו את קווי החסמים או את קו n₀; במקלדת: חץ למעלה ולמטה מזיז את החסם מלעיל, ועם Shift את החסם מלרע; חץ ימינה ושמאלה מזיז את n₀. החלון מראה מספר סופי של איברים, ולכן הוא עדות ולא הוכחה.`}
      canvasRef={canvasRef}
      aspect={1.25}
      live={live}
      tasks={tasks}
      cursor="grab"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onReset={() => {
        setS(fresh(props));
        stepKey.current = null;
        setLive('האיור אופס.');
      }}
      readout={
        <>
          <span data-readout="seq">
            <bdi dir="ltr">{P.formula}</bdi>, <b class="q">{s.win}</b> איברים
          </span>
          <span data-readout="values">
            על הישר: <b class="q">{stacks.length}</b> ערכים שונים
          </span>
          {s.showU && <span data-readout="upper">{boundText('U')}</span>}
          {s.showM && <span data-readout="lower">{boundText('m')}</span>}
          {s.steps && <span data-readout="steps">{monoText()}</span>}
        </>
      }
      controls={
        <>
          {offered.length > 1 && (
            <div class="group" role="group" aria-label="הסדרה">
              {offered.map((id) => (
                <Toggle key={id} label={VIEW_SEQUENCES[id].name} on={s.seq === id} onChange={() => pickSeq(id)} />
              ))}
            </div>
          )}
          <Slider label="כמה איברים לצייר" value={s.win} min={2} max={P.winMax} step={1} format={(v) => String(Math.round(v))} onChange={(v) => userSet({ win: Math.round(v), n0: clamp(s.n0, 1, Math.round(v)) })} />
          {s.showU && <Slider label="חסם מלעיל U" value={s.U} min={snap(lo, grid)} max={snap(hi, grid)} step={grid} format={fmt} onChange={(v) => userSet({ U: snap(v, grid), active: 'U' })} />}
          {s.showM && <Slider label="חסם מלרע m" value={s.m} min={snap(lo, grid)} max={snap(hi, grid)} step={grid} format={fmt} onChange={(v) => userSet({ m: snap(v, grid), active: 'm' })} />}
          {s.steps && <Slider label="n₀: מאיזה מקום בודקים" value={s.n0} min={1} max={s.win} step={1} format={(v) => String(Math.round(v))} onChange={(v) => userSet({ n0: Math.round(v) })} />}
          <div class="group">
            <Toggle label="חסם מלעיל" on={s.showU} onChange={(on) => userSet({ showU: on, active: 'U' })} />
            <Toggle label="חסם מלרע" on={s.showM} onChange={(on) => userSet({ showM: on, active: 'm' })} />
            <Toggle label="סימני עלייה וירידה" on={s.steps} onChange={(on) => userSet({ steps: on })} />
          </div>
        </>
      }
    />
  );
}
