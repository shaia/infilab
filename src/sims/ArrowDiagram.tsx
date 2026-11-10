/**
 * Lesson 0.8's figure: a function between finite sets, drawn as arrows. A on the left, B on the right (and C
 * further right for a composition), each a column of labelled dots in an oval. The learner draws arrows (click a
 * dot of A, then a dot of B; or the keyboard) and the figure says, live and exactly, whether the arrows form a
 * function (every element of A has exactly one arrow), whether it is injective and onto, and what its image is.
 *
 * Shape carries the meaning, not only colour: a point of B in the image is a filled disc, a point outside the
 * image a hollow ring; an element with a wrong number of arrows gets a badge with that number (0, 2, …). The
 * "flip" control reverses every arrow: the reversed arrows form a function from B to A exactly when f is
 * injective and onto, and then they are f⁻¹. In the composition preset the dashed arcs are g∘f.
 *
 * Every verdict comes from src/math/finitefunctions.ts. On a finite set the check is complete, not a probe.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import {
  DIAGRAMS,
  asFunction,
  checkFunction,
  collisions,
  compose,
  flip as flipArrows,
  image,
  inCount,
  isInjective,
  isSurjective,
  missed,
  outCount,
  relationKey,
  toggleArrow,
  type DiagramId,
  type FiniteFn,
  type Pair,
} from '~/math/finitefunctions';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo } from './core/canvas';
import { arrow, withAlpha } from './core/ink';
import SimShell, { Toggle, type TaskDef } from './core/SimShell';

const TASK_LABEL: Record<string, string> = {
  'make-function': 'בדוגמה "לא פונקציה": הוסיפו ומחקו חצים עד שהחצים יוצרים פונקציה מ-⁦A⁩ ל-⁦B⁩.',
  'injective-not-onto': 'בדוגמה "3 אל 4": בנו פונקציה חד-חד-ערכית. שימו לב שהיא אינה על, ונסו להבין למה אין ברירה.',
  'onto-not-injective': 'בדוגמה "4 אל 3": בנו פונקציה על. שימו לב שהיא אינה חד-חד-ערכית.',
  'bijection-invert': 'בדוגמה "3 אל 3": תקנו את החצים עד שהפונקציה חד-חד-ערכית ועל, ואז הפכו את החצים.',
  composition: 'בדוגמת ההרכבה: שנו חצים עד ש-⁦g∘f⁩ חד-חד-ערכית, אף ש-⁦g⁩ אינה חד-חד-ערכית.',
};

/** A dot: column (0 = A, 1 = B, 2 = C) and index in the column. */
interface Dot {
  col: number;
  i: number;
}

interface State {
  preset: DiagramId;
  f: Pair[];
  g: Pair[];
  /** show every arrow of f reversed, from B to A */
  flip: boolean;
  /** draw g∘f as dashed arcs from A to C */
  showComp: boolean;
  /** the dot clicked first, waiting for the second end of an arrow */
  sel: Dot | null;
  /** the keyboard cursor */
  cur: Dot;
}

export interface ArrowDiagramProps {
  id: string;
  preset?: DiagramId;
  /** the presets offered in the picker (none or one: no picker) */
  presets?: DiagramId[];
  flip?: boolean;
  showComp?: boolean;
  /** offer the flip control */
  flipControl?: boolean;
  tasks?: string[];
}

const SET = ['A', 'B', 'C'];
const FN = ['f', 'g'];

function load(preset: DiagramId, over: { f?: Pair[]; g?: Pair[]; flip?: boolean; showComp?: boolean } = {}): State {
  const d = DIAGRAMS[preset];
  return {
    preset,
    f: over.f ?? d.f.map((p) => [p[0], p[1]] as const),
    g: over.g ?? (d.g ?? []).map((p) => [p[0], p[1]] as const),
    flip: over.flip ?? false,
    showComp: over.showComp ?? false,
    sel: null,
    cur: { col: 0, i: 0 },
  };
}

