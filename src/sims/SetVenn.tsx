/**
 * Lesson 0.7's figure: a finite universe U (a rectangle), two or three sets A, B, C in it (circles), and every
 * element of U as a numbered point, drawn inside exactly the circles of the sets it belongs to.
 *
 * Two modes, set by the preset:
 * - shade: an expression such as A∖(B∪C) is given, and the learner marks its elements one by one; the figure says
 *   how many are missing and how many are marked wrongly, and once the marking is exactly the set it shades the
 *   expression's region.
 * - witness: two expressions that look alike, and the learner picks one element; the figure says whether it lies
 *   in each side. An element in exactly one side is a counterexample to the claim that they are equal.
 *
 * Shape carries the meaning, not only colour: a marked element is a filled disc, an unmarked one a hollow ring.
 * Every verdict comes from src/math/sets.ts, exact membership bookkeeping. Every preset has an element in each
 * region, so checking the regions is the membership table of the lesson (a truth table), not a sample.
 */

import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { NAMES, VENN, CIRCLES, VENN_H, VENN_W, diff, equal, evalExpr, fset, has, layout, regionsOf, differingRegions, show, type VennId } from '~/math/sets';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo } from './core/canvas';
import { withAlpha } from './core/ink';
import SimShell, { Toggle, type TaskDef } from './core/SimShell';

const iso = (t: string | number) => `⁦${t}⁩`;
/** A Hebrew string whose formulas sit in LRI … PDI, rendered with each formula in an LTR <bdi> (HTML isolation). */
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

const TASK_LABEL: Record<string, string> = {
  'shade-difference': `בדוגמה ${iso('A∖(B∪C)')}: סמנו בדיוק את האיברים של הקבוצה, עד שהאיור יאשר.`,
  'shade-complement': `בדוגמה ${iso('(A∩B)ᶜ')}: סמנו בדיוק את האיברים של המשלים של החיתוך.`,
  'find-witness': `בדוגמה ${iso('A∖(B∖C)')} מול ${iso('(A∖B)∖C')}: מצאו איבר שנמצא באגף אחד בלבד, כלומר דוגמה נגדית לשוויון.`,
};

interface State {
  preset: VennId;
  /** the marked elements (shade mode), or the one chosen element (witness mode) */
  marked: number[];
  /** shade the expression's region even before the marking is right (a text step showing the answer) */
  reveal: boolean;
  /** index of the keyboard cursor in U */
  cur: number;
}

export interface SetVennProps {
  id: string;
  preset?: VennId;
  /** the presets offered in the picker (none or one: no picker) */
  presets?: VennId[];
  tasks?: string[];
}

const load = (preset: VennId, marked: number[] = [], reveal = false): State => ({ preset, marked: fset(marked), reveal, cur: 0 });
const fresh = (p: SetVennProps) => load(p.preset ?? 'diff3');
const keyOf = (s: State) => `${s.preset}|${s.marked.join(',')}|${s.reveal}`;
const setText = (xs: readonly number[]) => (xs.length ? `{${xs.join(', ')}}` : '∅');

