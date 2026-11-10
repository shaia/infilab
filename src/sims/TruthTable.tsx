/**
 * Lesson 0.2's figure: a truth table the student builds and compares. The rows are the four cases of P and Q
 * (TT, TF, FT, FF); the student picks which compound statements to show as columns (P ∧ Q, P ⇒ Q, its converse,
 * its contrapositive…), may fill a column by hand and have it checked (✓ / ✗, a shape, not only a colour), may
 * mark a row, and may put two columns side by side: the figure then writes "=" or "≠" in every row and says
 * whether the two are equivalent. A truth table over two letters is exhaustive, so this verdict is a proof, not a
 * probe (unlike a window of a sequence); the caption says so.
 *
 * Every value comes from src/math/logic.ts. A DOM table, not a canvas: every cell is text a screen reader reads,
 * every control is a button or a select. The table is math space and stays LTR (P on the left, as in the text).
 * Nothing moves, so there is no animation to gate behind motionAllowed().
 */

import { useEffect, useState } from 'preact/hooks';
import { COLUMNS, PQ, differingRows, parse, presetColumn, rows, type ColumnId } from '~/math/logic';
import { markTask, progress } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useMounted } from '~/ui/useMounted';
import { Toggle } from './core/SimShell';
import './core/SimShell.css';
import './TruthTable.css';

/**
 * A formula or a letter in a Hebrew sentence: an LTR isolate (U+2066 … U+2069) with no-break spaces, so the bidi
 * algorithm never reverses it and a line never breaks inside it. Strings carry the isolates (the aria-live line reads
 * them as they are); on screen `rich` turns every isolate into a <bdi dir="ltr"> that CSS keeps on one line.
 */
