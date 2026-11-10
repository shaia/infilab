/**
 * Lesson 2.2's figure: the definition of a limit, drawn. The terms aₙ of a sequence as points over n, the
 * candidate limit L as a line, the ε-band (L − ε, L + ε) around it, and an N line the student drags. The
 * definition asks for every term after N to lie inside the band: such terms are drawn filled, terms after N
 * outside the band hollow with a ring (shape, not only colour), and the terms up to N small and grey, since
 * the definition ignores them. Narrowing the band (a smaller ε) shows that N has to move right: N depends on ε.
 *
 * Every count comes from src/math/sequences.ts (`smallestN`, `outsideAfter`, `inBand`) over the visible window:
 * the figure gathers evidence for a proof's N(ε); it proves nothing about the terms beyond the window, and the
 * caption says so.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import { EPSILONS, SEQUENCES, inBand, outsideAfter, smallestN, type SequenceId } from '~/math/sequences';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo } from './core/canvas';
import { sci } from './core/format';
import { withAlpha } from './core/ink';
import { drawAxes, insetBox, makePlot, type Plot } from './core/plot';
import SimShell, { Slider, Toggle, type TaskDef } from './core/SimShell';

const TASK_LABEL: Record<string, string> = {
  'find-N': 'בסדרה ⁦1/n⁩, עם ⁦ε = 0.1⁩ או קטן יותר, הזיזו את N אל ה-N הקטן ביותר שמתאים: מימינו אין אף איבר מחוץ לרצועה.',
  narrow: 'צמצמו את הרצועה עד ⁦ε = 0.02⁩ או פחות, ומצאו שוב N שמתאים.',
  wild: 'בסדרה עם ההתחלה הפרועה, עם ⁦ε = 0.1⁩ או פחות, מצאו N שמתאים.',
  'no-N': 'בסדרה ⁦(−1)ⁿ⁩ נסו למצוא N שמתאים לרצועה סביב 1: הזיזו את N לפחות עד 30.',
};

interface State {
  seq: SequenceId;
  /** index into EPSILONS */
  ei: number;
  N: number;
  /** the candidate limit (the preset's limit, or the student's choice for a divergent sequence) */
  L: number;
  showMin: boolean;
}

export interface SequenceStripProps {
  id: string;
  seq?: SequenceId;
  /** the sequences offered in the picker (none or one: no picker) */
  seqs?: SequenceId[];
  eps?: number;
  N?: number;
  showMin?: boolean;
  tasks?: string[];
}

const N_MAX = 500;
/** where the smallest N is searched: 1/√n at ε = 0.005 needs N = 40 000, and smallestN wants it in the first half */
const SEARCH = 200_000;
/**
 * The terms the verdict checks, N < n ≤ checkUpTo(N): always far past N and past the drawn window, so N at the window's
 * edge is never "fitting" because nothing after it was looked at. Evidence on a finite range, as the caption says.
 */
const checkUpTo = (N: number, win: number) => Math.max(2_000, win, 4 * N + 100);
const nearestEps = (e: number) =>
  EPSILONS.reduce((best, v, i) => (Math.abs(Math.log(v / e)) < Math.abs(Math.log(EPSILONS[best] / e)) ? i : best), 0);
const limitOf = (seq: SequenceId) => SEQUENCES[seq].limit ?? SEQUENCES[seq].candidate ?? 0;
/** a typographic minus sign in front of negative numbers */
const minus = (t: string) => t.replace(/^-/, '−');
const fmt = (v: number) => minus(sci(v, 3));

function fresh(p: SequenceStripProps): State {
  const seq = p.seq ?? 'recip';
  return { seq, ei: nearestEps(p.eps ?? 0.1), N: p.N ?? 0, L: limitOf(seq), showMin: p.showMin ?? false };
}

/** The n-window: the preset's, widened so that both the student's N and the smallest N fit with room after them. */
function windowOf(s: State, minN: number | null): number {
  const base = SEQUENCES[s.seq].window;
  const need = Math.ceil(Math.max(s.N, minN ?? 0) * 1.35) + 5;
  return Math.min(N_MAX, Math.max(base, need));
}