export default function SetVenn(props: SetVennProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const [focused, setFocused] = useState(false);
  /** the state a text step (or a reset, or a preset button) put on the figure: a task never ticks on exactly it */
  const baseline = useRef(keyOf(fresh(props)));
  const said = useRef('');
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));

  const P = VENN[s.preset];
  const witness = !!P.other;
  const names = NAMES.slice(0, P.k);
  const pos = useMemo(() => layout(P.u, P.k), [s.preset]);
  const target = evalExpr(P.target, P.u);
  const other = P.other ? evalExpr(P.other, P.u) : null;
  const right = !witness && equal(s.marked, target);
  const missing = diff(target, s.marked);
  const extra = diff(s.marked, target);
  const chosen = witness ? s.marked[0] : undefined;
  const splits = chosen !== undefined && other !== null && has(target, chosen) !== has(other, chosen);

  /** The learner's own change; only these may tick a task, and never on exactly the state a step showed. */
  const commit = (next: State, say: string) => {
    setS(next);
    said.current = say;
    if (keyOf(next) === baseline.current) return;
    const NP = VENN[next.preset];
    const has_ = (t: string) => props.tasks?.includes(t);
    const tick = (t: string) => markTask(`${props.id}:${t}`);
    if (!NP.other && !next.reveal && equal(next.marked, evalExpr(NP.target, NP.u))) {
      if (has_('shade-difference') && next.preset === 'diff3') tick('shade-difference');
      if (has_('shade-complement') && next.preset === 'comp-inter') tick('shade-complement');
    }
    if (NP.other && has_('find-witness') && next.preset === 'assoc-diff' && next.marked.length === 1) {
      const x = next.marked[0];
      if (has(evalExpr(NP.target, NP.u), x) !== has(evalExpr(NP.other, NP.u), x)) tick('find-witness');
    }
  };

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const preset = typeof st.preset === 'string' && st.preset in VENN ? (st.preset as VennId) : prev.preset;
          const U = VENN[preset].u.U;
          const marked = Array.isArray(st.marked) ? st.marked.filter((x): x is number => typeof x === 'number' && U.includes(x)) : [];
          const next = load(preset, marked, st.reveal === true);
          baseline.current = keyOf(next);
          return next;
        });
      }),
    [props.id],
  );

  const toggle = (x: number) => {
    const idx = P.u.U.indexOf(x);
    if (witness) {
      const again = s.marked[0] === x;
      commit({ ...s, marked: again ? [] : [x], cur: idx }, again ? `הבחירה ב-${iso(x)} בוטלה.` : `נבחר ${iso(x)}.`);
    } else {
      const on = s.marked.includes(x);
      commit({ ...s, marked: on ? s.marked.filter((y) => y !== x) : fset([...s.marked, x]), cur: idx }, `${iso(x)} ${on ? 'אינו מסומן עוד' : 'סומן'}.`);
    }
  };

  const where = (x: number) => {
    const inn = names.filter((n) => has(P.u.sets[n] ?? [], x));
    return inn.length ? `ב-${inn.map(iso).join(' וב-')}` : `באף אחת מהקבוצות`;
  };

  const verdict = (() => {
    if (witness && P.other) {
      if (chosen === undefined) return `בחרו איבר, ובדקו אם הוא שייך ל-${iso(show(P.target))} ול-${iso(show(P.other))}.`;
      const yesno = (b: boolean) => (b ? 'שייך' : 'אינו שייך');
      return `${iso(chosen)} ${yesno(has(target, chosen))} ל-${iso(show(P.target))}, ו${yesno(has(other!, chosen))} ל-${iso(show(P.other))}. ${
        splits ? 'הוא באגף אחד בלבד: זו דוגמה נגדית לשוויון.' : 'הוא באותו מצב בשני האגפים, ולכן אינו מבדיל ביניהם.'
      }`;
    }
    if (right) return `זו בדיוק הקבוצה ${iso(show(P.target))} = ${iso(setText(target))}.`;
    if (!s.marked.length) return `סמנו את האיברים של ${iso(show(P.target))}.`;
    const parts = [
      missing.length && (missing.length === 1 ? 'חסר איבר אחד' : `חסרים ${missing.length} איברים`),
      extra.length && (extra.length === 1 ? 'מסומן איבר אחד שאינו שייך' : `מסומנים ${extra.length} איברים שאינם שייכים`),
    ].filter(Boolean);
    return `עוד לא: ${parts.join(', ו')}.`;
  })();

  useEffect(() => {
    const id = setTimeout(() => {
      setLive(`${said.current} ${verdict}`.trim());
      said.current = '';
    }, 350);
    return () => clearTimeout(id);
  }, [s.marked, s.preset, s.reveal]);

  const geom = useRef<{ x: number; y: number; r: number; label: number }[]>([]);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const narrow = view.w < 420;
    const R = narrow ? 11 : 13;
    const pad = narrow ? 8 : 14;
    const sc = Math.min((view.w - 2 * pad) / VENN_W, (view.h - 2 * pad) / VENN_H);
    const ox = (view.w - sc * VENN_W) / 2;
    const oy = (view.h - sc * VENN_H) / 2;
    const X = (x: number) => ox + sc * x;
    const Y = (y: number) => oy + sc * y;
    const circles = CIRCLES[P.k];

    // the universe
    ctx.save();
    ctx.strokeStyle = p.ink3;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(X(0), Y(0), sc * VENN_W, sc * VENN_H);
    ctx.restore();

    // a region of the drawing: inside the circles of the bits of m, outside the others
    const fillRegion = (m: number, color: string) => {
      ctx.save();
      circles.forEach((c, i) => {
        ctx.beginPath();
        if ((m >> i) & 1) ctx.arc(X(c.x), Y(c.y), sc * c.r, 0, 2 * Math.PI);
        else {
          ctx.rect(X(0), Y(0), sc * VENN_W, sc * VENN_H);
          ctx.moveTo(X(c.x) + sc * c.r, Y(c.y));
          ctx.arc(X(c.x), Y(c.y), sc * c.r, 0, 2 * Math.PI);
        }
        ctx.clip('evenodd');
      });
      ctx.fillStyle = color;
      ctx.fillRect(X(0), Y(0), sc * VENN_W, sc * VENN_H);
      ctx.restore();
    };
    if (witness && P.other && s.reveal) for (const m of differingRegions(P.target, P.other, P.k)) fillRegion(m, p.deltaBand);
    if (!witness && (s.reveal || right)) for (const m of regionsOf(P.target, P.k)) fillRegion(m, p.epsBand);

    // the sets
    ctx.save();
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    circles.forEach((c, i) => {
      ctx.strokeStyle = p.ink2;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(X(c.x), Y(c.y), sc * c.r, 0, 2 * Math.PI);
      ctx.stroke();
      // the name just outside the circle: A to the upper left, B to the upper right, C below
      const ang = [(-3 * Math.PI) / 4, -Math.PI / 4, Math.PI / 2][i] ?? 0;
      const lr = sc * c.r + (narrow ? 12 : 16);
      ctx.fillStyle = p.ink;
      ctx.font = `italic 700 ${narrow ? 15 : 18}px ${p.fontUi}`;
      ctx.fillText(NAMES[i], X(c.x) + lr * Math.cos(ang), Y(c.y) + lr * Math.sin(ang));
    });
    ctx.font = `italic 700 ${narrow ? 14 : 16}px ${p.fontUi}`;
    ctx.fillStyle = p.ink2;
    ctx.fillText('U', X(0.05), Y(0.06));
    ctx.restore();

    // the elements
    const g: { x: number; y: number; r: number; label: number }[] = [];
    P.u.U.forEach((x, idx) => {
      const [ux, uy] = pos.get(x)!;
      const cx = X(ux);
      const cy = Y(uy);
      g.push({ x: cx, y: cy, r: R, label: x });
      const on = s.marked.includes(x);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, 2 * Math.PI);
      ctx.fillStyle = on ? p.pointIn : p.paper;
      ctx.fill();
      ctx.lineWidth = on ? 1.5 : 2.2;
      ctx.strokeStyle = on ? p.pointIn : p.pointOut;
      ctx.stroke();
      ctx.fillStyle = on ? p.paper : p.ink;
      ctx.font = `600 ${narrow ? 11 : 13}px ${p.fontUi}`;
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(x), cx, cy + 0.5);
      if (focused && s.cur === idx) {
        ctx.strokeStyle = p.ink;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(cx, cy, R + 6, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // the chosen element of a witness hunt that splits the two sides: a ring around it
      if (witness && on && splits) {
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, R + 4, 0, 2 * Math.PI);
        ctx.stroke();
      }
      ctx.restore();
    });
    geom.current = g;
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: VENN_W, worldHeight: VENN_H, animate: false });
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
    let best: number | null = null;
    let bestD = Infinity;
    for (const q of geom.current) {
      const d = Math.hypot(e.offsetX - q.x, e.offsetY - q.y);
      if (d < q.r + 10 && d < bestD) {
        best = q.label;
        bestD = d;
      }
    }
    if (best !== null) toggle(best);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const n = P.u.U.length;
    // math space is LTR: right (or down) moves to the next element
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const cur = (s.cur + step + n) % n;
      setS({ ...s, cur });
      const x = P.u.U[cur];
      setLive(`${iso(x)}: ${where(x)}${s.marked.includes(x) ? ', מסומן' : ''}.`);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(P.u.U[s.cur]);
    }
  };

  const pickPreset = (id: VennId) => {
    const next = load(id);
    baseline.current = keyOf(next);
    setS(next);
    setLive(`דוגמה: ${VENN[id].name}.`);
  };

  const mark = (ok: boolean, t: string) => (
    <>
      <span aria-hidden="true">{ok ? '✓' : '✗'}</span> {mixed(t)}
    </>
  );
  const offered = props.presets ?? [];
  const setsLine = names.map((n) => `${n} = ${setText(P.u.sets[n] ?? [])}`).join(',  ');
  return (
    <SimShell
      fig={props.id}
      label={`איור חי: הקבוצה ⁦U⁩ = ${iso(setText(P.u.U))} כמלבן, והקבוצות ${names.map(iso).join(', ')} כעיגולים: ${iso(setsLine)}. ${
        witness ? `משווים את ${iso(show(P.target))} ואת ${iso(show(P.other!))}.` : `מסמנים את האיברים של ${iso(show(P.target))}.`
      } ${verdict} במקלדת: חצים עוברים בין האיברים, Enter מסמן או מבטל.`}
      canvasRef={canvasRef}
      aspect={1.3}
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
          <span data-readout="sets">
            <b class="q" dir="ltr">
              {setsLine}
            </b>
          </span>
          <span data-readout="target">
            {witness ? 'משווים: ' : 'הביטוי: '}
            <b class="q" dir="ltr">
              {witness ? `${show(P.target)}  ,  ${show(P.other!)}` : show(P.target)}
            </b>
          </span>
          <span data-readout="marked">
            {witness ? 'נבחר: ' : 'סימנתם: '}
            <b class="q" dir="ltr">
              {witness ? (chosen ?? '—') : setText(s.marked)}
            </b>
          </span>
          <span data-readout="verdict">
            {witness ? (chosen === undefined ? mixed(verdict) : mark(splits, verdict)) : s.marked.length ? mark(right, verdict) : mixed(verdict)}
          </span>
        </>
      }
      controls={
        <>
          {offered.length > 1 && (
            <div class="group" role="group" aria-label="דוגמה">
              {offered.map((id) => (
                <Toggle key={id} label={<>{mixed(VENN[id].name)}</>} on={s.preset === id} onChange={() => pickPreset(id)} />
              ))}
            </div>
          )}
          <div class="group">
            <button type="button" class="toggle" onClick={() => commit({ ...s, marked: [], reveal: false }, 'הסימון נוקה.')}>
              נקו את הסימון
            </button>
          </div>
        </>
      }
    />
  );
}
