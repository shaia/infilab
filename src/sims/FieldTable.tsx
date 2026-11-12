/**
 * Lesson 1.1's figure: the tables of ⊕ and ⊙ in ℤ_n = {0, 1, …, n − 1} (Definition 1.1.14), n chosen by a slider
 * (2 … 13), one table at a time. A cell (a, b) holds a ⊕ b or a ⊙ b; the student picks a cell (pointer or arrow
 * keys) and the readout says what it means.
 *
 * What the table marks (shape and colour, never colour alone; colours from tokens.css via readPalette):
 * - the neutral element of the row's equation: in ⊙ every cell holding 1 (a ⊙ b = 1: b is the inverse of a), in ⊕
 *   every cell holding 0 (b is the negative of a): a filled disc in the δ-band colour behind the number;
 * - in ⊙, a row a ≠ 0 with no 1 (a has no inverse): the row is tinted with the ε-band colour and its header carries
 *   a hollow ring, while a row with an inverse carries a filled dot;
 * - in ⊙, a cell a ⊙ b = 0 with a, b ≠ 0 (zero divisors): a hollow square in the ε colour around the number.
 *
 * Every value comes from src/math/modular.ts (`table`, `inverse`, `nonInvertible`, `isField`), which checks every
 * cell and every axiom: for the n on screen the verdict "ℤ_n is (not) a field" is a complete check, not a probe.
 * Nothing moves, so there is no animation for motionAllowed() to gate; the canvas loop (useFigureCanvas) honours it.
 *
 * Props: `n` (default 7), `op` ('add' | 'mul', default 'mul'), `a`, `b` (a selected cell, or none), `tasks`.
 * Task ids: `inverse-3` (in ℤ_7, pick the cell of ⊙ that shows the inverse of 3), `no-inverse` (pick, in ⊙, a cell
 * of a row a ≠ 0 that has no 1, for some n), `zero-product` (in ℤ_6, pick a cell a ⊙ b = 0 with a, b ≠ 0).
 * Tasks are ticked only by the student's own move, and never in the exact state the last text step produced.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import { add, inverse, isField, mul, nonInvertible, table, type Op } from '~/math/modular';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo } from './core/canvas';
import SimShell, { Slider, Toggle, type TaskDef } from './core/SimShell';

const N_MIN = 2;
const N_MAX = 13;

const TASK_LABEL: Record<string, string> = {
  'inverse-3': 'ב-ℤ₇, בטבלת הכפל, בחרו את התא שמראה את ההופכי של 3.',
  'no-inverse': 'בחרו n ובטבלת הכפל בחרו תא בשורה של איבר ששונה מאפס ואין לו הופכי (אין 1 בשורה שלו).',
  'zero-product': 'ב-ℤ₆, בטבלת הכפל, בחרו תא של שני איברים ששונים מאפס שמכפלתם 0.',
};

const SUB: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
/** ℤ_n with a subscript: ℤ₇, ℤ₁₃. */
const zName = (n: number) => `ℤ${String(n).replace(/\d/g, (d) => SUB[d])}`;
const SIGN: Record<Op, string> = { add: '⊕', mul: '⊙' };

interface State {
  n: number;
  op: Op;
  /** the selected cell (row a, column b), or none */
  a: number | null;
  b: number | null;
}

export interface FieldTableProps {
  id: string;
  n?: number;
  op?: Op;
  a?: number;
  b?: number;
  tasks?: string[];
}

const clampN = (n: number) => Math.max(N_MIN, Math.min(N_MAX, Math.round(n)));

function fresh(p: FieldTableProps): State {
  const n = clampN(p.n ?? 7);
  const ok = (v: number | undefined) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < n ? v : null);
  const a = ok(p.a);
  const b = ok(p.b);
  return { n, op: p.op ?? 'mul', a: a !== null && b !== null ? a : null, b: a !== null && b !== null ? b : null };
}

/** The quantities a task looks at, as a string: the state a step produced is skipped exactly. */
const taskKey = (s: State) => `${s.n}|${s.op}|${s.a}|${s.b}`;

/** What the selected cell means, in one Hebrew sentence (also the screen-reader line). */
function cellMeaning(s: State): string {
  if (s.a === null || s.b === null) return 'בחרו תא בטבלה.';
  const { n, op, a, b } = s;
  const v = op === 'add' ? add(a, b, n) : mul(a, b, n);
  const head = `${a} ${SIGN[op]} ${b} = ${v} ב-${zName(n)}`;
  if (op === 'add') return v === 0 ? `${head}: לכן ${b} הוא הנגדי של ${a}.` : `${head}.`;
  if (v === 1) return `${head}: לכן ${b} הוא ההופכי של ${a}.`;
  if (v === 0 && a !== 0 && b !== 0) return `${head}: שני איברים ששונים מאפס, ומכפלתם 0.`;
  return `${head}.`;
}

