/**
 * Lesson 0.3's figure: a statement with two quantifiers, played as a game. A relation R(x, y) on
 * {1..6} × {1..6} is drawn as a grid of points, x to the right and y up (math space, LTR): a point where R
 * holds is filled, a point where it fails is hollow (shape, not only colour).
 *
 * The statement "Q₁ v₁ Q₂ v₂: R(x, y)" is read left to right as a game: the prover chooses every ∃, the
 * refuter every ∀, each seeing the earlier choices, and the prover wins when R holds at the chosen point.
 * The student takes one side and the figure plays the other with its best moves (`bestFirstMoves`,
 * `bestSecondMoves` in src/math/quantifiers.ts), so the side whose statement is true always can win and the
 * other side never can. A ∀ choice is drawn as a warm band (the opponent's choice, like ε in lesson 2.2), a ∃
 * choice as a cool band. "Show the answer" marks the witness of a true statement or the counterexample of a
 * false one, which is the witness of its negation. On a finite grid every verdict is exact.
 *
 * Tasks tick only on the student's own move that ends a round; a text step only sets the preset, the order and
 * the side, and starts a fresh round, so it can never finish one.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import {
  ORDERS,
  RELATIONS,
  bestFirstMoves,
  bestSecondMoves,
  counterexample,
  formulaText,
  holds,
  negatePrefix,
  other,
  owner,
  pointOf,
  winner,
  witness,
  type Certificate,
  type OrderId,
  type RelationId,
  type Side,
  type Var,
} from '~/math/quantifiers';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo } from './core/canvas';
import { withAlpha } from './core/ink';
import SimShell, { Toggle, type TaskDef } from './core/SimShell';

const TASK_LABEL: Record<string, string> = {
  'win-forall-exists': 'בטענה ⁦∀x ∃y⁩ שחקו את המוכיחים ונצחו בסיבוב: המחשב בוחר ⁦x⁩, ואתם עונים ב-⁦y⁩.',
  'lose-exists-forall':
    'בטענה ⁦∃y ∀x⁩, על תנאי שבו ⁦∀x ∃y⁩ נכונה, בחרו שלושה ⁦y⁩ שונים, וראו שהמחשב מוצא נגד כל אחד ⁦x⁩ שמפיל אותו.',
  'win-exists-forall': 'מצאו תנאי שבו ⁦∃y ∀x⁩ או ⁦∃x ∀y⁩ נכונה, ונצחו בה כמוכיחים: בחרו קו שכולו נקודות מלאות.',
  negate: 'שחקו את המפריכים בטענה שקרית ונצחו: מצאו את הנקודה החלולה שהשלילה מבטיחה.',
};

const SIDE_NAME: Record<Side, string> = { prover: 'המוכיחים', refuter: 'המפריכים' };
/** an LTR isolate (U+2066 … U+2069): math inside a Hebrew sentence keeps its order */
const iso = (t: string) => `⁦${t}⁩`;
/**
 * A string whose math sits in isolates, rendered with each fragment in its own <bdi dir="ltr">: the control
 * characters alone already keep the order, the element makes it independent of the text's surroundings.
 */
const rich = (t: string) =>
  t.split(/⁦([^⁩]*)⁩/).map((part, i) => (i % 2 ? <bdi dir="ltr" class="ltr" key={i}>{part}</bdi> : part));
const lineName = (v: Var, a: number) => (v === 'x' ? `העמודה ${iso(`x = ${a}`)}` : `השורה ${iso(`y = ${a}`)}`);

export interface QuantifierGameProps {
  id: string;
  rel?: RelationId;
  /** the relations offered in the picker (none or one: no picker) */
  rels?: RelationId[];
  order?: OrderId;
  /** the quantifier orders offered */
  orders?: OrderId[];
  role?: Side;
  verdict?: boolean;
  tasks?: string[];
}

interface State {
  rel: RelationId;
  order: OrderId;
  role: Side;
  verdict: boolean;
  /** the value of the first variable v₁, once chosen */
  a: number | null;
  /** the value of the second variable v₂, once chosen: the round is over */
  b: number | null;
  /** rounds played, which varies the figure's choice among equally good moves (deterministic, so SSR matches) */
  round: number;
  /** keyboard cursor, a grid point */
  cur: [number, number];
}

const DEFAULT_ORDERS: OrderId[] = ['AxEy', 'EyAx', 'ExAy', 'AyEx'];

