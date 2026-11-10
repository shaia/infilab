/**
 * Lesson 0.1's figure: reading a mathematical text by its roles and a proof by its justifications. A DOM island
 * (text, not a canvas). The learner labels each block of a short text (definition, claim, example, proof) and picks,
 * for each numbered line of the proof, what justifies it: the claim's hypothesis, a definition, algebra, an accepted fact or an earlier result,
 * or nothing (a gap). Every pick is marked right or wrong by shape (✓ filled, ✗ hollow) as well as colour, and the
 * feedback box explains the latest pick.
 *
 * The presets and the key live in src/math/proofs.ts; the .astro wrapper renders their TeX at build time and hands the
 * HTML in `rendered`. Text steps (subscribeSteps) only switch the preset and highlight a block or a line: they never
 * write an answer, so every answer, and every task, is the learner's own (CLAUDE.md, "Explore").
 */

import { useEffect, useState } from 'preact/hooks';
import {
  JUSTIFICATIONS,
  JUSTIFICATION_LABEL,
  PRESETS,
  ROLES,
  ROLE_LABEL,
  allJustified,
  allLabelled,
  emptyAnswers,
  gapFound,
  justRight,
  justScore,
  linesOf,
  roleRight,
  roleScore,
  type Answers,
  type Justification,
  type Role,
} from '~/math/proofs';
import { markTask, progress } from '~/progress/store';
import { subscribeSteps } from '~/ui/steps';
import { useMounted } from '~/ui/useMounted';
import './core/SimShell.css';
import './ProofReader.css';

/** Build-time HTML of one preset: every text, and the feedback for every possible pick. */
export interface RenderedPreset {
  name: string;
  blocks: Record<string, { html: string; feedback: Record<Role, { ok: boolean; html: string }> }>;
  lines: Record<number, { html: string; feedback: Record<Justification, { ok: boolean; html: string }> }>;
}

export interface ProofReaderProps {
  id: string;
  /** the preset shown first */
  preset?: string;
  /** the presets offered in the picker (one: no picker) */
  presets?: string[];
  tasks?: string[];
  /** filled by ProofReader.astro */
  rendered: Record<string, RenderedPreset>;
}

const TASK_LABEL: Record<string, string> = {
  'label-blocks': 'סמנו לכל קטע בטקסט את התפקיד שלו, עד שכל הקטעים מסומנים נכון.',
  'justify-all': 'בהוכחה בלי פער, בחרו לכל שורה מה מצדיק אותה, עד שכל השורות נכונות.',
  'find-gap': 'בהוכחה עם פער, מצאו את השורה שאין לה הצדקה, וסמנו רק אותה כ"אין הצדקה".',
};

interface Focus {
  block?: string;
  line?: number;
}

interface State {
  preset: string;
  /** the learner's answers, per preset: switching presets keeps them */
  answers: Record<string, Answers>;
  focus: Focus;
  /** the feedback of the latest pick */
  last: { ok: boolean; html: string; where: string } | null;
}

const fresh = (p: ProofReaderProps): State => ({
  preset: p.preset && p.preset in PRESETS ? p.preset : (p.presets?.[0] ?? 'even-sum'),
  answers: {},
  focus: {},
  last: null,
});