/** The verdict on ℤ_n, from the exhaustive check. */
function fieldVerdict(n: number, op: Op): string {
  if (op === 'add') return `בכל שורה של טבלת החיבור יש 0: לכל איבר של ${zName(n)} יש נגדי.`;
  if (isField(n)) return `${zName(n)} שדה: בכל אחת מ-${n - 1} השורות של איבר ששונה מאפס יש 1.`;
  const bad = nonInvertible(n);
  return `${zName(n)} אינו שדה: ל-${bad.join(', ')} אין הופכי (אין 1 בשורות שלהם).`;
}

export default function FieldTable(props: FieldTableProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));
  const stepKey = useRef<string | null>(null);
  const geo = useRef<{ x0: number; y0: number; c: number; n: number } | null>(null);

  /** The student's own change: the only path that can tick a task. */
  const userSet = (patch: Partial<State>) => {
    const next = { ...s, ...patch };
    if (next.a !== null && next.a >= next.n) next.a = null;
    if (next.b !== null && next.b >= next.n) next.b = null;
    if (next.a === null || next.b === null) {
      next.a = null;
      next.b = null;
    }
    setS(next);
    if (taskKey(next) === stepKey.current) return;
    const has = (t: string) => props.tasks?.includes(t);
    const { n, op, a, b } = next;
    if (op !== 'mul' || a === null || b === null) return;
    if (has('inverse-3') && n === 7 && ((a === 3 && b === 5) || (a === 5 && b === 3))) markTask(`${props.id}:inverse-3`);
    if (has('no-inverse') && a !== 0 && inverse(a, n) === null) markTask(`${props.id}:no-inverse`);
    if (has('zero-product') && n === 6 && a !== 0 && b !== 0 && mul(a, b, n) === 0) markTask(`${props.id}:zero-product`);
  };

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = { ...prev };
          if (typeof st.n === 'number') next.n = clampN(st.n);
          if (st.op === 'add' || st.op === 'mul') next.op = st.op;
          const a = typeof st.a === 'number' && st.a >= 0 && st.a < next.n ? st.a : null;
          const b = typeof st.b === 'number' && st.b >= 0 && st.b < next.n ? st.b : null;
          next.a = a !== null && b !== null ? a : null;
          next.b = a !== null && b !== null ? b : null;
          stepKey.current = taskKey(next);
          return next;
        });
      }),
    [props.id],
  );

  useEffect(() => {
    const id = setTimeout(() => setLive(`${cellMeaning(s)} ${fieldVerdict(s.n, s.op)}`), 300);
    return () => clearTimeout(id);
  }, [s]);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const { n, op } = s;
    const T = table(n, op);
    const target = op === 'mul' ? 1 : 0;
    const bad = new Set(op === 'mul' ? nonInvertible(n) : []);
    const pad = 10;
    const top = 44; // the reset / full-screen buttons sit over the top edge
    const k = n + 1; // header + n cells
    const c = Math.floor(Math.min((view.w - 2 * pad) / k, (view.h - pad - top) / k));
    if (c <= 0) return; // before layout the canvas has no size
    const x0 = Math.round((view.w - c * k) / 2);
    const y0 = top + Math.round((view.h - pad - top - c * k) / 2);
    geo.current = { x0, y0, c, n };
    const fs = Math.max(10, Math.min(18, Math.floor(c * 0.46)));
    const font = (w: number) => `${w} ${fs}px ${p.fontUi}`;
    const cx = (j: number) => x0 + (j + 1) * c + c / 2; // centre of column j
    const cy = (i: number) => y0 + (i + 1) * c + c / 2; // centre of row i

    // headers
    ctx.fillStyle = p.paper2;
    ctx.fillRect(x0, y0, c * k, c);
    ctx.fillRect(x0, y0, c, c * k);
    // rows without an inverse: tinted with the ε-band
    for (const a of bad) {
      ctx.fillStyle = p.epsBand;
      ctx.fillRect(x0 + c, y0 + (a + 1) * c, c * n, c);
    }
    // the selected row and column: a light rule colour
    if (s.a !== null && s.b !== null) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = p.rule;
      ctx.fillRect(x0, y0 + (s.a + 1) * c, c * k, c);
      ctx.fillRect(x0 + (s.b + 1) * c, y0, c, c * k);
      ctx.restore();
    }
    // grid
    ctx.strokeStyle = p.rule;
    ctx.lineWidth = 1;
    for (let i = 0; i <= k; i++) {
      ctx.beginPath();
      ctx.moveTo(x0 + i * c + 0.5, y0);
      ctx.lineTo(x0 + i * c + 0.5, y0 + c * k);
      ctx.moveTo(x0, y0 + i * c + 0.5);
      ctx.lineTo(x0 + c * k, y0 + i * c + 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = p.ink2;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0 + c, y0);
    ctx.lineTo(x0 + c, y0 + c * k);
    ctx.moveTo(x0, y0 + c);
    ctx.lineTo(x0 + c * k, y0 + c);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'ltr';
    // the corner: the operation
    ctx.font = font(700);
    ctx.fillStyle = p.ink;
    ctx.fillText(SIGN[op], x0 + c / 2, y0 + c / 2);
    for (let j = 0; j < n; j++) {
      ctx.fillText(String(j), cx(j), y0 + c / 2);
      ctx.fillText(String(j), x0 + c / 2 + (op === 'mul' && j > 0 ? c * 0.12 : 0), cy(j));
    }
    // row markers in ⊙: a filled dot for an element with an inverse, a hollow ring for one without
    if (op === 'mul') {
      const r = Math.max(2.5, c * 0.09);
      for (let a = 1; a < n; a++) {
        const mx = x0 + c * 0.2;
        const my = cy(a);
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, 2 * Math.PI);
        if (bad.has(a)) {
          ctx.strokeStyle = p.pointOut;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = p.pointIn;
          ctx.fill();
        }
      }
    }
    // cells
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++) {
        const v = T[a][b];
        const x = cx(b);
        const y = cy(a);
        const isTarget = v === target && (op === 'add' || a !== 0);
        const zeroDiv = op === 'mul' && v === 0 && a !== 0 && b !== 0;
        if (isTarget) {
          ctx.beginPath();
          ctx.arc(x, y, c * 0.36, 0, 2 * Math.PI);
          ctx.fillStyle = p.deltaBand;
          ctx.fill();
          ctx.strokeStyle = p.delta;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        if (zeroDiv) {
          const h = c * 0.34;
          ctx.strokeStyle = p.eps;
          ctx.lineWidth = 2;
          ctx.strokeRect(x - h, y - h, 2 * h, 2 * h);
        }
        ctx.font = font(isTarget || zeroDiv ? 700 : 400);
        ctx.fillStyle = isTarget ? p.delta : zeroDiv ? p.eps : p.ink2;
        ctx.fillText(String(v), x, y);
      }
    // the selected cell: a dashed ink frame
    if (s.a !== null && s.b !== null) {
      ctx.save();
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x0 + (s.b + 1) * c + 2, y0 + (s.a + 1) * c + 2, c - 4, c - 4);
      ctx.restore();
    }
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1, worldHeight: 1, animate: false });
  useEffect(invalidate, [s]);

  const onPointerDown = (e: PointerEvent) => {
    const g = geo.current;
    if (!g) return;
    const j = Math.floor((e.offsetX - g.x0) / g.c) - 1;
    const i = Math.floor((e.offsetY - g.y0) / g.c) - 1;
    if (i >= 0 && i < g.n && j >= 0 && j < g.n) userSet({ a: i, b: j });
    else if (j === -1 && i >= 0 && i < g.n) userSet({ a: i, b: s.b ?? 0 });
    else if (i === -1 && j >= 0 && j < g.n) userSet({ a: s.a ?? 0, b: j });
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    const a = s.a ?? 1;
    const b = s.b ?? 1;
    const wrap = (v: number) => (v + s.n) % s.n;
    userSet(s.a === null ? { a: Math.min(1, s.n - 1), b: Math.min(1, s.n - 1) } : { a: wrap(a + m[0]), b: wrap(b + m[1]) });
  };

  return (
    <SimShell
      fig={props.id}
      label={`איור חי: טבלת ה${s.op === 'mul' ? 'כפל' : 'חיבור'} של ${zName(s.n)}, ${s.n} שורות ו-${s.n} עמודות. ${cellMeaning(s)} ${fieldVerdict(s.n, s.op)} לחצו על תא כדי לבחור אותו; במקלדת: מקשי החצים מזיזים את התא הנבחר.`}
      canvasRef={canvasRef}
      aspect={1}
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
          <span data-readout="cell">{cellMeaning(s)}</span>
          <span data-readout="field">{fieldVerdict(s.n, s.op)}</span>
        </>
      }
      controls={
        <>
          <div class="group" role="group" aria-label="הטבלה">
            <Toggle label={<>חיבור <bdi dir="ltr">⊕</bdi></>} on={s.op === 'add'} onChange={() => userSet({ op: 'add' })} />
            <Toggle label={<>כפל <bdi dir="ltr">⊙</bdi></>} on={s.op === 'mul'} onChange={() => userSet({ op: 'mul' })} />
          </div>
          <Slider label="n" value={s.n} min={N_MIN} max={N_MAX} step={1} format={(v) => String(v)} onChange={(v) => userSet({ n: clampN(v) })} />
        </>
      }
    />
  );
}
