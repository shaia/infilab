/**
 * Lesson 0.4's figure: hunting a counterexample. A claim "for every n ∈ ℕ, P(n)" and a board of the cases
 * n = 1, 2, 3, … (ten to a row, n growing to the right). The learner checks the cases one by one; each checked n
 * is drawn filled with a tick when P(n) holds, hollow with a cross and a ring when it fails (a counterexample),
 * and, for an implication whose hypothesis fails at n, as a small grey square (the implication holds there).
 * Shape tells the verdicts apart, never colour alone. Unchecked cases are dashed outlines.
 *
 * Every verdict comes from src/math/numbertheory.ts (`CLAIMS`, `tally`), exact integer arithmetic. The board
 * shows a finite window: a window with no counterexample is evidence, never a proof, and the caption says so.
 */

import { useEffect, useState } from 'preact/hooks';
import { CLAIMS, tally, type ClaimId, type Verdict } from '~/math/numbertheory';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo } from './core/canvas';
import { withAlpha } from './core/ink';
import SimShell, { Slider, Toggle, type TaskDef } from './core/SimShell';

const LRI = '⁦';
const PDI = '⁩';
/** a formula (or a lone n, or a number) as an LTR isolate inside Hebrew text, for plain strings */
const iso = (m: string | number) => `${LRI}${m}${PDI}`;
/**
 * A Hebrew string whose formulas sit in LRI … PDI, rendered with each formula in an LTR <bdi>: HTML isolation, so the
 * bidi algorithm never reverses "n² + n + 41" into "41 + n + n²" even where the control characters are not honoured.
 */
