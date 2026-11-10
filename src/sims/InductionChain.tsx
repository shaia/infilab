/**
 * The figure of lessons 0.5 and 0.6: a proof by induction as a row of dominoes. Domino n is the statement P(n), drawn left to
 * right (math space, LTR). Above each pair of neighbours an arc is the link P(n) ⇒ P(n+1): holding (solid, ✓) or
 * broken (gapped, ✗); in the horses family the links start as claims (dashed, ?) and show their status when the
 * chain reaches them or the student inspects them. Pushing the base P(n₀) topples the chain: a domino falls when
 * the one before it fell and the link between them holds. A fallen domino is proven: filled and tilted. A standing
 * one is hollow and upright: shape, not only colour.
 *
 * Every truth value comes from src/math/induction.ts on the drawn window only: the figure gathers evidence and
 * shows the logic of the principle; it proves nothing about the statements beyond the window, and the caption
 * says so. Tasks tick only on the student's own act (a push, a click on a link), never on a text step's state.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import { FAMILIES, chain, linkHolds, smallestFullBase, type ChainResult, type FamilyId } from '~/math/induction';
import { motionAllowed } from '~/progress/settings';
import { markTask } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useFigureCanvas, type FrameInfo } from './core/canvas';
import SimShell, { Slider, Toggle, type TaskDef } from './core/SimShell';

const TASK_LABEL: Record<string, string> = {
  topple: 'בטענה על הסכום ⁦1 + … + n⁩, דחפו את אבן הבסיס ⁦P(1)⁩ והפילו את כל השרשרת.',
  'no-base': 'בטענה ⁦1 + … + n = n(n+1)/2 + 1⁩ כל החוליות מחזיקות. דחפו את הבסיס, וראו מה נופל.',
  'broken-link': 'ב"הוכחה" שכל המספרים שווים, מצאו את החוליה השבורה ולחצו עליה.',
  'late-base': 'בטענה ⁦2ⁿ > n³⁩, הזיזו את הבסיס אל ה-n₀ הקטן ביותר שממנו השרשרת מגיעה עד סוף החלון, ודחפו.',
  'bernoulli-break': 'בברנולי, שנו את x עד שהשרשרת מ-⁦P(1)⁩ נעצרת לפני סוף החלון, ודחפו.',
  'strict-base': 'באי-השוויון החזק ⁦(1 + x)ⁿ > 1 + nx⁩, הזיזו את הבסיס אל ה-n₀ הקטן ביותר שממנו השרשרת מגיעה עד סוף החלון, ודחפו.',
  'square-break': 'בברנולי המשופר, שנו את x עד שהשרשרת מ-⁦P(1)⁩ נעצרת לפני סוף החלון, ודחפו.',
};

/** the selected item: a domino P(n), or the link P(n) ⇒ P(n+1) */
type Sel = { kind: 'dom' | 'link'; n: number } | null;

interface State {
  fam: FamilyId;
  n0: number;
  x: number;
  showTruth: boolean;
  /** the chain after the last push, or null before any push */
  res: ChainResult | null;
  /** increases on every push: restarts the falling animation */
  pushId: number;
  sel: Sel;
  /** links the student inspected (hidden-links families) */
  seen: number[];
}

export interface InductionChainProps {
  id: string;
  fam?: FamilyId;
  /** the families offered in the picker (none or one: no picker) */
  fams?: FamilyId[];
  n0?: number;
  x?: number;
  showTruth?: boolean;
  /** show the base slider (otherwise the base is P(1)) */
  baseSlider?: boolean;
  tasks?: string[];
}

const STEP_MS = 230;
const clampX = (x: number) => Math.max(-5, Math.min(2, Math.round(x * 10) / 10));
/** a typographic minus sign */
const minus = (t: string) => t.replace(/-/g, '−');
/** a formula inside Hebrew text: an LTR isolate (LRI … PDI), so the RTL paragraph never reverses it */
const iso = (t: string) => `⁦${t}⁩`;
/** the claim as text: LTR for a formula, RTL (with its own isolates) when it is a Hebrew sentence */
const claimDir = (t: string) => (/[\u0590-\u05FF]/.test(t) ? 'rtl' : 'ltr');