const fresh = (p: ArrowDiagramProps) => load(p.preset ?? 'not-function', { flip: p.flip, showComp: p.showComp });
const keyOf = (s: State) => `${s.preset}|${relationKey(s.f)}|${relationKey(s.g)}`;
/** a step's arrows arrive as JSON arrays */
const pairsFrom = (v: unknown, m: number, n: number): Pair[] | undefined =>
  Array.isArray(v)
    ? v
        .filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 && p.every((k) => Number.isInteger(k)))
        .filter(([a, b]) => a >= 0 && a < m && b >= 0 && b < n)
        .map(([a, b]) => [a, b] as const)
    : undefined;

/** "{a, c}" from indices and labels; LTR isolate so the braces do not mirror in RTL text */
const setText = (labels: string[], idx: number[]) => `⁦{${idx.map((k) => labels[k]).join(', ')}}⁩`;
const iso = (t: string) => `⁦${t}⁩`;

export default function ArrowDiagram(props: ArrowDiagramProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  /** what the learner's last change did, said together with the new verdict */
  const said = useRef('');
  const [focused, setFocused] = useState(false);
  /** the arrows a text step (or a reset) put on the figure: a task never ticks on exactly them */
  const baseline = useRef(keyOf(fresh(props)));
  const dots = useRef<{ col: number; i: number; x: number; y: number; r: number }[]>([]);
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));

  const d = DIAGRAMS[s.preset];
  const cols = d.C ? [d.A, d.B, d.C] : [d.A, d.B];
  const compMode = !!d.C;
  const fCheck = checkFunction(s.f, d.A.length);
  const f = asFunction(s.f, d.A.length);
  const g = compMode ? asFunction(s.g, d.B.length) : null;
  const gf: FiniteFn | null = f && g ? compose(g, f) : null;
  const flipCheck = checkFunction(flipArrows(s.f), d.B.length);

  /** The learner's own change; only these may tick a task, and never on the exact arrows a step showed. */
  const commit = (next: State, how: 'arrow' | 'flip' | 'other', say: string) => {
    setS(next);
    const has = (t: string) => props.tasks?.includes(t);
    const P = DIAGRAMS[next.preset];
    const nf = asFunction(next.f, P.A.length);
    const own = keyOf(next) !== baseline.current;
    const tick = (t: string) => markTask(`${props.id}:${t}`);
    if (own && how === 'arrow' && nf) {
      if (has('make-function') && next.preset === 'not-function') tick('make-function');
      if (has('injective-not-onto') && next.preset === 'three-four' && isInjective(nf) && !isSurjective(nf, P.B.length)) tick('injective-not-onto');
      if (has('onto-not-injective') && next.preset === 'four-three' && isSurjective(nf, P.B.length) && !isInjective(nf)) tick('onto-not-injective');
      if (has('composition') && next.preset === 'compose') {
        const ng = asFunction(next.g, P.B.length);
        if (ng && isInjective(compose(ng, nf)) && !isInjective(ng)) tick('composition');
      }
    }
    if (own && how === 'flip' && next.flip && nf && has('bijection-invert') && next.preset === 'bijection' && isInjective(nf) && isSurjective(nf, P.B.length)) {
      tick('bijection-invert');
    }
    said.current = say;
  };

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const preset = typeof st.preset === 'string' && st.preset in DIAGRAMS ? (st.preset as DiagramId) : prev.preset;
          const P = DIAGRAMS[preset];
          const next =
            preset !== prev.preset || st.f !== undefined || st.g !== undefined
              ? load(preset, {
                  f: pairsFrom(st.f, P.A.length, P.B.length),
                  g: P.C ? pairsFrom(st.g, P.B.length, P.C.length) : undefined,
                })
              : { ...prev, sel: null };
          next.flip = typeof st.flip === 'boolean' ? st.flip : false;
          next.showComp = typeof st.showComp === 'boolean' ? st.showComp : false;
          baseline.current = keyOf(next);
          return next;
        });
      }),
    [props.id],
  );

  /** A click (or Enter) on a dot: the first end of an arrow, or the second, which adds or removes the arrow. */
  const pick = (dot: Dot) => {
    // the arrows run A → B → C; flipped, they run B → A, and a new arrow is drawn from B to A
    const fromCol = (c: number) => (s.flip ? c === 1 : c < cols.length - 1);
    const pairsTo = (c: number) => (s.flip ? c === 0 : c >= 1);
    const lbl = (x: Dot) => cols[x.col][x.i];
    if (s.sel && pairsTo(dot.col) && (s.flip ? s.sel.col === 1 : dot.col === s.sel.col + 1)) {
      const which = s.flip ? 0 : s.sel.col; // 0: an arrow of f, 1: an arrow of g
      const p: Pair = s.flip ? [dot.i, s.sel.i] : [s.sel.i, dot.i];
      const key = which === 0 ? 'f' : 'g';
      const before = which === 0 ? s.f : s.g;
      const after = toggleArrow(before, p);
      const added = after.length > before.length;
      const next = { ...s, [key]: after, sel: null, cur: dot };
      const [a, b] = [cols[which][p[0]], cols[which + 1][p[1]]];
      commit(next, 'arrow', `${added ? 'נוסף' : 'נמחק'} החץ של ${iso(FN[which])} מ-${iso(a)} אל ${iso(b)}.`);
      return;
    }
    if (fromCol(dot.col)) {
      const again = s.sel && s.sel.col === dot.col && s.sel.i === dot.i;
      setS({ ...s, sel: again ? null : dot, cur: dot });
      setLive(again ? 'הבחירה בוטלה.' : `נבחר ${iso(lbl(dot))} ב-${iso(SET[dot.col])}. בחרו עכשיו את קצה החץ.`);
    } else {
      setS({ ...s, sel: null, cur: dot });
      setLive(s.flip ? 'כשהחצים הפוכים, חץ חדש מתחיל בנקודה של ⁦B⁩.' : `בחרו קודם נקודה ב-${iso(SET[dot.col - 1])}, ואחר כך את ${iso(lbl(dot))}.`);
    }
  };

  // the live verdict, said once the learner pauses
  const verdict = (() => {
    const parts: string[] = [];
    if (!fCheck.ok) {
      parts.push('החצים אינם פונקציה מ-⁦A⁩ ל-⁦B⁩.');
      for (const i of fCheck.none) parts.push(`ל-${iso(d.A[i])} אין חץ.`);
      for (const i of fCheck.many) parts.push(`מ-${iso(d.A[i])} יוצאים ${outCount(s.f, d.A.length)[i]} חצים.`);
    } else if (f) {
      parts.push('החצים הם פונקציה מ-⁦A⁩ ל-⁦B⁩.');
      const c = collisions(f)[0];
      parts.push(c ? `לא חד-חד-ערכית: ל-${iso(d.A[c[0]])} ול-${iso(d.A[c[1]])} אותו ערך, ${iso(d.B[f[c[0]]])}.` : 'חד-חד-ערכית.');
      const miss = missed(f, d.B.length);
      parts.push(miss.length ? `לא על: ${iso(d.B[miss[0]])} אינו מתקבל.` : 'על.');
      parts.push(`התמונה ${setText(d.B, image(f))}.`);
    }
    if (s.flip) parts.push(flipCheck.ok ? 'החצים ההפוכים הם פונקציה מ-⁦B⁩ ל-⁦A⁩: זו הפונקציה ההפוכה.' : 'החצים ההפוכים אינם פונקציה מ-⁦B⁩ ל-⁦A⁩.');
    if (compMode) {
      if (!g) parts.push('החצים של ⁦g⁩ אינם פונקציה מ-⁦B⁩ ל-⁦C⁩.');
      else if (gf) parts.push(`⁦g∘f⁩ ${isInjective(gf) ? 'חד-חד-ערכית' : 'אינה חד-חד-ערכית'}, ו-⁦g⁩ ${isInjective(g) ? 'חד-חד-ערכית' : 'אינה חד-חד-ערכית'}.`);
    }
    return parts.join(' ');
  })();

  useEffect(() => {
    const id = setTimeout(() => {
      setLive(`${said.current} ${verdict}`.trim());
      said.current = '';
    }, 350);
    return () => clearTimeout(id);
  }, [s.f, s.g, s.flip, s.showComp, s.preset]);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const narrow = view.w < 420;
    const R = narrow ? 12 : 14;
    const top = narrow ? 40 : 46;
    const bottom = 14;
    const xs = cols.length === 3 ? [0.14, 0.5, 0.86] : [0.24, 0.76];
    const maxK = Math.max(...cols.map((c) => c.length));
    const gap = Math.min(narrow ? 50 : 60, (view.h - top - bottom - 20) / maxK);
    const pos: { col: number; i: number; x: number; y: number; r: number }[] = [];
    cols.forEach((labels, col) => {
      const x = xs[col] * view.w;
      const h = gap * labels.length;
      const y0 = top + (view.h - top - bottom - h) / 2 + gap / 2;
      labels.forEach((_, i) => pos.push({ col, i, x, y: y0 + i * gap, r: R }));
    });
    dots.current = pos;
    const at = (col: number, i: number) => pos.find((q) => q.col === col && q.i === i)!;

    // the sets: an oval around each column, its name above
    ctx.save();
    ctx.font = `700 ${narrow ? 15 : 17}px ${p.fontUi}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.direction = 'ltr';
    cols.forEach((labels, col) => {
      const x = xs[col] * view.w;
      const ys = labels.map((_, i) => at(col, i).y);
      const cy = (ys[0] + ys[ys.length - 1]) / 2;
      const ry = (ys[ys.length - 1] - ys[0]) / 2 + R + 12;
      const rx = R + (narrow ? 14 : 20);
      ctx.strokeStyle = p.ink3;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x, cy, rx, ry, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = p.ink;
      ctx.fillText(SET[col], x, cy - ry - 4);
    });
    // the function names, above the gaps between the columns
    ctx.font = `italic 600 ${narrow ? 14 : 16}px ${p.fontUi}`;
    for (let c = 0; c + 1 < cols.length; c++) {
      const name = c === 0 && s.flip ? 'f⁻¹ ?' : FN[c];
      ctx.fillStyle = p.ink2;
      ctx.fillText(name, ((xs[c] + xs[c + 1]) / 2) * view.w, top - 6);
    }
    ctx.restore();

    // g∘f as dashed arcs over the top, from A to C
    if (compMode && s.showComp && gf) {
      ctx.save();
      ctx.strokeStyle = p.curve2;
      ctx.fillStyle = p.curve2;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 5]);
      gf.forEach((z, a) => {
        const P0 = at(0, a);
        const P1 = at(2, z);
        const mx = (P0.x + P1.x) / 2;
        const my = Math.min(P0.y, P1.y) - (narrow ? 30 : 45) - a * 8;
        ctx.beginPath();
        ctx.moveTo(P0.x, P0.y - R);
        ctx.quadraticCurveTo(mx, my, P1.x - R * 0.7, P1.y - R * 0.7);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();
    }

    // arrows
    const drawArrows = (pairs: readonly Pair[], col: number, color: string, reversed: boolean) => {
      for (const [a, b] of pairs) {
        const P = at(col, a);
        const Q = at(col + 1, b);
        const [S, T] = reversed ? [Q, P] : [P, Q];
        const L = Math.hypot(T.x - S.x, T.y - S.y);
        const ux = (T.x - S.x) / L;
        const uy = (T.y - S.y) / L;
        arrow(ctx, S.x + ux * (R + 2), S.y + uy * (R + 2), T.x - ux * (R + 3), T.y - uy * (R + 3), { color, width: 2, head: 10 });
      }
    };
    drawArrows(s.f, 0, s.flip ? p.limit : p.curve, s.flip);
    if (compMode) drawArrows(s.g, 1, p.delta, false);

    // dots
    const outF = outCount(s.f, d.A.length);
    const inF = inCount(s.f, d.B.length);
    const inG = compMode ? inCount(s.g, d.C!.length) : [];
    const outG = compMode ? outCount(s.g, d.B.length) : [];
    const imgC = gf ? new Set(image(gf)) : new Set(inG.flatMap((k, z) => (k > 0 ? [z] : [])));
    for (const q of pos) {
      const label = cols[q.col][q.i];
      // filled = "hit": in the image of the arrows that reach this column; A (the domain) is always drawn filled
      let filled = true;
      let badge: number | null = null;
      if (q.col === 0) {
        if (!s.flip && outF[q.i] !== 1) badge = outF[q.i];
        if (s.flip) filled = outF[q.i] > 0;
      } else if (q.col === 1) {
        filled = inF[q.i] > 0;
        // B is the target of f, the domain of g (composition) or of the reversed arrows (flip)
        if (compMode) badge = outG[q.i] !== 1 ? outG[q.i] : null;
        else if (s.flip ? inF[q.i] !== 1 : inF[q.i] > 1) badge = inF[q.i];
      } else {
        filled = imgC.has(q.i);
        if (gf ? gf.filter((z) => z === q.i).length > 1 : inG[q.i] > 1) badge = gf ? gf.filter((z) => z === q.i).length : inG[q.i];
      }
      const ring = q.col === 0 ? p.curve : filled ? p.pointIn : p.pointOut;
      ctx.save();
      ctx.beginPath();
      ctx.arc(q.x, q.y, R, 0, 2 * Math.PI);
      ctx.fillStyle = filled ? (q.col === 0 ? p.curve : p.pointIn) : p.paper;
      ctx.fill();
      ctx.lineWidth = filled ? 1.5 : 2.4;
      ctx.strokeStyle = ring;
      ctx.stroke();
      ctx.fillStyle = filled ? p.paper : p.ink;
      ctx.font = `600 ${narrow ? 12 : 13}px ${p.fontUi}`;
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, q.x, q.y + 0.5);
      // a wrong number of arrows: a badge with the number, outside the oval
      if (badge !== null) {
        const bx = q.col === 0 ? q.x - R - (narrow ? 22 : 30) : q.x + R + (narrow ? 22 : 30);
        ctx.fillStyle = withAlpha(p.pointOut, 0.14);
        ctx.strokeStyle = p.pointOut;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(bx - 10, q.y - 10, 20, 20, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = p.pointOut;
        ctx.font = `700 12px ${p.fontUi}`;
        ctx.fillText(String(badge), bx, q.y + 0.5);
      }
      // the first end of an arrow in the making, and the keyboard cursor
      if (s.sel && s.sel.col === q.col && s.sel.i === q.i) {
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(q.x, q.y, R + 5, 0, 2 * Math.PI);
        ctx.stroke();
      }
      if (focused && s.cur.col === q.col && s.cur.i === q.i) {
        ctx.strokeStyle = p.ink;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(q.x, q.y, R + 9, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1.2, worldHeight: 1, animate: false });
  useEffect(invalidate, [s, focused]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const on = () => setFocused(true);
    const off = () => setFocused(false);
    c.addEventListener('focus', on);
    c.addEventListener('blur', off);
    return () => {
      c.removeEventListener('focus', on);
      c.removeEventListener('blur', off);
    };
  }, []);

  const onPointerDown = (e: PointerEvent) => {
    let best: Dot | null = null;
    let bestD = Infinity;
    for (const q of dots.current) {
      const dd = Math.hypot(e.offsetX - q.x, e.offsetY - q.y);
      if (dd < q.r + 12 && dd < bestD) {
        best = { col: q.col, i: q.i };
        bestD = dd;
      }
    }
    if (best) pick(best);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const c = s.cur;
    const clampI = (col: number, i: number) => Math.max(0, Math.min(cols[col].length - 1, i));
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const cur = { col: c.col, i: clampI(c.col, c.i + (e.key === 'ArrowDown' ? 1 : -1)) };
      setS({ ...s, cur });
      setLive(`${SET[cur.col]}: ${iso(cols[cur.col][cur.i])}`);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      // math space is LTR: the right arrow moves towards B
      const col = Math.max(0, Math.min(cols.length - 1, c.col + (e.key === 'ArrowRight' ? 1 : -1)));
      const cur = { col, i: clampI(col, c.i) };
      setS({ ...s, cur });
      setLive(`${SET[cur.col]}: ${iso(cols[cur.col][cur.i])}`);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick(c);
    } else if (e.key === 'Escape') {
      setS({ ...s, sel: null });
      setLive('הבחירה בוטלה.');
    }
  };

  const pickPreset = (id: DiagramId) => {
    const next = load(id);
    baseline.current = keyOf(next);
    setS(next);
    setLive(`דוגמה: ${DIAGRAMS[id].name}.`);
  };

  const rule = (pairs: readonly Pair[], from: string[], to: string[], name: string) =>
    from
      .map((x, a) => {
        const vals = pairs.filter((q) => q[0] === a).map((q) => to[q[1]]);
        return `${name}(${x}) = ${vals.length === 1 ? vals[0] : vals.length === 0 ? '?' : `{${vals.join(', ')}}`}`;
      })
      .join(',  ');

  const yes = (t: string) => (
    <>
      <span aria-hidden="true">✓</span> {t}
    </>
  );
  const no = (t: string) => (
    <>
      <span aria-hidden="true">✗</span> {t}
    </>
  );
  const offered = props.presets ?? [];
  const firstCollision = f ? collisions(f)[0] : undefined;
  const firstMiss = f ? missed(f, d.B.length)[0] : undefined;
  return (
    <SimShell
      fig={props.id}
      label={`איור חי: חצים מקבוצה ⁦A⁩ ${compMode ? 'לקבוצה ⁦B⁩, ומ-⁦B⁩ לקבוצה ⁦C⁩' : 'לקבוצה ⁦B⁩'}. ${verdict} כדי להוסיף או למחוק חץ לוחצים על נקודה ב-⁦A⁩ ואחר כך על נקודה ב-⁦B⁩. במקלדת: חצים למעלה ולמטה בוחרים נקודה בעמודה, ימינה ושמאלה עוברים בין הקבוצות, Enter בוחר.`}
      canvasRef={canvasRef}
      aspect={1.2}
      live={live}
      tasks={tasks}
      cursor="pointer"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onReset={() => {
        const next = fresh(props);
        baseline.current = keyOf(next);
        setS(next);
        setLive('האיור אופס.');
      }}
      readout={
        <>
          <span data-readout="rule">
            <b class="q" dir="ltr">
              {rule(s.f, d.A, d.B, 'f')}
            </b>
          </span>
          {compMode && (
            <span data-readout="rule-g">
              <b class="q" dir="ltr">
                {rule(s.g, d.B, d.C!, 'g')}
              </b>
            </span>
          )}
          <span data-readout="function">
            {fCheck.ok ? (
              yes('פונקציה מ-⁦A⁩ ל-⁦B⁩: לכל איבר של ⁦A⁩ יש חץ אחד בדיוק.')
            ) : (
              <>
                {no('לא פונקציה מ-⁦A⁩ ל-⁦B⁩: ')}
                {fCheck.none.map((i) => (
                  <span key={`n${i}`}>
                    ל-<b class="q">{d.A[i]}</b> אין חץ.{' '}
                  </span>
                ))}
                {fCheck.many.map((i) => (
                  <span key={`m${i}`}>
                    מ-<b class="q">{d.A[i]}</b> יוצאים <b class="q">{outCount(s.f, d.A.length)[i]}</b> חצים.{' '}
                  </span>
                ))}
              </>
            )}
          </span>
          {f && (
            <>
              <span data-readout="injective">
                {firstCollision ? (
                  <>
                    {no('לא חד-חד-ערכית: ')}
                    <b class="q" dir="ltr">
                      f({d.A[firstCollision[0]]}) = f({d.A[firstCollision[1]]}) = {d.B[f[firstCollision[0]]]}
                    </b>
                  </>
                ) : (
                  yes('חד-חד-ערכית')
                )}
              </span>
              <span data-readout="onto">
                {firstMiss !== undefined ? (
                  <>
                    {no('לא על: ')}
                    <b class="q">{d.B[firstMiss]}</b> אינו מתקבל
                  </>
                ) : (
                  yes('על')
                )}
              </span>
              <span data-readout="image">
                התמונה:{' '}
                <b class="q" dir="ltr">
                  f(A) = {`{${image(f).map((k) => d.B[k]).join(', ')}}`}
                </b>
              </span>
            </>
          )}
          {s.flip && (
            <span data-readout="flip">
              {flipCheck.ok ? (
                yes('החצים ההפוכים הם פונקציה מ-⁦B⁩ ל-⁦A⁩: זו הפונקציה ההפוכה.')
              ) : (
                <>
                  {no('החצים ההפוכים אינם פונקציה מ-⁦B⁩ ל-⁦A⁩: ')}
                  {flipCheck.none.length > 0 && (
                    <>
                      ל-<b class="q">{d.B[flipCheck.none[0]]}</b> אין חץ (⁦f⁩ אינה על).{' '}
                    </>
                  )}
                  {flipCheck.many.length > 0 && (
                    <>
                      מ-<b class="q">{d.B[flipCheck.many[0]]}</b> יוצאים כמה חצים (⁦f⁩ אינה חד-חד-ערכית).
                    </>
                  )}
                </>
              )}
            </span>
          )}
          {compMode && (
            <span data-readout="compose">
              {!g ? (
                no('החצים של ⁦g⁩ אינם פונקציה מ-⁦B⁩ ל-⁦C⁩.')
              ) : !gf ? (
                no('קודם צריך ש-f תהיה פונקציה.')
              ) : (
                <>
                  <b class="q" dir="ltr">
                    {d.A.map((x, a) => `(g∘f)(${x}) = ${d.C![gf[a]]}`).join(',  ')}
                  </b>
                  {'  '}
                  {isInjective(gf) ? yes('⁦g∘f⁩ חד-חד-ערכית') : no('⁦g∘f⁩ אינה חד-חד-ערכית')}
                  {'  '}
                  {isInjective(g) ? yes('⁦g⁩ חד-חד-ערכית') : no('⁦g⁩ אינה חד-חד-ערכית')}
                </>
              )}
            </span>
          )}
        </>
      }
      controls={
        <>
          {offered.length > 1 && (
            <div class="group" role="group" aria-label="דוגמה">
              {offered.map((id) => (
                <Toggle key={id} label={DIAGRAMS[id].name} on={s.preset === id} onChange={() => pickPreset(id)} />
              ))}
            </div>
          )}
          <div class="group">
            {props.flipControl && !compMode && (
              <Toggle
                label="הפכו את החצים"
                on={s.flip}
                onChange={(on) => commit({ ...s, flip: on, sel: null }, 'flip', on ? 'החצים הפוכים: עכשיו הם יוצאים מ-⁦B⁩.' : 'החצים חזרו לכיוונם.')}
              />
            )}
            {compMode && (
              <Toggle label="הראו את ⁦g∘f⁩" on={s.showComp} onChange={(on) => commit({ ...s, showComp: on }, 'other', on ? 'הקשתות המקווקוות הן ⁦g∘f⁩.' : '')} />
            )}
            <button
              type="button"
              class="toggle"
              onClick={() => commit({ ...s, f: [], g: compMode ? [] : s.g, sel: null }, 'other', 'כל החצים נמחקו.')}
            >
              מחקו את כל החצים
            </button>
          </div>
        </>
      }
    />
  );
}