function mixed(text: string) {
  return text.split(/⁦([^⁩]*)⁩/).map((part, i) =>
    i % 2 ? (
      <bdi dir="ltr" key={i}>
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}

/** what each task asks for, and the n whose checking (by the learner's own move) completes it */
const TASKS: Record<string, { label: string; claim: ClaimId; reach: number }> = {
  'find-40': {
    label: `בטענה על ${iso('n² + n + 41')}, בדקו מקרה אחר מקרה עד הדוגמה הנגדית הראשונה.`,
    claim: 'euler',
    reach: 40,
  },
  early: {
    label: `בטענה ${iso('2ⁿ > n²')}, בדקו את כל המקרים עד ${iso('n = 20')}, ומצאו את כל הדוגמאות הנגדיות שבאיור.`,
    claim: 'pow',
    reach: 20,
  },
  hypothesis: {
    label: `בגרירה "אם ${iso('n')} ראשוני אז ${iso('2ⁿ − 1')} ראשוני", מצאו את הדוגמה הנגדית הראשונה. מה מצויר כש-${iso('n')} אינו ראשוני?`,
    claim: 'mersenne',
    reach: 11,
  },
  'no-counterexample': {
    label: `בטענה ש-${iso('n² + n')} זוגי, בדקו את כל 50 המקרים שבאיור. מצאתם דוגמה נגדית? והאם עכשיו הטענה מוכחת?`,
    claim: 'even',
    reach: 50,
  },
};

const VERDICT_HE: Record<Verdict, string> = {
  holds: 'מתקיים ✓',
  vacuous: 'ההנחה לא מתקיימת, ולכן הגרירה נכונה',
  fails: 'דוגמה נגדית ✗',
};

interface State {
  claim: ClaimId;
  /** the cases 1 … n are checked; n is the current case */
  n: number;
}

export interface CounterexampleHuntProps {
  id: string;
  claim?: ClaimId;
  /** the claims offered in the picker (none or one: no picker) */
  claims?: ClaimId[];
  n?: number;
  tasks?: string[];
}

const COLS = 10;
/** rows the board is laid out for: the largest window (50) is five rows, so a cell has the same size in every claim */
const ROWS = 5;
const clampN = (claim: ClaimId, n: number) => Math.max(1, Math.min(CLAIMS[claim].max, Math.round(n)));

function fresh(p: CounterexampleHuntProps): State {
  const claim = p.claim ?? 'euler';
  return { claim, n: clampN(claim, p.n ?? 1) };
}

export default function CounterexampleHunt(props: CounterexampleHuntProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASKS[id]?.label ?? id }));

  const claim = CLAIMS[s.claim];
  const cur = claim.evaluate(s.n);
  const t = tally(claim, s.n);

  /**
   * The learner's own change. A text step sets state through subscribeSteps and never ticks a task. A task ticks
   * only when this change moves the checked range from below its target case to at or past it: a step that already
   * shows the target (n = 40 in the Explain part) does not count, and neither does a click elsewhere afterwards.
   */
  const userSet = (patch: Partial<State>) => {
    const next = { ...s, ...patch };
    next.n = clampN(next.claim, next.n);
    setS(next);
    for (const id of props.tasks ?? []) {
      const task = TASKS[id];
      if (task && next.claim === task.claim && s.claim === task.claim && s.n < task.reach && next.n >= task.reach) markTask(`${props.id}:${id}`);
    }
  };

  const pickClaim = (id: ClaimId) => {
    if (id !== s.claim) userSet({ claim: id, n: 1 });
  };

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = { ...prev };
          if (typeof st.claim === 'string' && st.claim in CLAIMS) next.claim = st.claim as ClaimId;
          if (typeof st.n === 'number') next.n = st.n;
          next.n = clampN(next.claim, next.n);
          return next;
        });
      }),
    [props.id],
  );

  /** the tally in Hebrew, every formula and number in an LTR isolate */
  const tallyText = () => {
    const kinds = [`${iso(t.holds)} מתקיימים`];
    if (claim.implication) kinds.push(`ב-${iso(t.vacuous)} ההנחה לא מתקיימת`);
    const many = t.fails.length === 1 ? 'דוגמה נגדית אחת' : `${iso(t.fails.length)} דוגמאות נגדיות`;
    const fails = t.fails.length === 0 ? 'אין דוגמה נגדית עד כאן' : `${many}, הראשונה ב-${iso(`n = ${t.fails[0]}`)}`;
    return `נבדקו המקרים ${iso('n = 1')} עד ${iso(s.n)}: ${kinds.join(', ')}; ${fails}.`;
  };

  useEffect(() => {
    const id = setTimeout(() => setLive(`${iso(`n = ${s.n}`)}: ${iso(cur.math)}, ${cur.note}. ${VERDICT_HE[cur.verdict]}. ${tallyText()}`), 300);
    return () => clearTimeout(id);
  }, [s]);

  /** the board's geometry for the current canvas size */
  const layout = (w: number, h: number) => {
    const top = 46; // clear of the reset and full-screen buttons
    const pad = 10;
    const cell = Math.min((w - 2 * pad) / COLS, (h - top - pad) / ROWS);
    const rows = Math.ceil(claim.max / COLS);
    const x0 = (w - cell * COLS) / 2;
    const y0 = top + (h - top - pad - cell * rows) / 2;
    return { cell, x0, y0 };
  };

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const { cell, x0, y0 } = layout(view.w, view.h);
    const r = cell * 0.3;
    const small = cell < 40;

    // the current case, top left (LTR math)
    ctx.save();
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = p.ink;
    ctx.font = `700 ${small ? 15 : 17}px ${p.fontUi}`;
    ctx.fillText(`n = ${s.n}`, 12, 23);
    ctx.restore();

    for (let k = 1; k <= claim.max; k++) {
      const col = (k - 1) % COLS;
      const row = Math.floor((k - 1) / COLS);
      const cx = x0 + (col + 0.5) * cell;
      const cy = y0 + (row + 0.5) * cell + cell * 0.1;
      ctx.save();

      // the case number above its mark
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.font = `${k === s.n ? 700 : 500} ${small ? 10 : 11}px ${p.fontUi}`;
      ctx.fillStyle = k <= s.n ? p.ink2 : p.ink3;
      ctx.fillText(String(k), cx, cy - r - 2);

      if (k > s.n) {
        // not checked yet
        ctx.strokeStyle = withAlpha(p.ink3, 0.7);
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const v = claim.evaluate(k).verdict;
        if (v === 'holds') {
          ctx.fillStyle = p.pointIn;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, 2 * Math.PI);
          ctx.fill();
          // the tick
          ctx.strokeStyle = p.paper;
          ctx.lineWidth = Math.max(1.6, r * 0.28);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(cx - r * 0.5, cy + r * 0.02);
          ctx.lineTo(cx - r * 0.12, cy + r * 0.4);
          ctx.lineTo(cx + r * 0.52, cy - r * 0.38);
          ctx.stroke();
        } else if (v === 'vacuous') {
          // the hypothesis fails: a small grey square, no mark
          const a = r * 1.05;
          ctx.fillStyle = withAlpha(p.ink3, 0.55);
          ctx.fillRect(cx - a / 2, cy - a / 2, a, a);
        } else {
          // a counterexample: hollow, a cross, and a ring around it
          ctx.fillStyle = p.paper;
          ctx.strokeStyle = p.pointOut;
          ctx.lineWidth = Math.max(1.6, r * 0.2);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          ctx.lineCap = 'round';
          ctx.lineWidth = Math.max(1.6, r * 0.24);
          const c = r * 0.42;
          ctx.beginPath();
          ctx.moveTo(cx - c, cy - c);
          ctx.lineTo(cx + c, cy + c);
          ctx.moveTo(cx + c, cy - c);
          ctx.lineTo(cx - c, cy + c);
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.45, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }

      // the current case: a frame around its cell
      if (k === s.n) {
        ctx.strokeStyle = p.ink;
        ctx.lineWidth = 2;
        const half = cell * 0.47;
        ctx.strokeRect(cx - half, cy - half - cell * 0.08, 2 * half, 2 * half);
      }
      ctx.restore();
    }
  };

  const { canvasRef, invalidate, viewRef } = useFigureCanvas(draw, { worldWidth: 1.6, worldHeight: 1, animate: false });
  useEffect(invalidate, [s]);

  /** the case under the pointer, or null */
  const caseAt = (e: PointerEvent): number | null => {
    const view = viewRef.current;
    if (!view) return null;
    const { cell, x0, y0 } = layout(view.w, view.h);
    const col = Math.floor((e.offsetX - x0) / cell);
    const row = Math.floor((e.offsetY - y0) / cell);
    const k = row * COLS + col + 1;
    if (col < 0 || col >= COLS || row < 0 || k > claim.max) return null;
    return k;
  };
  const onPointerDown = (e: PointerEvent) => {
    const k = caseAt(e);
    if (k !== null && k !== s.n) userSet({ n: k });
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS };
    if (e.key in step) {
      e.preventDefault();
      userSet({ n: s.n + step[e.key] });
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      userSet({ n: e.key === 'Home' ? 1 : claim.max });
    }
  };

  const offered = props.claims ?? [];
  const first = t.fails[0];
  return (
    <SimShell
      fig={props.id}
      label={`איור חי: הטענה "${claim.statement}" נבדקת מקרה אחר מקרה, ${iso('n')} מ-1 עד ${claim.max}, עשרה מקרים בשורה. מקרה שבו הטענה מתקיימת מצויר עיגול מלא עם וי; דוגמה נגדית מצוירת עיגול חלול עם איקס וטבעת${claim.implication ? '; מקרה שבו ההנחה של הגרירה לא מתקיימת מצויר ריבוע אפור קטן' : ''}; מקרה שעוד לא נבדק מצויר בקו מקווקו. כרגע נבדקו המקרים 1 עד ${s.n}: ${t.holds} מתקיימים, ${first === undefined ? 'אין דוגמה נגדית' : `הדוגמה הנגדית הראשונה ב-${iso(`n = ${first}`)}`}. לחצו על מקרה כדי לבדוק עד אליו; במקלדת: חץ ימינה ושמאלה מקרה אחד, חץ למטה ולמעלה שורה.`}
      canvasRef={canvasRef}
      aspect={1.6}
      live={live}
      tasks={tasks}
      cursor="pointer"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onReset={() => {
        setS(fresh(props));
        setLive('האיור אופס.');
      }}
      readout={
        <>
          <span data-readout="claim">
            הטענה: <b>{mixed(claim.statement)}</b>
          </span>
          <span data-readout="current">
            <bdi dir="ltr" class="q">n = {s.n}</bdi>: <bdi dir="ltr">{cur.math}</bdi>, {mixed(cur.note)}. <b>{VERDICT_HE[cur.verdict]}</b>.
          </span>
          <span data-readout="tally">{mixed(tallyText())}</span>
        </>
      }
      controls={
        <>
          {offered.length > 1 && (
            <div class="group" role="group" aria-label="הטענה">
              {offered.map((id) => (
                <Toggle key={id} label={mixed(CLAIMS[id].name)} on={s.claim === id} onChange={() => pickClaim(id)} />
              ))}
            </div>
          )}
          <div class="group">
            <button type="button" class="toggle" data-action="prev" onClick={() => userSet({ n: s.n - 1 })} disabled={s.n <= 1}>
              המקרה הקודם
            </button>
            <button type="button" class="toggle" data-action="next" onClick={() => userSet({ n: s.n + 1 })} disabled={s.n >= claim.max}>
              המקרה הבא
            </button>
          </div>
          <Slider label="בודקים עד n" value={s.n} min={1} max={claim.max} step={1} format={(v) => String(Math.round(v))} onChange={(v) => userSet({ n: Math.round(v) })} />
        </>
      }
    />
  );
}