/** A deterministic but varying choice among the figure's equally good moves. */
const pick = (moves: number[], round: number) => moves[(round * 5 + 2) % moves.length];

/** A fresh round: if the figure owns the first quantifier it moves at once, and also the second if it owns both. */
function startRound(s: Omit<State, 'a' | 'b'>): State {
  const R = RELATIONS[s.rel];
  const p = ORDERS[s.order];
  let a: number | null = null;
  let b: number | null = null;
  if (owner(p.q1) !== s.role) {
    a = pick(bestFirstMoves(R, p), s.round);
    if (owner(p.q2) !== s.role) b = pick(bestSecondMoves(R, p, a), s.round);
  }
  return { ...s, a, b };
}

function fresh(p: QuantifierGameProps): State {
  return startRound({ rel: p.rel ?? 'mother', order: p.order ?? 'AxEy', role: p.role ?? 'prover', verdict: p.verdict ?? false, round: 0, cur: [1, 1] });
}

/** where the grid sits on the canvas */
interface Geom {
  x0: number;
  y0: number;
  cell: number;
  nx: number;
  ny: number;
}

export default function QuantifierGame(props: QuantifierGameProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const [kbd, setKbd] = useState(false);
  const geomRef = useRef<Geom | null>(null);
  /** the different y (or x) the student lost with in ∃∀, per relation and order */
  const lostWith = useRef<{ key: string; values: Set<number> }>({ key: '', values: new Set() });
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));

  const R = RELATIONS[s.rel];
  const p = ORDERS[s.order];
  const v1 = p.v1;
  const v2 = other(v1);
  const truth = holds(R, p);
  const cert: Certificate | null = truth ? witness(R, p) : counterexample(R, p);
  const over = s.a !== null && s.b !== null;
  const won = over ? winner(R, p, s.a!, s.b!) : null;
  const point = over ? pointOf(v1, s.a!, s.b!) : null;
  const turn: 'first' | 'second' | 'over' = s.a === null ? 'first' : s.b === null ? 'second' : 'over';

  const setup = (patch: Partial<State>) => setS((prev) => startRound({ ...prev, ...patch, round: prev.round + 1 }));

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = { ...prev };
          if (typeof st.rel === 'string' && st.rel in RELATIONS) next.rel = st.rel as RelationId;
          if (typeof st.order === 'string' && st.order in ORDERS) next.order = st.order as OrderId;
          if (st.role === 'prover' || st.role === 'refuter') next.role = st.role;
          if (typeof st.verdict === 'boolean') next.verdict = st.verdict;
          // a step only sets the game up and deals a fresh round: it never makes a move
          return startRound({ ...next, round: prev.round + 1 });
        });
      }),
    [props.id],
  );

  /** The student's move at grid point (x, y). Only this ticks tasks, and only when it ends a round. */
  const play = (x: number, y: number) => {
    if (turn === 'over') {
      setup({});
      setLive('סיבוב חדש.');
      return;
    }
    const val = (v: Var) => (v === 'x' ? x : y);
    let a = s.a;
    let b: number | null = null;
    if (turn === 'first') {
      if (owner(p.q1) !== s.role) return;
      a = val(v1);
      // owning both quantifiers, one click chooses both; otherwise the figure answers with its best move
      b = owner(p.q2) === s.role ? val(v2) : pick(bestSecondMoves(R, p, a), s.round);
    } else {
      if (val(v1) !== a) {
        setLive(`בחרו נקודה על ${lineName(v1, a!)}, הקו שכבר נבחר.`);
        return;
      }
      b = val(v2);
    }
    const next = { ...s, a, b, cur: [x, y] as [number, number] };
    setS(next);
    const w = winner(R, p, a!, b);
    const [px, py] = pointOf(v1, a!, b);
    setLive(`${iso(`${v1} = ${a}, ${v2} = ${b}`)}. בנקודה ${iso(`(${px}, ${py})`)} התנאי ${R.r(px, py) ? 'מתקיים' : 'לא מתקיים'}: ${w === s.role ? 'ניצחתם' : 'המחשב ניצח'}.`);

    const has = (t: string) => props.tasks?.includes(t);
    const mine = w === s.role;
    if (has('win-forall-exists') && s.order === 'AxEy' && s.role === 'prover' && mine) markTask(`${props.id}:win-forall-exists`);
    if (has('lose-exists-forall') && s.order === 'EyAx' && s.role === 'prover' && !mine && holds(R, ORDERS.AxEy)) {
      const key = `${s.rel}:${s.order}`;
      if (lostWith.current.key !== key) lostWith.current = { key, values: new Set() };
      lostWith.current.values.add(a!);
      if (lostWith.current.values.size >= 3) markTask(`${props.id}:lose-exists-forall`);
    }
    if (has('win-exists-forall') && p.q1 === 'exists' && p.q2 === 'forall' && s.role === 'prover' && mine) markTask(`${props.id}:win-exists-forall`);
    if (has('negate') && s.role === 'refuter' && mine && p.q1 !== p.q2) markTask(`${props.id}:negate`);
  };

  const draw = ({ ctx, view, palette: c }: FrameInfo) => {
    const narrow = view.w < 420;
    const padL = narrow ? 30 : 38;
    const padB = narrow ? 30 : 36;
    const padT = 14;
    const padR = 50; // clear of the reset and fullscreen buttons
    const cell = Math.min((view.w - padL - padR) / R.nx, (view.h - padT - padB) / R.ny);
    const gw = cell * R.nx;
    const gh = cell * R.ny;
    const x0 = padL + (view.w - padL - padR - gw) / 2;
    const y0 = padT + (view.h - padT - padB - gh) / 2;
    geomRef.current = { x0, y0, cell, nx: R.nx, ny: R.ny };
    const cx = (x: number) => x0 + (x - 0.5) * cell;
    const cy = (y: number) => y0 + gh - (y - 0.5) * cell;
    const r = Math.max(5, Math.min(11, cell * 0.2));

    // a chosen line: a band across the grid, warm for a ∀ choice, cool for a ∃ choice
    const band = (v: Var, a: number, q: 'forall' | 'exists', alpha = 1) => {
      ctx.save();
      ctx.fillStyle = withAlpha(q === 'forall' ? c.eps : c.delta, 0.16 * alpha);
      ctx.strokeStyle = q === 'forall' ? c.eps : c.delta;
      ctx.lineWidth = 2;
      const [bx, by, bw, bh] = v === 'x' ? [cx(a) - cell / 2, y0, cell, gh] : [x0, cy(a) - cell / 2, gw, cell];
      ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
      ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);
      ctx.restore();
    };
    if (s.a !== null) band(v1, s.a, p.q1);

    // the certificate's line (a dashed frame: a row or column that is all filled, or all hollow)
    if (s.verdict && cert?.line) {
      const { v, value } = cert.line;
      ctx.save();
      ctx.strokeStyle = truth ? c.limit : c.pointOut;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      const [bx, by, bw, bh] = v === 'x' ? [cx(value) - cell / 2, y0, cell, gh] : [x0, cy(value) - cell / 2, gw, cell];
      ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.restore();
    }

    // axes: values under the columns and beside the rows, and the variable names
    ctx.save();
    ctx.fillStyle = c.ink2;
    ctx.font = `600 ${narrow ? 12 : 13}px ${c.fontUi}`;
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = 1; x <= R.nx; x++) ctx.fillText(String(x), cx(x), y0 + gh + 6);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = 1; y <= R.ny; y++) ctx.fillText(String(y), x0 - 8, cy(y));
    ctx.font = `italic 700 ${narrow ? 14 : 16}px ${c.fontUi}`;
    ctx.fillStyle = c.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('x', x0 + gw + 6, y0 + gh + 4);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('y', x0 - 8, y0 + 2);
    ctx.restore();

    // the points: filled where R holds, hollow where it fails
    const certSet = new Set((s.verdict && cert ? cert.points : []).map(([x, y]) => `${x},${y}`));
    for (let x = 1; x <= R.nx; x++) {
      for (let y = 1; y <= R.ny; y++) {
        const px = cx(x);
        const py = cy(y);
        ctx.save();
        if (R.r(x, y)) {
          ctx.fillStyle = c.pointIn;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          ctx.fillStyle = c.paper;
          ctx.strokeStyle = c.pointOut;
          ctx.lineWidth = Math.max(1.5, r * 0.3);
          ctx.beginPath();
          ctx.arc(px, py, r - 0.5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
        if (certSet.has(`${x},${y}`)) {
          // a witness point is ringed solid green, a counterexample point dashed: shape as well as colour
          ctx.strokeStyle = truth ? c.limit : c.pointOut;
          ctx.lineWidth = 2;
          if (!truth) ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(px, py, r + 5, 0, 2 * Math.PI);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // the point the round ended at: a square frame, with ✓ or ✗ for the side it went to
    if (point) {
      const [x, y] = point;
      const hold = R.r(x, y);
      ctx.save();
      ctx.strokeStyle = c.ink;
      ctx.lineWidth = 2.5;
      const h = cell * 0.42;
      ctx.strokeRect(cx(x) - h, cy(y) - h, 2 * h, 2 * h);
      ctx.fillStyle = hold ? c.limit : c.pointOut;
      ctx.font = `700 ${narrow ? 14 : 16}px ${c.fontUi}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(hold ? '✓' : '✗', cx(x) + h - 2, cy(y) - h + 2);
      ctx.restore();
    }

    // the keyboard cursor
    if (kbd) {
      const [x, y] = s.cur;
      ctx.save();
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      const h = cell * 0.47;
      ctx.strokeRect(cx(x) - h, cy(y) - h, 2 * h, 2 * h);
      ctx.restore();
    }
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1, worldHeight: 1, animate: false });
  useEffect(invalidate, [s, kbd]);

  const cellAt = (e: PointerEvent): [number, number] | null => {
    const g = geomRef.current;
    if (!g) return null;
    const x = Math.floor((e.offsetX - g.x0) / g.cell) + 1;
    const y = g.ny - Math.floor((e.offsetY - g.y0) / g.cell);
    return x >= 1 && x <= g.nx && y >= 1 && y <= g.ny ? [x, y] : null;
  };
  const onPointerDown = (e: PointerEvent) => {
    const at = cellAt(e);
    setKbd(false);
    if (at) play(...at);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const [x, y] = s.cur;
    const move: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    if (move[e.key]) {
      e.preventDefault();
      setKbd(true);
      const [dx, dy] = move[e.key];
      const nx = Math.max(1, Math.min(R.nx, x + dx));
      const ny = Math.max(1, Math.min(R.ny, y + dy));
      setS({ ...s, cur: [nx, ny] });
      setLive(`הנקודה ${iso(`(${nx}, ${ny})`)}: ${R.r(nx, ny) ? 'מלאה, התנאי מתקיים' : 'חלולה, התנאי לא מתקיים'}.`);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setKbd(true);
      play(x, y);
    }
  };

  // ---- words for the readout
  const meQ = s.role === 'prover' ? '∃' : '∀';
  let status: string;
  if (turn === 'over') {
    status = `${iso(`${v1} = ${s.a}, ${v2} = ${s.b}`)}: בנקודה ${iso(`(${point![0]}, ${point![1]})`)} התנאי ${R.r(...point!) ? 'מתקיים, והמוכיחים ניצחו' : 'לא מתקיים, והמפריכים ניצחו'}. ${won === s.role ? 'ניצחתם!' : 'המחשב ניצח.'} לחצו על הרשת לסיבוב חדש.`;
  } else if (turn === 'first') {
    status = `תורכם: בחרו ${iso(v1)}${owner(p.q2) === s.role ? ` ואחריו ${iso(v2)}` : ''}. לחצו על נקודה כלשהי ב${v1 === 'x' ? 'עמודה' : 'שורה'} שבחרתם.`;
  } else {
    status = `המחשב בחר את ${lineName(v1, s.a!)}. תורכם: בחרו ${iso(v2)}: לחצו על נקודה על הקו הזה.`;
  }
  const certWords = (): string => {
    if (!cert) return '';
    if (truth) {
      if (cert.line) return `${lineName(cert.line.v, cert.line.value)} כולה נקודות מלאות: ${iso(cert.line.v)} אחד שמתאים לכל ${iso(other(cert.line.v))}.`;
      if (p.q1 === 'forall' && p.q2 === 'exists') return `לכל ${iso(v1)} מסומנת נקודה מלאה על הקו שלו: ה-${iso(v2)} שעונה לו. ה-${iso(v2)} משתנה עם ${iso(v1)}.`;
      return 'הנקודות המסומנות מראות למה.';
    }
    if (cert.line) return `${lineName(cert.line.v, cert.line.value)} כולה נקודות חלולות: זו הדוגמה הנגדית.`;
    if (p.q1 === 'exists' && p.q2 === 'forall') return `לכל ${iso(v1)} מסומנת נקודה חלולה על הקו שלו: ה-${iso(v2)} שמפיל אותו.`;
    return 'הנקודות המסומנות מראות למה.';
  };

  const ltr = (t: string) => <bdi dir="ltr">{t}</bdi>;
  const offeredRels = props.rels ?? [];
  const offeredOrders = props.orders ?? DEFAULT_ORDERS;
  const columns = Array.from({ length: R.nx }, (_, i) => i + 1)
    .map((x) => {
      const ys = Array.from({ length: R.ny }, (_, j) => j + 1).filter((y) => R.r(x, y));
      return `${iso(`x = ${x}`)}: ${ys.length ? iso(ys.map((y) => `y = ${y}`).join(', ')) : 'אין'}`;
    })
    .join('; ');

  return (
    <SimShell
      fig={props.id}
      label={`איור חי: רשת של 6 על 6 נקודות, ${iso('x')} גדל ימינה ו-${iso('y')} גדל למעלה. נקודה מלאה כשהתנאי ${iso('R')} מתקיים (${R.says}), וחלולה כשאינו מתקיים. הנקודות המלאות, לפי עמודות: ${columns}. הטענה ${iso(formulaText(p))} היא משחק: המוכיחים בוחרים את המשתנה שאחרי ${iso('∃')}, המפריכים את המשתנה שאחרי ${iso('∀')}, משמאל לימין. אתם ${SIDE_NAME[s.role]}. ${status} במקלדת: החצים מזיזים סמן על הרשת, ו-Enter בוחר את הנקודה.`}
      canvasRef={canvasRef}
      aspect={1.2}
      live={live}
      tasks={tasks}
      cursor="pointer"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onReset={() => {
        setS(fresh(props));
        lostWith.current = { key: '', values: new Set() };
        setKbd(false);
        setLive('האיור אופס.');
      }}
      readout={
        <>
          <span data-readout="statement">
            הטענה: <b class="q">{ltr(formulaText(p))}</b>, כאשר {ltr('R(x,y)')} פירושו: {rich(R.says)}.
          </span>
          <span data-readout="role">
            אתם {SIDE_NAME[s.role]}: בוחרים את המשתנה שאחרי <b class="q">{meQ}</b>.
          </span>
          {s.role === 'refuter' && (
            <span data-readout="negation">
              השלילה: <b class="q">{ltr(formulaText(negatePrefix(p), true))}</b>. המפריכים יכולים לנצח תמיד בדיוק כשהשלילה נכונה.
            </span>
          )}
          <span data-readout="status">{rich(status)}</span>
          {s.verdict && (
            <span data-readout="verdict">
              {truth ? 'הטענה נכונה. ' : 'הטענה שקרית. '}
              {rich(certWords())}
            </span>
          )}
        </>
      }
      controls={
        <>
          {offeredRels.length > 1 && (
            <div class="group" role="group" aria-label="התנאי">
              {offeredRels.map((id) => (
                <Toggle key={id} label={RELATIONS[id].name} on={s.rel === id} onChange={() => setup({ rel: id })} />
              ))}
            </div>
          )}
          <div class="group" role="group" aria-label="סדר הכמתים">
            {offeredOrders.map((id) => (
              <Toggle key={id} label={<bdi dir="ltr">{formulaText(ORDERS[id]).replace(': R(x,y)', '')}</bdi>} on={s.order === id} onChange={() => setup({ order: id })} />
            ))}
          </div>
          <div class="group" role="group" aria-label="הצד שלכם">
            <Toggle label={<>אתם מוכיחים (<bdi dir="ltr">∃</bdi>)</>} on={s.role === 'prover'} onChange={() => setup({ role: 'prover' })} />
            <Toggle label={<>אתם מפריכים (<bdi dir="ltr">∀</bdi>)</>} on={s.role === 'refuter'} onChange={() => setup({ role: 'refuter' })} />
          </div>
          <div class="group">
            <button
              type="button"
              class="toggle"
              onClick={() => {
                setup({});
                setLive('סיבוב חדש.');
              }}
            >
              סיבוב חדש
            </button>
            <Toggle label="הראו את התשובה" on={s.verdict} onChange={(on) => setS({ ...s, verdict: on })} />
          </div>
        </>
      }
    />
  );
}