function fresh(p: InductionChainProps): State {
  return { fam: p.fam ?? 'sum', n0: p.n0 ?? 1, x: p.x ?? 0.5, showTruth: p.showTruth ?? false, res: null, pushId: 0, sel: null, seen: [] };
}

export default function InductionChain(props: InductionChainProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  /** the last fallen domino on screen while the chain is falling */
  const [shown, setShown] = useState(0);
  const [live, setLive] = useState('');
  const tasks: TaskDef[] = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));
  /** the student moved the base or x since the last text step: a step that sets the answer never counts as finding it */
  const userN0 = useRef(false);
  const userX = useRef(false);
  const geo = useRef<{ x0: number; slot: number; linkBottom: number } | null>(null);

  const fam = FAMILIES[s.fam];
  const K = fam.window;
  const n0 = Math.min(s.n0, K);

  // the falling animation: one domino per STEP_MS, all at once in still mode
  useEffect(() => {
    if (!s.res) {
      setShown(n0 - 1);
      return;
    }
    const target = s.res.reach;
    if (!motionAllowed() || target < n0) {
      setShown(target);
      return;
    }
    let k = n0 - 1;
    setShown(k);
    const id = setInterval(() => {
      k++;
      setShown(k);
      if (k >= target) clearInterval(id);
    }, STEP_MS);
    return () => clearInterval(id);
  }, [s.pushId, s.res, n0]);

  const push = (st: State): State => ({ ...st, res: chain(FAMILIES[st.fam], Math.min(st.n0, FAMILIES[st.fam].window), FAMILIES[st.fam].window, st.x), pushId: st.pushId + 1 });

  /** the student's push: the only place a chain task can tick */
  const userPush = () => {
    const next = push(s);
    setS(next);
    const has = (t: string) => props.tasks?.includes(t);
    const r = next.res!;
    const f = FAMILIES[next.fam];
    if (has('topple') && next.fam === 'sum' && next.n0 === 1 && r.reach === f.window) markTask(`${props.id}:topple`);
    if (has('no-base') && next.fam === 'sum-plus-one' && !r.base) markTask(`${props.id}:no-base`);
    if (has('late-base') && next.fam === 'cube' && userN0.current && next.n0 === smallestFullBase(f)) markTask(`${props.id}:late-base`);
    if (has('bernoulli-break') && next.fam === 'bernoulli' && userX.current && next.n0 === 1 && r.brokenAt !== null) markTask(`${props.id}:bernoulli-break`);
    if (has('strict-base') && next.fam === 'bernoulli-strict' && userN0.current && next.n0 === smallestFullBase(f, f.window, next.x)) markTask(`${props.id}:strict-base`);
    if (has('square-break') && next.fam === 'bernoulli-sq' && userX.current && next.n0 === 1 && r.brokenAt !== null) markTask(`${props.id}:square-break`);
    setLive(verdictText(next));
  };

  /** the student's selection (click or arrow keys) */
  const userSelect = (sel: Sel) => {
    if (!sel) return;
    const seen = sel.kind === 'link' && !s.seen.includes(sel.n) ? [...s.seen, sel.n] : s.seen;
    setS({ ...s, sel, seen });
    if (props.tasks?.includes('broken-link') && s.fam === 'horses' && sel.kind === 'link' && sel.n === 1) markTask(`${props.id}:broken-link`);
    setLive(selText(s, sel));
  };

  const pickFam = (id: FamilyId) => setS({ ...s, fam: id, n0: 1, res: null, sel: null, seen: [] });

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          let next: State = { ...prev, res: null, sel: null };
          if (typeof st.fam === 'string' && st.fam in FAMILIES && st.fam !== prev.fam) next = { ...next, fam: st.fam as FamilyId, seen: [] };
          if (typeof st.n0 === 'number') {
            next.n0 = Math.max(1, Math.min(FAMILIES[next.fam].window, Math.round(st.n0)));
            userN0.current = false;
          }
          if (typeof st.x === 'number') {
            next.x = clampX(st.x);
            userX.current = false;
          }
          if (typeof st.showTruth === 'boolean') next.showTruth = st.showTruth;
          if (st.push === true) next = push(next);
          return next;
        });
      }),
    [props.id],
  );

  function verdictText(st: State): string {
    const f = FAMILIES[st.fam];
    const b = Math.min(st.n0, f.window);
    if (!st.res) return `דחפו את אבן הבסיס ${iso(`P(${b})`)}.`;
    const r = st.res;
    if (!r.base) return `הבסיס ${iso(`P(${b})`)} לא נכון: אבן הבסיס לא נופלת, ולכן אף אבן לא נופלת.`;
    if (r.brokenAt !== null)
      return `נפלו ${iso(`P(${b})`)} עד ${iso(`P(${r.reach})`)}. השרשרת נעצרה: החוליה ${iso(`P(${r.brokenAt}) ⇒ P(${r.brokenAt + 1})`)} שבורה.`;
    return `נפלו כל האבנים מ-${iso(`P(${b})`)} עד ${iso(`P(${f.window})`)}, סוף החלון שבאיור.`;
  }

  function selText(st: State, sel: Sel): string {
    if (!sel) return '';
    const f = FAMILIES[st.fam];
    if (sel.kind === 'dom') {
      const v = f.verdict(sel.n, st.x);
      const tf = v.holds ? 'נכונה' : 'לא נכונה';
      if (!v.rel) return `${iso(`P(${sel.n})`)} ${tf}.`;
      return `${iso(`P(${sel.n})`)}: ${iso(minus(v.lhs))}, ו-${iso(minus(v.rhs))}. לכן ${iso(`${minus(v.lhs.split(' = ')[0])} ${v.rel} ${minus(v.rhs.split(' = ')[0])}`)} ${tf}.`;
    }
    const a = f.P(sel.n, st.x);
    const b = f.P(sel.n + 1, st.x);
    const holds = linkHolds(f, sel.n, st.x);
    const base = `החוליה ${iso(`P(${sel.n}) ⇒ P(${sel.n + 1})`)}: ${iso(`P(${sel.n})`)} ${a ? 'נכונה' : 'לא נכונה'} ו-${iso(`P(${sel.n + 1})`)} ${b ? 'נכונה' : 'לא נכונה'}, ולכן הגרירה ${holds ? 'נכונה' : 'שקרית'}.`;
    const note = f.linkNote?.(sel.n, st.x);
    return note ? `${base} ${note}` : base;
  }

  /** the same as selText, with every formula in an LTR isolate */
  function selView(st: State, sel: NonNullable<Sel>) {
    const f = FAMILIES[st.fam];
    const L = (t: string) => <bdi dir="ltr">{minus(t)}</bdi>;
    if (sel.kind === 'dom') {
      const v = f.verdict(sel.n, st.x);
      const tf = v.holds ? 'נכונה' : 'לא נכונה';
      if (!v.rel) return <>{L(`P(${sel.n})`)} {tf}.</>;
      return (
        <>
          {L(`P(${sel.n})`)}: {L(v.lhs)}, ו-{L(v.rhs)}. לכן {L(`${v.lhs.split(' = ')[0]} ${v.rel} ${v.rhs.split(' = ')[0]}`)} {tf}.
        </>
      );
    }
    const a = f.P(sel.n, st.x);
    const b = f.P(sel.n + 1, st.x);
    const holds = linkHolds(f, sel.n, st.x);
    const note = f.linkNote?.(sel.n, st.x);
    return (
      <>
        החוליה {L(`P(${sel.n}) ⇒ P(${sel.n + 1})`)}: {L(`P(${sel.n})`)} {a ? 'נכונה' : 'לא נכונה'} ו-{L(`P(${sel.n + 1})`)} {b ? 'נכונה' : 'לא נכונה'}, ולכן הגרירה{' '}
        <b>{holds ? 'נכונה' : 'שקרית'}</b>. {note}
      </>
    );
  }

  const linkShown = (n: number) => !fam.hiddenLinks || s.seen.includes(n) || (s.res !== null && s.res.base && n >= n0 && n <= s.res.reach && shown >= n);

  const draw = ({ ctx, view, palette: p }: FrameInfo) => {
    const narrow = view.w < 440;
    const mx = narrow ? 8 : 16;
    const slot = (view.w - 2 * mx) / K;
    const ground = view.h * (s.showTruth ? 0.66 : 0.72);
    // short enough that a fallen domino leans visibly (about 30°) before it rests on the next one
    const dh = Math.min(view.h * 0.36, slot * 1.3);
    const dw = Math.max(5, Math.min(slot * 0.3, 18));
    const cx = (n: number) => mx + (n - 0.5) * slot;
    const lean = Math.min((80 * Math.PI) / 180, Math.asin(Math.min(1, (slot - dw * 1.1) / dh)));
    const arcTop = ground - dh - Math.max(16, slot * 0.35);
    geo.current = { x0: mx, slot, linkBottom: ground - dh + 2 };

    // the ground
    ctx.save();
    ctx.strokeStyle = p.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx * 0.5, ground + 0.5);
    ctx.lineTo(view.w - mx * 0.5, ground + 0.5);
    ctx.stroke();
    ctx.restore();

    const fs = narrow ? 11 : 13;
    // the links P(n) ⇒ P(n+1)
    for (let n = 1; n < K; n++) {
      const x1 = cx(n);
      const x2 = cx(n + 1);
      const yA = ground - dh - 4;
      const mid = (x1 + x2) / 2;
      const outside = n < n0;
      const known = linkShown(n);
      const holds = linkHolds(fam, n, s.x);
      ctx.save();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = outside ? p.ink3 : !known ? p.ink3 : holds ? p.ink2 : p.pointOut;
      if (outside || !known) ctx.setLineDash([4, 4]);
      const gap = known && !holds && !outside ? slot * 0.12 : 0;
      // two halves of the arc, with a gap in the middle when the link is broken
      const arc = (from: number, to: number) => {
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) {
          const t = from + ((to - from) * i) / 16;
          const x = x1 + (x2 - x1) * t;
          const y = yA + (arcTop - yA) * 4 * t * (1 - t);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      if (gap > 0) {
        arc(0, 0.5 - gap / (x2 - x1));
        arc(0.5 + gap / (x2 - x1), 1);
      } else arc(0, 1);
      // the arrowhead at P(n+1)
      ctx.setLineDash([]);
      ctx.fillStyle = ctx.strokeStyle as string;
      ctx.beginPath();
      ctx.moveTo(x2, yA + 1);
      ctx.lineTo(x2 - 4, yA - 6);
      ctx.lineTo(x2 + 3, yA - 6);
      ctx.closePath();
      ctx.fill();
      // the mark: ✓ holds, ✗ broken, ? not checked yet
      if (!outside) {
        ctx.font = `700 ${fs}px ${p.fontUi}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.direction = 'ltr';
        ctx.fillStyle = !known ? p.ink3 : holds ? p.pointIn : p.pointOut;
        ctx.fillText(!known ? '?' : holds ? '✓' : '✗', mid, arcTop - 2);
      }
      ctx.restore();
    }

    // the dominoes
    for (let n = 1; n <= K; n++) {
      const x = cx(n);
      const fallen = n >= n0 && n <= shown;
      const outside = n < n0;
      ctx.save();
      ctx.translate(x + dw / 2, ground);
      if (fallen) ctx.rotate(lean);
      ctx.beginPath();
      ctx.rect(-dw, -dh, dw, dh);
      if (fallen) {
        ctx.fillStyle = p.pointIn;
        ctx.fill();
        // a paper-coloured edge keeps two fallen dominoes that touch apart
        ctx.lineWidth = 1;
        ctx.strokeStyle = p.paper;
        ctx.stroke();
      } else {
        ctx.fillStyle = p.paper;
        ctx.fill();
        ctx.lineWidth = outside ? 1 : 1.8;
        ctx.strokeStyle = outside ? p.ink3 : p.ink2;
        if (outside) ctx.setLineDash([3, 3]);
        ctx.stroke();
      }
      ctx.restore();

      // labels: P(n) (or n on a phone), and the checked truth value when asked
      ctx.save();
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `600 ${fs}px ${p.fontUi}`;
      ctx.fillStyle = outside ? p.ink3 : p.ink;
      ctx.fillText(slot >= 40 ? `P(${n})` : String(n), x, ground + 6);
      if (s.showTruth) {
        const t = fam.P(n, s.x);
        ctx.font = `700 ${fs + 1}px ${p.fontUi}`;
        ctx.fillStyle = t ? p.pointIn : p.pointOut;
        ctx.fillText(t ? '✓' : '✗', x, ground + 10 + fs + 4);
      }
      ctx.restore();
    }

    // the base: an arrow that pushes domino n₀
    {
      const x = cx(n0) - dw / 2 - 3;
      const y = ground - dh * 0.62;
      const len = Math.max(10, Math.min(slot * 0.45, 30));
      const verdict = s.res ? (s.res.base ? '✓' : '✗') : '';
      ctx.save();
      ctx.strokeStyle = p.eps;
      ctx.fillStyle = p.eps;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x - len, y);
      ctx.lineTo(x - 5, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 7, y - 5);
      ctx.lineTo(x - 7, y + 5);
      ctx.closePath();
      ctx.fill();
      if (verdict) {
        ctx.font = `700 ${fs + 1}px ${p.fontUi}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.direction = 'ltr';
        ctx.fillStyle = s.res!.base ? p.pointIn : p.pointOut;
        ctx.fillText(verdict, x - len / 2 - 2, y - 6);
      }
      ctx.restore();
    }

    // the selection
    if (s.sel) {
      ctx.save();
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      const r = 6;
      const [bx, by, bw, bh] =
        s.sel.kind === 'dom'
          ? [cx(s.sel.n) - slot * 0.45, ground - dh - 6, slot * 0.9, dh + 12 + fs + 4]
          : [cx(s.sel.n) + slot * 0.1, arcTop - fs - 6, slot * 0.8, ground - dh - arcTop + fs + 6];
      ctx.beginPath();
      ctx.roundRect?.(bx, by, bw, bh, r);
      ctx.stroke();
      ctx.restore();
    }
  };

  const { canvasRef, invalidate } = useFigureCanvas(draw, { worldWidth: 1.5, worldHeight: 1, animate: false });
  useEffect(invalidate, [s, shown]);

  const hit = (e: PointerEvent): Sel => {
    const g = geo.current;
    if (!g) return null;
    const rel = (e.offsetX - g.x0) / g.slot;
    if (e.offsetY < g.linkBottom) {
      const n = Math.round(rel);
      return n >= 1 && n < K ? { kind: 'link', n } : null;
    }
    const n = Math.floor(rel) + 1;
    return n >= 1 && n <= K ? { kind: 'dom', n } : null;
  };
  const onPointerDown = (e: PointerEvent) => userSelect(hit(e));

  /** arrow keys walk P(1), link 1, P(2), link 2, … left to right; Enter or space pushes the base */
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const i = s.sel ? (s.sel.n - 1) * 2 + (s.sel.kind === 'link' ? 1 : 0) : -1;
      const j = Math.max(0, Math.min(2 * K - 2, i + (e.key === 'ArrowRight' ? 1 : -1)));
      userSelect(j % 2 === 0 ? { kind: 'dom', n: j / 2 + 1 } : { kind: 'link', n: (j - 1) / 2 + 1 });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      userPush();
    }
  };

  const offered = props.fams ?? [];
  const r = s.res;
  return (
    <SimShell
      fig={props.id}
      label={`איור חי: הוכחה באינדוקציה כשורת אבני דומינו. ${claimDir(fam.formula) === 'ltr' ? iso(fam.formula) : fam.formula}. כל אבן היא טענה, משמאל לימין ${iso('P(1)')} עד ${iso(`P(${K})`)}; קשת מעל שתי אבנים שכנות היא החוליה ${iso('P(n) ⇒ P(n+1)')}, מסומנת ✓ כשהיא מחזיקה, ✗ כשהיא שבורה, ו-? כשעוד לא נבדקה. אבן שנפלה מלאה ומוטה; אבן עומדת חלולה. הבסיס הוא ${iso(`P(${n0})`)}. ${verdictText(s)} חצים ימינה ושמאלה בוחרים אבן או חוליה, ואנטר דוחף את הבסיס.`}
      canvasRef={canvasRef}
      aspect={1.9}
      live={live}
      tasks={tasks}
      cursor="pointer"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onReset={() => {
        setS(fresh(props));
        userN0.current = false;
        userX.current = false;
        setLive('האיור אופס.');
      }}
      readout={
        <>
          <span data-readout="claim">
            הטענה: <bdi dir={claimDir(fam.formula)}>{fam.formula}</bdi>
            {fam.hasX && (
              <>
                {' '}
                עם <b class="q" dir="ltr">x = {minus(String(s.x))}</b>
              </>
            )}
          </span>
          <span data-readout="verdict">
            {!r ? (
              <>
                הבסיס: <b class="q" dir="ltr">P({n0})</b>. לחצו "דחיפה".
              </>
            ) : !r.base ? (
              <>
                הבסיס <b class="q" dir="ltr">P({n0})</b> לא נכון: אבן הבסיס לא נופלת, ולכן אף אבן לא נופלת.
              </>
            ) : r.brokenAt !== null ? (
              <>
                נפלו <b class="q" dir="ltr">P({n0})</b> עד <b class="q" dir="ltr">P({r.reach})</b>. השרשרת נעצרה בחוליה השבורה{' '}
                <b class="q" dir="ltr">
                  P({r.brokenAt}) ⇒ P({r.brokenAt + 1})
                </b>
                .
              </>
            ) : (
              <>
                נפלו כל האבנים מ-<b class="q" dir="ltr">P({n0})</b> עד <b class="q" dir="ltr">P({K})</b>, סוף החלון שבאיור.
              </>
            )}
          </span>
          {s.sel && <span data-readout="sel">{selView(s, s.sel)}</span>}
        </>
      }
      controls={
        <>
          {offered.length > 1 && (
            <div class="group" role="group" aria-label="הטענה">
              {offered.map((id) => (
                <Toggle key={id} label={FAMILIES[id].name} on={s.fam === id} onChange={() => pickFam(id)} />
              ))}
            </div>
          )}
          {props.baseSlider && (
            <Slider
              label="הבסיס ⁦n₀⁩"
              value={n0}
              min={1}
              max={K}
              step={1}
              format={(v) => String(Math.round(v))}
              onChange={(v) => {
                userN0.current = true;
                setS({ ...s, n0: Math.round(v), res: null });
              }}
            />
          )}
          {fam.hasX && (
            <Slider
              label="x"
              value={s.x}
              min={-5}
              max={2}
              step={0.1}
              format={(v) => minus(String(clampX(v)))}
              onChange={(v) => {
                userX.current = true;
                setS({ ...s, x: clampX(v), res: null });
              }}
            />
          )}
          <div class="group">
            <button type="button" class="toggle on" data-action="push" onClick={userPush}>
              דחיפה
            </button>
            <Toggle
              label={
                <>
                  הראו בדיקה של כל <bdi dir="ltr">P(n)</bdi>
                </>
              }
              on={s.showTruth}
              onChange={(on) => setS({ ...s, showTruth: on })}
            />
          </div>
        </>
      }
    />
  );
}