export default function ProofReader(props: ProofReaderProps) {
  const [s, setS] = useState<State>(() => fresh(props));
  const [live, setLive] = useState('');
  const mounted = useMounted();
  const done = mounted ? progress.value.tasks : {};

  const preset = PRESETS[s.preset];
  const r = props.rendered[s.preset];
  const a = s.answers[s.preset] ?? emptyAnswers();
  const roles = roleScore(preset, a);
  const justs = justScore(preset, a);

  /** The learner's own pick: the only path that ticks a task. */
  const commit = (next: Answers, last: State['last']) => {
    setS((prev) => ({ ...prev, answers: { ...prev.answers, [prev.preset]: next }, last }));
    const has = (t: string) => props.tasks?.includes(t);
    if (has('label-blocks') && allLabelled(preset, next)) markTask(`${props.id}:label-blocks`);
    if (has('justify-all') && allJustified(preset, next)) markTask(`${props.id}:justify-all`);
    if (has('find-gap') && gapFound(preset, next)) markTask(`${props.id}:find-gap`);
  };

  const pickRole = (blockId: string, role: Role) => {
    const next: Answers = { ...a, roles: { ...a.roles, [blockId]: role } };
    const fb = r.blocks[blockId].feedback[role];
    commit(next, { ...fb, where: `${ROLE_LABEL[role]}:` });
    setLive(`${ROLE_LABEL[role]}: ${fb.ok ? 'נכון' : 'לא נכון'}.`);
  };

  const pickJust = (n: number, j: Justification | '') => {
    const next: Answers = { ...a, justs: { ...a.justs, [n]: j === '' ? undefined : j } };
    if (j === '') {
      commit(next, null);
      return;
    }
    const fb = r.lines[n].feedback[j];
    commit(next, { ...fb, where: `שורה (${n}), ${JUSTIFICATION_LABEL[j]}:` });
    setLive(`שורה ${n}, ${JUSTIFICATION_LABEL[j]}: ${fb.ok ? 'נכון' : 'לא נכון'}.`);
  };

  const pickPreset = (id: string) => setS((prev) => ({ ...prev, preset: id, focus: {}, last: null }));

  useEffect(
    () =>
      subscribeSteps(props.id, (st) => {
        setS((prev) => {
          const next = { ...prev, focus: {} as Focus, last: null };
          if (typeof st.preset === 'string' && st.preset in PRESETS && props.rendered[st.preset]) next.preset = st.preset;
          if (typeof st.block === 'string') next.focus.block = st.block;
          if (typeof st.line === 'number') next.focus.line = st.line;
          return next;
        });
      }),
    [props.id],
  );

  const offered = (props.presets ?? []).filter((id) => id in PRESETS && props.rendered[id]);
  const tasks = (props.tasks ?? []).map((id) => ({ id, label: TASK_LABEL[id] ?? id }));
  const mark = (ok: boolean | null) =>
    ok === null ? null : (
      <span class={`pr-mark ${ok ? 'ok' : 'bad'}`} aria-hidden="true">
        {ok ? '✓' : '✗'}
      </span>
    );

  return (
    <div class="sim proofreader" data-preset={s.preset}>
      {offered.length > 1 && (
        <div class="sim-controls">
          <div class="group" role="group" aria-label="הטקסט">
            {offered.map((id) => (
              <button
                type="button"
                key={id}
                class={`toggle ${s.preset === id ? 'on' : ''}`}
                aria-pressed={s.preset === id}
                onClick={() => pickPreset(id)}
              >
                {props.rendered[id].name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div class="pr-text">
        {preset.blocks.map((b, i) => {
          const picked = a.roles[b.id];
          const ok = picked === undefined ? null : roleRight(preset, b.id, picked);
          return (
            <section class={`pr-block ${s.focus.block === b.id ? 'focus' : ''}`} key={b.id} data-block={b.id} aria-label={`קטע ${i + 1}`}>
              <div class="pr-roles" role="group" aria-label="מה התפקיד של הקטע?">
                {ROLES.map((role) => (
                  <button
                    type="button"
                    key={role}
                    class={`pr-chip ${picked === role ? 'on' : ''}`}
                    aria-pressed={picked === role}
                    onClick={() => pickRole(b.id, role)}
                  >
                    {ROLE_LABEL[role]}
                  </button>
                ))}
                {mark(ok)}
              </div>
              {b.lines ? (
                <ol class="pr-lines">
                  {linesOf(preset).map((l) => {
                    const j = a.justs[l.n];
                    const lok = j === undefined ? null : justRight(preset, l.n, j);
                    return (
                      <li class={`pr-line ${s.focus.line === l.n ? 'focus' : ''}`} key={l.n} data-line={l.n}>
                        <span class="pr-n">({l.n})</span>
                        <span class="pr-line-text" dangerouslySetInnerHTML={{ __html: r.lines[l.n].html }} />
                        <span class="pr-just">
                          <select
                            aria-label={`מה מצדיק את שורה ${l.n}?`}
                            value={j ?? ''}
                            onChange={(e) => pickJust(l.n, (e.target as HTMLSelectElement).value as Justification | '')}
                          >
                            <option value="">מה מצדיק?</option>
                            {JUSTIFICATIONS.map((x) => (
                              <option value={x} key={x}>
                                {JUSTIFICATION_LABEL[x]}
                              </option>
                            ))}
                          </select>
                          {mark(lok)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p class="pr-body" dangerouslySetInnerHTML={{ __html: r.blocks[b.id].html }} />
              )}
            </section>
          );
        })}
      </div>

      <div class={`pr-feedback ${s.last ? (s.last.ok ? 'ok' : 'bad') : ''}`} data-readout="feedback">
        {s.last ? (
          <>
            {mark(s.last.ok)} <b>{s.last.where}</b> <span dangerouslySetInnerHTML={{ __html: s.last.html }} />
          </>
        ) : (
          <span class="pr-muted">בחרו תפקיד לקטע או הצדקה לשורה, וכאן יופיע הסבר.</span>
        )}
      </div>

      <div class="sim-readout">
        <span data-readout="roles">
          תפקידים נכונים: <b class="q">{roles.right}</b> מתוך <b class="q">{roles.total}</b>
        </span>
        <span data-readout="justs">
          הצדקות נכונות: <b class="q">{justs.right}</b> מתוך <b class="q">{justs.total}</b>
        </span>
        <button
          type="button"
          class="toggle"
          aria-label="איפוס"
          onClick={() => {
            setS(fresh(props));
            setLive('האיור אופס.');
          }}
        >
          ↺ איפוס
        </button>
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
                <span>{t.label}</span>
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