const LRI = '⁦';
const PDI = '⁩';
const iso = (s: string) => `${LRI}${s.replace(/ /g, ' ')}${PDI}`;
function rich(text: string) {
  return text.split(new RegExp(`[${LRI}${PDI}]`)).map((part, i) =>
    i % 2 === 1 ? (
      <bdi dir="ltr" class="tt-f" key={i}>
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}

const TASK_LABEL: Record<string, string> = {
  'fill-implication': `הפעילו "מלאו בעצמכם", מלאו את כל ארבעת התאים של העמודה ${iso('P ⇒ Q')} ולחצו "בדקו": כל ארבעת התאים נכונים.`,
  'only-false-row': `סמנו, בעיגול שבתחילת השורה, את השורה היחידה שבה ${iso('P ⇒ Q')} שקר.`,
  'neg-implication': `מצאו את העמודה השקולה ל-${iso('¬(P ⇒ Q)')}: בחרו אותה בהשוואה, עד שהאיור כותב "שקולים".`,
  contrapositive: `השוו את ${iso('P ⇒ Q')} לקונטרפוזיטיב שלה, ${iso('¬Q ⇒ ¬P')}, והראו שהן שקולות.`,
  'converse-differs': `השוו את ${iso('P ⇒ Q')} להפוכה, ${iso('Q ⇒ P')}, וסמנו שורה שבה הן נבדלות.`,
  'iff-both': `הראו ש-${iso('P ⇔ Q')} שקולה ל-${iso('(P ⇒ Q) ∧ (Q ⇒ P)')}.`,
};

export type StoryId = 'rain' | 'div9';

interface Story {
  /** what P and Q say, shown under the letters */
  P: string;
  Q: string;
  /** what each row (TT, TF, FT, FF) means in the story */
  rows: [string, string, string, string];
}

const STORIES: Record<StoryId, Story> = {
  rain: {
    P: 'יורד גשם',
    Q: 'ההורה מסיע',
    rows: [
      'ירד גשם, וההורה הסיע אתכם: ההבטחה קוימה.',
      'ירד גשם, וההורה לא הסיע: ההבטחה הופרה. זו השורה היחידה שבה ההבטחה שקרית.',
      'לא ירד גשם, וההורה הסיע בכל זאת: ההבטחה לא דיברה על יום יבש, ולכן לא הופרה.',
      'לא ירד גשם, וההורה לא הסיע: ההבטחה לא הופרה.',
    ],
  },
  div9: {
    P: `${iso('n')} מתחלק ב-9`,
    Q: `${iso('n')} מתחלק ב-3`,
    rows: [
      `למשל ${iso('n = 18')}: מתחלק ב-9 וגם ב-3.`,
      `אין מספר כזה: כל מספר שמתחלק ב-9 מתחלק גם ב-3, כי ${iso('9 = 3·3')}. לכן "אם ${iso('n')} מתחלק ב-9 אז ${iso('n')} מתחלק ב-3" נכונה לכל ${iso('n')}.`,
      `למשל ${iso('n = 6')}: מתחלק ב-3 ואינו מתחלק ב-9. לכן ההפוכה, "אם ${iso('n')} מתחלק ב-3 אז ${iso('n')} מתחלק ב-9", אינה נכונה.`,
      `למשל ${iso('n = 4')}: לא מתחלק ב-9 ולא ב-3.`,
    ],
  },
};

type Guess = boolean | null;
type Pair = [ColumnId, ColumnId];

interface State {
  cols: ColumnId[];
  fill: boolean;
  story: StoryId | null;
  compare: Pair | null;
  row: number | null;
  guesses: Partial<Record<ColumnId, Guess[]>>;
  /** "בדקו" was pressed and nothing was changed since: the ✓ / ✗ marks are shown */
  checked: boolean;
}

export interface TruthTableProps {
  id: string;
  /** the columns shown first */
  cols?: ColumnId[];
  /** the columns the student may add or remove (default: the ones shown first) */
  offer?: ColumnId[];
  fill?: boolean;
  story?: StoryId;
  compare?: Pair;
  tasks?: string[];
}

const ROWS = rows(PQ);
const TF = (b: boolean) => (b ? 'T' : 'F');
const WORD = (b: boolean) => (b ? 'אמת' : 'שקר');
const isColumn = (c: unknown): c is ColumnId => typeof c === 'string' && c in COLUMNS;
const samePair = (p: Pair | null, a: ColumnId, b: ColumnId) => !!p && ((p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
const label = (id: ColumnId) => COLUMNS[id].src;
const differ = (p: Pair) => differingRows(parse(COLUMNS[p[0]].src), parse(COLUMNS[p[1]].src), PQ);

function fresh(p: TruthTableProps): State {
  return {
    cols: p.cols ?? [],
    fill: p.fill ?? false,
    story: p.story ?? null,
    compare: p.compare ?? null,
    row: null,
    guesses: {},
    checked: false,
  };
}

/** A compare pair survives only while both of its columns are shown. */
const keepPair = (pair: Pair | null, cols: ColumnId[]) => (pair && cols.includes(pair[0]) && cols.includes(pair[1]) ? pair : null);

export default function TruthTable(props: TruthTableProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const mounted = useMounted();
  const done = mounted ? progress.value.tasks : {};
  const tasks = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));
  const offer = props.offer ?? props.cols ?? [];
  const has = (t: string) => props.tasks?.includes(t) ?? false;
  const mark = (t: string) => markTask(`${props.id}:${t}`);

  /**
   * The student's own change. A text step sets state through subscribeSteps and never ticks a task; a task ticks
   * only when this change touches the control it is about (the check button, the row marker, the comparison).
   * A step may already show the goal (2.2's lesson learned this): a step that sets the comparison to the converse
   * does not mark a row, and a step never sets the comparison a "show they are equivalent" task asks for.
   */
  const userSet = (patch: Partial<State>, action?: 'check') => {
    const next: State = { ...s, ...patch };
    next.compare = keepPair(next.compare, next.cols);
    setS(next);
    const shown = (c: ColumnId) => next.cols.includes(c);
    if (action === 'check' && has('fill-implication') && shown('impl')) {
      const want = presetColumn('impl');
      const g = next.guesses.impl ?? [];
      if (want.every((v, i) => g[i] === v)) mark('fill-implication');
    }
    if (patch.row !== undefined && next.row === 1 && has('only-false-row') && shown('impl')) mark('only-false-row');
    const movedCompare = patch.compare !== undefined;
    if (movedCompare && next.compare && !next.fill) {
      const [a, b] = next.compare;
      const same = differ(next.compare).length === 0 && a !== b;
      if (has('neg-implication') && same && (a === 'negImpl' || b === 'negImpl')) mark('neg-implication');
      if (has('contrapositive') && samePair(next.compare, 'impl', 'contra')) mark('contrapositive');
      if (has('iff-both') && samePair(next.compare, 'iff', 'both')) mark('iff-both');
    }
    if ((patch.row !== undefined || movedCompare) && has('converse-differs') && !next.fill && samePair(next.compare, 'impl', 'conv')) {
      if (next.row !== null && differ(next.compare!).includes(next.row)) mark('converse-differs');
    }
  };

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = { ...prev, checked: false };
          if (Array.isArray(st.cols)) next.cols = st.cols.filter(isColumn);
          if (typeof st.fill === 'boolean') next.fill = st.fill;
          if (st.story === null || (typeof st.story === 'string' && st.story in STORIES)) next.story = st.story as StoryId | null;
          if (st.compare === null) next.compare = null;
          else if (Array.isArray(st.compare) && st.compare.length === 2 && st.compare.every(isColumn)) next.compare = st.compare as Pair;
          if (st.row === null || (typeof st.row === 'number' && st.row >= 0 && st.row < 4)) next.row = st.row as number | null;
          next.compare = keepPair(next.compare, next.cols);
          return next;
        });
      }),
    [props.id],
  );

  const story = s.story ? STORIES[s.story] : null;
  const pair = s.fill ? null : s.compare;
  const diffs = pair ? differ(pair) : [];
  const guessOf = (c: ColumnId) => s.guesses[c] ?? [null, null, null, null];
  const filled = (c: ColumnId) => guessOf(c).every((g) => g !== null);
  const score = (c: ColumnId) => {
    const want = presetColumn(c);
    return guessOf(c).filter((g, i) => g === want[i]).length;
  };

  const verdict = pair
    ? diffs.length === 0
      ? `העמודות ${iso(label(pair[0]))} ו-${iso(label(pair[1]))} מקבלות אותו ערך בכל ארבע השורות: הן שקולות.`
      : `העמודות ${iso(label(pair[0]))} ו-${iso(label(pair[1]))} נבדלות ב${diffs.length === 1 ? 'שורה' : 'שורות'} ${diffs.map((i) => i + 1).join(' ו-')}: הן אינן שקולות.`
    : '';
  const rowText =
    s.row === null
      ? ''
      : `שורה ${s.row + 1}: ${iso('P')} ${WORD(ROWS[s.row].P!)}, ${iso('Q')} ${WORD(ROWS[s.row].Q!)}.` +
        (s.fill ? '' : s.cols.map((c) => ` ${iso(label(c))}: ${WORD(presetColumn(c)[s.row!])}.`).join(''));

  useEffect(() => {
    const id = setTimeout(() => {
      const parts: string[] = [];
      parts.push(s.cols.length ? `עמודות: ${s.cols.map((c) => iso(label(c))).join(', ')}.` : 'רק העמודות P ו-Q.');
      if (rowText) parts.push(rowText);
      if (story && s.row !== null) parts.push(story.rows[s.row]);
      if (verdict) parts.push(verdict);
      if (s.fill && s.checked) parts.push(s.cols.map((c) => `${iso(label(c))}: ${score(c)} מתוך 4 נכונים.`).join(' '));
      setLive(parts.join(' '));
    }, 300);
    return () => clearTimeout(id);
  }, [s]);

  const toggleCol = (c: ColumnId) => {
    const cols = s.cols.includes(c) ? s.cols.filter((x) => x !== c) : [...s.cols, c];
    userSet({ cols, checked: false });
  };
  const cycle = (c: ColumnId, i: number) => {
    const g = [...guessOf(c)];
    // empty → T → F → empty
    g[i] = g[i] === null ? true : g[i] === true ? false : null;
    userSet({ guesses: { ...s.guesses, [c]: g }, checked: false });
  };
  const setCompare = (k: 0 | 1, v: string) => {
    // the first choice in an empty comparison pairs with the first other column shown; the student changes it next
    const other = s.compare ? s.compare[1 - k] : s.cols.find((c) => c !== v);
    if (!isColumn(v) || !isColumn(other)) {
      userSet({ compare: null });
      return;
    }
    const p: Pair = k === 0 ? [v, other] : [other, v];
    userSet({ compare: p });
  };

  const cell = (c: ColumnId, i: number) => {
    const want = presetColumn(c)[i];
    if (!s.fill) {
      return (
        <td key={c} class={`v ${want ? 't' : 'f'}`} aria-label={WORD(want)}>
          {TF(want)}
        </td>
      );
    }
    const g = guessOf(c)[i];
    const ok = s.checked && g !== null ? g === want : null;
    return (
      <td key={c} class={`fillcell ${ok === true ? 'ok' : ok === false ? 'bad' : ''}`}>
        <button
          type="button"
          class="guess"
          onClick={() => cycle(c, i)}
          aria-label={`שורה ${i + 1}, עמודה ${label(c)}: ${g === null ? 'ריק' : WORD(g)}${ok === null ? '' : ok ? ', נכון' : ', לא נכון'}. לחיצה מחליפה בין ריק, אמת ושקר.`}
        >
          {g === null ? '?' : TF(g)}
        </button>
        {ok !== null && (
          <span class="mark" aria-hidden="true">
            {ok ? '✓' : '✗'}
          </span>
        )}
      </td>
    );
  };

  return (
    <div class="sim tt" data-fig={props.id}>
      <div class="tt-stage ltr-space">
        <div class="tt-scroll">
          <table class="tt-table" dir="ltr">
            <caption class="sr-only">
              טבלת אמת: ארבע השורות של P ו-Q, ובכל עמודה ערך האמת של פסוק. T פירושו אמת ו-F פירושו שקר.
            </caption>
            <thead>
              <tr>
                <th scope="col" class="rowh">
                  <span class="sr-only">סימון שורה</span>
                </th>
                <th scope="col" class="letter">
                  P{story && <span class="gloss" dir="rtl">{rich(story.P)}</span>}
                </th>
                <th scope="col" class="letter sep">
                  Q{story && <span class="gloss" dir="rtl">{rich(story.Q)}</span>}
                </th>
                {s.cols.map((c) => (
                  <th scope="col" key={c} class={pair && (pair[0] === c || pair[1] === c) ? 'cmp' : ''}>
                    <span class="formula">{label(c)}</span>
                    {COLUMNS[c].role && (
                      <span class="gloss" dir="rtl">
                        {COLUMNS[c].role}
                      </span>
                    )}
                  </th>
                ))}
                {pair && (
                  <th scope="col" class="cmpcol">
                    <span class="sr-only">השוואה</span>
                    <span aria-hidden="true">= / ≠</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={i} class={s.row === i ? 'picked' : ''}>
                  <td class="rowh">
                    <button
                      type="button"
                      class="pick"
                      aria-pressed={s.row === i}
                      aria-label={`סמנו את שורה ${i + 1}: P ${WORD(r.P!)}, Q ${WORD(r.Q!)}`}
                      onClick={() => userSet({ row: s.row === i ? null : i })}
                    >
                      <span aria-hidden="true">{s.row === i ? '●' : '○'}</span> {i + 1}
                    </button>
                  </td>
                  <td class={`v ${r.P ? 't' : 'f'}`} aria-label={WORD(r.P!)}>
                    {TF(r.P!)}
                  </td>
                  <td class={`v sep ${r.Q ? 't' : 'f'}`} aria-label={WORD(r.Q!)}>
                    {TF(r.Q!)}
                  </td>
                  {s.cols.map((c) => cell(c, i))}
                  {pair && (
                    <td class={`cmpcell ${diffs.includes(i) ? 'ne' : 'eq'}`} aria-label={diffs.includes(i) ? 'שונות' : 'שוות'}>
                      {diffs.includes(i) ? '≠' : '='}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div class="sim-tools">
          <button
            type="button"
            class="tool"
            title="איפוס"
            aria-label="איפוס"
            onClick={() => {
              setS(fresh(props));
              setLive('האיור אופס.');
            }}
          >
            ↺
          </button>
        </div>
      </div>

      <div class="sim-readout">
        {s.row !== null && (
          <span data-readout="row">
            {rich(rowText)}
            {story && <> {rich(story.rows[s.row])}</>}
          </span>
        )}
        {pair && <span data-readout="verdict">{rich(verdict)}</span>}
        {s.fill && s.checked && (
          <span data-readout="score">
            {s.cols.map((c) => (
              <span key={c} class="score">
                {rich(iso(label(c)))}: <b class="q">{score(c)}</b> מתוך 4 נכונים{filled(c) ? '' : ' (יש תאים ריקים)'}.{' '}
              </span>
            ))}
          </span>
        )}
        {s.row === null && !pair && !(s.fill && s.checked) && (
          <span data-readout="hint">
            {s.fill
              ? rich(`לחצו על תא כדי למלא אותו (כל לחיצה מחליפה: ריק, ${iso('T')}, ${iso('F')}), ואחר כך לחצו "בדקו".`)
              : 'סמנו שורה בעיגול שבתחילתה, או בחרו שתי עמודות בתיבות "השוו את" ו"עם" שמתחת לטבלה.'}
          </span>
        )}
      </div>

      <div class="sim-controls">
        {offer.length > 0 && (
          <div class="group" role="group" aria-label="העמודות שבטבלה">
            {offer.map((c) => (
              <Toggle key={c} label={<bdi dir="ltr">{label(c)}</bdi>} on={s.cols.includes(c)} onChange={() => toggleCol(c)} />
            ))}
          </div>
        )}
        <div class="group">
          <Toggle label="מלאו בעצמכם" on={s.fill} onChange={(on) => userSet({ fill: on, checked: false })} />
          {s.fill && (
            <button type="button" class="toggle check-btn" onClick={() => userSet({ checked: true }, 'check')} disabled={s.cols.length === 0}>
              בדקו
            </button>
          )}
          {props.story && <Toggle label="הסיפור" on={s.story !== null} onChange={(on) => userSet({ story: on ? props.story! : null })} />}
        </div>
        {!s.fill && s.cols.length >= 2 && (
          <div class="group tt-compare" role="group" aria-label="השוואה בין שתי עמודות">
            <label>
              השוו את{' '}
              <select dir="ltr" value={s.compare?.[0] ?? ''} onChange={(e) => setCompare(0, (e.target as HTMLSelectElement).value)}>
                <option value="">—</option>
                {s.cols.map((c) => (
                  <option key={c} value={c}>
                    {label(c)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              עם{' '}
              <select dir="ltr" value={s.compare?.[1] ?? ''} onChange={(e) => setCompare(1, (e.target as HTMLSelectElement).value)}>
                <option value="">—</option>
                {s.cols.map((c) => (
                  <option key={c} value={c}>
                    {label(c)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {tasks.length > 0 && (
        <ol class="sim-tasks" aria-label="משימות">
          {tasks.map((t) => {
            const ok = !!done[`${props.id}:${t.id}`];
            return (
              <li class={ok ? 'done' : ''} key={t.id}>
                <span class="tick" aria-hidden="true">
                  {ok ? '✓' : ''}
                </span>
                <span>{rich(t.label)}</span>
                {ok && <span class="sr-only"> (הושלם)</span>}
              </li>
            );
          })}
        </ol>
      )}
      <p class="sr-only" aria-live="polite">
        {live}
      </p>
    </div>
  );
}