export default function SequenceStrip(props: SequenceStripProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));
  const dragging = useRef(false);
  const plotRef = useRef<Plot | null>(null);

  const seq = SEQUENCES[s.seq];
  const eps = EPSILONS[s.ei];
  // the smallest N is searched on a long window, independent of what is drawn
  const minN = smallestN(seq.a, s.L, eps, SEARCH);
  const win = windowOf(s, minN);
  const upTo = checkUpTo(s.N, win);
  const outside = outsideAfter(seq.a, s.L, eps, s.N, upTo);
  const works = outside.length === 0;

  /**
   * The student's own change. A text step sets state through subscribeSteps and never ticks a task, and a task ticks
   * only when this change moves the control it is about (N or ε): a step may already have put the figure in the goal
   * state (2.2's second step sets N = 10 for 1/n), and toggling an unrelated control must not count as finding it.
   */
  const userSet = (patch: Partial<State>) => {
    const next = { ...s, ...patch };
    setS(next);
    const has = (t: string) => props.tasks?.includes(t);
    const movedN = patch.N !== undefined;
    const movedNorEps = movedN || patch.ei !== undefined;
    const e = EPSILONS[next.ei];
    const p = SEQUENCES[next.seq];
    const nMin = smallestN(p.a, next.L, e, SEARCH);
    const ok = outsideAfter(p.a, next.L, e, next.N, checkUpTo(next.N, windowOf(next, nMin))).length === 0;
    if (has('find-N') && movedN && next.seq === 'recip' && e <= 0.1 && nMin !== null && next.N === nMin) markTask(`${props.id}:find-N`);
    if (has('narrow') && movedNorEps && p.limit !== null && e <= 0.02 && ok) markTask(`${props.id}:narrow`);
    if (has('wild') && movedNorEps && next.seq === 'wild-start' && e <= 0.1 && ok) markTask(`${props.id}:wild`);
    if (has('no-N') && movedN && next.seq === 'sign' && Math.abs(next.L - 1) < 1e-9 && next.N >= 30) markTask(`${props.id}:no-N`);
  };

  const pickSeq = (id: SequenceId) => userSet({ seq: id, L: limitOf(id), N: 0 });

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = { ...prev };
          if (typeof st.seq === 'string' && st.seq in SEQUENCES) {
            next.seq = st.seq as SequenceId;
            next.L = limitOf(next.seq);
          }
          if (typeof st.eps === 'number') next.ei = nearestEps(st.eps);
          if (typeof st.N === 'number') next.N = Math.max(0, Math.min(N_MAX, Math.round(st.N)));
          if (typeof st.L === 'number') next.L = st.L;
          if (typeof st.showMin === 'boolean') next.showMin = st.showMin;
          return next;
        });
      }),
    [props.id],
  );

  useEffect(() => {
    const id = setTimeout(() => {
      const parts = [`${seq.formula}, רצועה סביב ${fmt(s.L)} עם ε = ${fmt(eps)}, N = ${s.N}.`];
      parts.push(works ? 'כל האיברים אחרי N בחלון נמצאים בתוך הרצועה.' : `${outside.length} איברים אחרי N מחוץ לרצועה, הראשון ב-n = ${outside[0]}.`);
      if (s.showMin) parts.push(minN === null ? 'אין N שמתאים.' : `ה-N הקטן ביותר שמתאים: ${minN}.`);
      setLive(parts.join(' '));
    }, 300);
    return () => clearTimeout(id);
  }, [s]);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const narrow = view.w < 420;
    // the right margin holds the L and L ± ε labels, so they never sit on top of the terms
    const box = insetBox({ x: 0, y: 0, w: view.w, h: view.h }, { l: narrow ? 46 : 56, r: narrow ? 40 : 50, t: 24, b: 46 });
    const plot = makePlot(box, { min: 0, max: win + 1, label: 'n' }, { min: seq.y[0], max: seq.y[1], label: 'aₙ' });
    plotRef.current = plot;

    // the ignored terms: everything up to N
    const xN = plot.px(s.N + 0.5);
    if (s.N > 0) {
      ctx.save();
      ctx.fillStyle = withAlpha(p.ink3, 0.1);
      ctx.fillRect(box.x, box.y, Math.max(0, Math.min(xN, box.x + box.w) - box.x), box.h);
      ctx.restore();
    }

    // the ε-band and the candidate limit
    const yTop = plot.py(s.L + eps);
    const yBot = plot.py(s.L - eps);
    ctx.save();
    ctx.fillStyle = p.epsBand;
    ctx.fillRect(box.x, yTop, box.w, yBot - yTop);
    ctx.strokeStyle = p.eps;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    for (const y of [yTop, yBot]) {
      ctx.beginPath();
      ctx.moveTo(box.x, y);
      ctx.lineTo(box.x + box.w, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = p.limit;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(box.x, plot.py(s.L));
    ctx.lineTo(box.x + box.w, plot.py(s.L));
    ctx.stroke();
    ctx.restore();

    drawAxes(ctx, plot, p);

    // labels in the right margin: L on its line, the band edges beside them when there is room
    ctx.save();
    ctx.font = `600 ${narrow ? 12 : 13}px ${p.fontUi}`;
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const lx = box.x + box.w + 5;
    ctx.fillStyle = p.limit;
    ctx.fillText('L', lx, plot.py(s.L));
    if (yBot - yTop > 30) {
      ctx.fillStyle = p.eps;
      ctx.fillText('L+ε', lx, yTop);
      ctx.fillText('L−ε', lx, yBot);
    }
    ctx.restore();

    // the terms
    // a point never takes more than about a third of the space one term gets, so rings do not merge on a phone
    const r = Math.max(1.8, Math.min(4.6, (box.w / win) * 0.3));
    for (let n = 1; n <= win; n++) {
      const v = seq.a(n);
      const x = plot.px(n);
      const y = Math.max(box.y - 4, Math.min(box.y + box.h + 4, plot.py(v)));
      ctx.save();
      if (n <= s.N) {
        ctx.fillStyle = p.ink3;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.6, r * 0.6), 0, 2 * Math.PI);
        ctx.fill();
      } else if (inBand(v, s.L, eps)) {
        ctx.fillStyle = p.pointIn;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        ctx.fillStyle = p.paper;
        ctx.strokeStyle = p.pointOut;
        ctx.lineWidth = Math.max(1.6, r * 0.45);
        ctx.beginPath();
        ctx.arc(x, y, r + 0.6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        // the ring: an outside term is told by shape, not only by colour
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.8 + 1, 0, 2 * Math.PI);
        ctx.stroke();
      }
      ctx.restore();
    }

    // the N line
    if (xN >= box.x && xN <= box.x + box.w) {
      ctx.save();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(xN, box.y);
      ctx.lineTo(xN, box.y + box.h);
      ctx.stroke();
      ctx.setLineDash([]);
      // above the plot, to the right of the line, clear of the y-axis ticks
      ctx.fillStyle = p.ink;
      ctx.font = `700 14px ${p.fontUi}`;
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`N = ${s.N}`, Math.min(xN + 5, box.x + box.w - 50), box.y - 4);
      ctx.restore();
    }
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1.5, worldHeight: 1, animate: false });
  useEffect(invalidate, [s]);

  const nFromPointer = (e: PointerEvent) => {
    const plot = plotRef.current;
    if (!plot) return null;
    const n = ((e.offsetX - plot.box.x) / plot.box.w) * (win + 1) - 0.5;
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
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      userSet({ N: Math.max(0, Math.min(N_MAX, s.N + (e.key === 'ArrowRight' ? 1 : -1))) });
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      userSet({ ei: Math.max(0, Math.min(EPSILONS.length - 1, s.ei + (e.key === 'ArrowDown' ? 1 : -1))) });
    }
  };

  const offered = props.seqs ?? [];
  return (
    <SimShell
      fig={props.id}
      label={`איור חי: איברי הסדרה ${seq.formula} כנקודות מעל n. קו הגבול L = ${fmt(s.L)}, ורצועה של המספרים שמרחקם ממנו קטן מ-ε = ${fmt(eps)}. קו אנכי מסמן את N = ${s.N}: איברים אחריו בתוך הרצועה מלאים, ואיברים אחריו מחוץ לרצועה חלולים ומוקפים בטבעת. ${works ? `כרגע כל האיברים מ-N + 1 עד ${upTo} בתוך הרצועה.` : `כרגע ${outside.length} איברים אחרי N, עד ${upTo}, מחוץ לרצועה.`} גררו את קו ה-N; במקלדת: חץ ימינה ושמאלה מזיז את N, חץ למטה מצמצם את הרצועה.`}
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
        setLive('האיור אופס.');
      }}
      readout={
        <>
          <span>
            הרצועה: <b class="q" data-readout="eps">ε = {fmt(eps)}</b>
          </span>
          <span>
            <b class="q" data-readout="N">N = {s.N}</b>
          </span>
          <span data-readout="verdict">
            {works ? (
              <>
                כל האיברים אחרי N, עד <b class="q">n = {upTo}</b>, בתוך הרצועה: ה-N הזה מתאים (על הטווח שנבדק).
              </>
            ) : (
              <>
                אחרי N, עד <b class="q">n = {upTo}</b>, יש <b class="q">{outside.length}</b> איברים מחוץ לרצועה, הראשון ב-<b class="q">n = {outside[0]}</b>.
              </>
            )}
          </span>
          {s.showMin && (
            <span data-readout="min">
              {minN === null ? <>אין N שמתאים לרצועה הזו.</> : (
                <>
                  ה-N הקטן ביותר שמתאים: <b class="q">{minN}</b>
                </>
              )}
            </span>
          )}
        </>
      }
      controls={
        <>
          {offered.length > 1 && (
            <div class="group" role="group" aria-label="הסדרה">
              {offered.map((id) => (
                <Toggle key={id} label={SEQUENCES[id].name} on={s.seq === id} onChange={() => pickSeq(id)} />
              ))}
            </div>
          )}
          <Slider
            label="ε: המרחק המותר מ-L"
            // forward narrows the band, like the arrow-down key: the lesson's move is "shrink ε"
            value={s.ei}
            min={0}
            max={EPSILONS.length - 1}
            step={1}
            format={(v) => fmt(EPSILONS[Math.round(v)])}
            onChange={(v) => userSet({ ei: Math.round(v) })}
          />
          <Slider label="N" value={s.N} min={0} max={Math.min(N_MAX, Math.max(60, win))} step={1} format={(v) => String(Math.round(v))} onChange={(v) => userSet({ N: Math.round(v) })} />
          {seq.limit === null && (
            <Slider label="הגבול המועמד L" value={s.L} min={-1.5} max={1.5} step={0.1} format={fmt} onChange={(v) => userSet({ L: Math.round(v * 10) / 10 })} />
          )}
          <div class="group">
            <Toggle label="הראו את ה-N הקטן ביותר" on={s.showMin} onChange={(on) => userSet({ showMin: on })} />
          </div>
        </>
      }
    />
  );
}
