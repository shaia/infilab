/**
 * MODEL SPECIFICATION
 *
 * System:        a short mathematical text, as lesson 0.1's figure (ProofReader) shows it: a few blocks, each with
 *                a role (definition, claim, example, proof), and a proof made of numbered lines. Each line has one
 *                justification: the claim's hypothesis, a definition, algebra, a known fact, or none (a gap).
 * Dynamics:      none. A learner's answers are graded against the key here.
 * Boundary:      the key is one justification per line. The texts are written so that each line makes a single
 *                move, and its feedback names the earlier lines it uses ("from line 2, by algebra"): "an earlier
 *                line" is never a justification on its own: a line either stands alone (the hypothesis, a known
 *                fact, an identity) or comes from earlier lines, and the question is which rule lets it do so.
 *                "Algebra" includes multiplying or dividing an inequality by a positive number; the known facts are
 *                the list lesson 0.1 states (anchor #known-facts), and never the claim itself or its rewording.
 * Ignored:       logical rules (contrapositive, cases, contradiction): they come in lessons 0.2 and 0.4, and the
 *                presets avoid them.
 * Valid when:    every preset passes `presetProblems` (tests/math/proofs.test.ts): ids unique, every line keyed,
 *                a gap preset has its gap lines keyed `none`, and a preset without a gap has none.
 * Failure modes: a line that makes two moves has two honest answers; the presets split such lines in two.
 *
 * The texts are Hebrew with $TeX$, rendered at build time by the figure's .astro wrapper (src/lib/tex.ts), so a
 * TeX error fails the build. Backslashes are doubled: '\\frac' (a single '\f' is a form feed; the tests catch it).
 */

export type Role = 'definition' | 'claim' | 'example' | 'proof';
export type Justification = 'hypothesis' | 'definition' | 'algebra' | 'known' | 'none';

export const ROLES: Role[] = ['definition', 'claim', 'example', 'proof'];
export const JUSTIFICATIONS: Justification[] = ['hypothesis', 'definition', 'algebra', 'known', 'none'];

/** The labels the learner picks from (plain text: buttons and options). */
export const ROLE_LABEL: Record<Role, string> = {
  definition: 'הגדרה',
  claim: 'טענה',
  example: 'דוגמה',
  proof: 'הוכחה',
};
export const JUSTIFICATION_LABEL: Record<Justification, string> = {
  hypothesis: 'ההנחה',
  definition: 'הגדרה',
  algebra: 'חשבון',
  known: 'עובדה ידועה',
  none: 'אין הצדקה (פער)',
};

export interface ProofLine {
  /** the line number as printed, 1, 2, … */
  n: number;
  text: string;
  just: Justification;
  /** the earlier lines this one uses, named in the feedback */
  uses: number[];
  /** shown once the learner picks the right justification */
  why: string;
  /** shown for a specific wrong pick; otherwise a generic hint */
  wrong?: Partial<Record<Justification, string>>;
}

export interface TextBlock {
  id: string;
  role: Role;
  /** the block's text; a proof block's text is its lines */
  text?: string;
  lines?: ProofLine[];
  /** shown once the learner picks the right role */
  why: string;
  /** shown for a wrong pick */
  hint: string;
}

export interface ProofPreset {
  id: string;
  /** button label */
  name: string;
  blocks: TextBlock[];
}

/** The proof block of a preset (each preset has exactly one). */
export const proofOf = (p: ProofPreset): TextBlock => p.blocks.find((b) => b.role === 'proof')!;
export const linesOf = (p: ProofPreset): ProofLine[] => proofOf(p).lines ?? [];
/** The line numbers with no valid justification. */
export const gapLines = (p: ProofPreset): number[] => linesOf(p).filter((l) => l.just === 'none').map((l) => l.n);
export const hasGap = (p: ProofPreset): boolean => gapLines(p).length > 0;

const EVEN_DEF: Omit<TextBlock, 'id'> = {
  role: 'definition',
  text: 'מספר שלם $n$ נקרא **זוגי** אם קיים מספר שלם $k$ כך ש-$n=2k$.',
  why: 'המילה "נקרא" מסמנת הגדרה: השורה נותנת שם, "זוגי", לתכונה. אין בה מה להוכיח.',
  hint: 'האם השורה אומרת שמשהו נכון, או קובעת מה פירוש מילה? חפשו את המילה "נקרא".',
};

const GENERIC_ROLE_HINT = 'שאלו: האם הקטע נותן שם (הגדרה), אומר משהו שצריך להוכיח (טענה), מראה מקרה אחד (דוגמה), או מראה למה טענה נכונה (הוכחה)?';
export const GENERIC_LINE_HINT =
  'לא בדיוק. שאלו: מאילו שורות קודמות יוצאת השורה הזו, ואיזה כלל מעביר מהן אליה?';

export const PRESETS: Record<string, ProofPreset> = {
  'even-sum': {
    id: 'even-sum',
    name: 'סכום של זוגיים',
    blocks: [
      { id: 'def', ...EVEN_DEF },
      {
        id: 'claim',
        role: 'claim',
        text: 'אם $a$ ו-$b$ מספרים שלמים זוגיים, אז גם $a+b$ זוגי.',
        why: 'הקטע אומר שמשהו נכון לכל שני שלמים זוגיים, וזה דורש הוכחה. יש לו הנחה (אחרי "אם") ומסקנה (אחרי "אז").',
        hint: 'האם הקטע נותן שם למשהו, או אומר שמשהו נכון? ואם הוא אומר שמשהו נכון, על כמה מקרים?',
      },
      {
        id: 'example',
        role: 'example',
        text: 'למשל, $6$ ו-$10$ זוגיים, וסכומם $16=2\\cdot 8$ זוגי.',
        why: 'המילה "למשל" מסמנת דוגמה: מקרה אחד שעוזר להבין את הטענה. הוא לא מוכיח אותה, כי הטענה מדברת על כל שני זוגיים.',
        hint: 'כמה מקרים הקטע בודק? מקרה אחד אינו מוכיח טענה על כל המספרים.',
      },
      {
        id: 'proof',
        role: 'proof',
        why: 'שורות ממוספרות שמתחילות ב"נניח" ומסתיימות במסקנה של הטענה: זו הוכחה.',
        hint: 'הקטע מתחיל במה שמניחים ומגיע, שורה אחר שורה, למה שהטענה אומרת.',
        lines: [
          {
            n: 1,
            text: 'נניח ש-$a$ ו-$b$ שלמים זוגיים.',
            just: 'hypothesis',
            uses: [],
            why: 'זו ההנחה של הטענה, מה שכתוב אחרי "אם". מותר להשתמש בה בלי להוכיח אותה.',
            wrong: { definition: 'השורה עוד לא משתמשת בהגדרה של "זוגי": היא רק אומרת מה נתון. מאיפה זה נתון?' },
          },
          {
            n: 2,
            text: 'לכן קיימים שלמים $k$ ו-$m$ כך ש-$a=2k$ ו-$b=2m$.',
            just: 'definition',
            uses: [1],
            why: 'ההגדרה של "זוגי" מתרגמת את שורה (1) לנוסחה. שני שמות שונים, $k$ ו-$m$, כי אין סיבה שיהיו שווים.',
            wrong: { algebra: 'אין כאן שום חישוב: המילה "זוגי" הוחלפה בנוסחה. מה מתיר את ההחלפה?' },
          },
          {
            n: 3,
            text: 'לכן $a+b=2k+2m=2(k+m)$.',
            just: 'algebra',
            uses: [2],
            why: 'מציבים את שורה (2) ומוציאים את 2 כגורם משותף: חשבון.',
          },
          {
            n: 4,
            text: '$k+m$ מספר שלם.',
            just: 'known',
            uses: [2],
            why: 'סכום של שני שלמים הוא שלם: עובדה ידועה מבית הספר, שהקורס מקבל בינתיים.',
            wrong: { algebra: 'אין כאן חישוב: השורה אומרת איזה סוג מספר הוא $k+m$. זו עובדה שאנחנו כבר יודעים.' },
          },
          {
            n: 5,
            text: 'לכן $a+b$ זוגי.',
            just: 'definition',
            uses: [3, 4],
            why: 'לפי שורות (3) ו-(4), $a+b$ הוא 2 כפול מספר שלם, וזו בדיוק ההגדרה של "זוגי", עם $k+m$ במקום $k$.',
            wrong: { hypothesis: 'זו המסקנה של הטענה, לא ההנחה שלה. מה מתיר לקרוא את שורות (3) ו-(4) כ"זוגי"?' },
          },
        ],
      },
    ],
  },

  'square-ineq': {
    id: 'square-ineq',
    name: 'ריבוע אינו שלילי',
    blocks: [
      {
        id: 'claim',
        role: 'claim',
        text: 'לכל מספר ממשי $x$ מתקיים $x^2+1\\ge 2x$.',
        why: 'הקטע אומר שאי-שוויון נכון לכל $x$ ממשי: טענה. אין בו "אם", אבל "לכל $x$ ממשי" פירושו "אם $x$ ממשי, אז…".',
        hint: 'האם הקטע אומר שמשהו נכון? על כמה ערכים של $x$?',
      },
      {
        id: 'example',
        role: 'example',
        text: 'למשל, עבור $x=3$: $3^2+1=10$ ו-$2\\cdot 3=6$, ו-$10\\ge 6$. עבור $x=1$ יש שוויון: $2=2$.',
        why: 'שני מקרים מסוימים, אחרי "למשל": דוגמה. היא בודקת שקראנו את הטענה נכון, ולא מוכיחה אותה.',
        hint: 'הקטע בודק שני ערכים מסוימים של $x$. האם זה מוכיח משהו על כל $x$?',
      },
      {
        id: 'proof',
        role: 'proof',
        why: 'שורות ממוספרות מ-$x$ כללי עד אי-השוויון של הטענה: הוכחה.',
        hint: 'הקטע מתחיל ב-$x$ כלשהו ומגיע, שורה אחר שורה, לאי-השוויון שבטענה.',
        lines: [
          {
            n: 1,
            text: 'יהי $x$ מספר ממשי.',
            just: 'hypothesis',
            uses: [],
            why: 'הטענה מדברת על כל $x$ ממשי, ולכן ההוכחה מתחילה מ-$x$ כלשהו, בלי לבחור ערך. מה שמותר להניח עליו הוא רק מה שהטענה נותנת: שהוא ממשי.',
            wrong: { none: 'זו לא קפיצה: ההוכחה רק נותנת שם ל-$x$ שהטענה מדברת עליו. מה הטענה נותנת לנו?' },
          },
          {
            n: 2,
            text: '$x^2+1-2x=(x-1)^2$.',
            just: 'algebra',
            uses: [],
            why: 'פתיחת סוגריים: $(x-1)^2=x^2-2x+1$. זהות שנכונה לכל $x$, ולכן היא לא צריכה אף שורה קודמת.',
          },
          {
            n: 3,
            text: '$(x-1)^2\\ge 0$.',
            just: 'known',
            uses: [1],
            why: 'ריבוע של מספר ממשי אינו שלילי: עובדה ידועה מבית הספר, מהרשימה שבשיעור. בפרק 1 נוכיח אותה מהתכונות היסודיות של המספרים הממשיים. השורה לא יוצאת משום שורה קודמת: עובדה ידועה יכולה להופיע בכל מקום בהוכחה.',
            wrong: { algebra: 'אין כאן חישוב: זו עובדה על ריבועים שאנחנו כבר יודעים.' },
          },
          {
            n: 4,
            text: 'לכן $x^2+1-2x\\ge 0$.',
            just: 'algebra',
            uses: [2, 3],
            why: 'מציבים את השוויון של שורה (2) באי-השוויון של שורה (3): חשבון (הצבה של שווה במקום שווה).',
          },
          {
            n: 5,
            text: 'לכן $x^2+1\\ge 2x$.',
            just: 'algebra',
            uses: [4],
            why: 'מוסיפים $2x$ לשני האגפים של שורה (4). הוספה של אותו מספר לשני האגפים שומרת על כיוון אי-השוויון.',
          },
        ],
      },
    ],
  },

  'sqrt-gap': {
    id: 'sqrt-gap',
    name: 'הוכחה עם פער',
    blocks: [
      { id: 'def', ...EVEN_DEF },
      {
        id: 'claim',
        role: 'claim',
        text: 'לכל $n$ טבעי: אם $n^2$ זוגי, אז $n$ זוגי.',
        why: 'הקטע אומר שמשהו נכון לכל $n$ טבעי, עם הנחה ($n^2$ זוגי) ומסקנה ($n$ זוגי): טענה.',
        hint: 'האם הקטע נותן שם למשהו, או אומר שמשהו נכון לכל $n$?',
      },
      {
        id: 'example',
        role: 'example',
        text: 'למשל, $36=6^2$ זוגי, ואכן $6$ זוגי.',
        why: 'מקרה אחד, אחרי "למשל": דוגמה.',
        hint: 'כמה מקרים הקטע בודק?',
      },
      {
        id: 'proof',
        role: 'proof',
        why: 'שורות ממוספרות מההנחה אל המסקנה: הוכחה. האם היא תקינה? זו שאלה אחרת.',
        hint: 'הקטע מתחיל ב"נניח" ומסתיים במסקנה של הטענה.',
        lines: [
          {
            n: 1,
            text: 'יהי $n$ טבעי, ונניח ש-$n^2$ זוגי.',
            just: 'hypothesis',
            uses: [],
            why: 'זו ההנחה של הטענה.',
          },
          {
            n: 2,
            text: 'לכן קיים שלם $k$ כך ש-$n^2=2k$.',
            just: 'definition',
            uses: [1],
            why: 'ההגדרה של "זוגי", על המספר $n^2$.',
          },
          {
            n: 3,
            text: '$n=\\sqrt{n^2}$.',
            just: 'known',
            uses: [1],
            why: '$n$ טבעי, ולכן חיובי, ולמספר $t\\ge 0$ מתקיים $\\sqrt{t^2}=t$: עובדה ידועה מהרשימה שבשיעור.',
            wrong: { algebra: 'הוצאת שורש אינה אחד מכללי החשבון של השיעור. השוויון $\\sqrt{t^2}=t$ ל-$t\\ge 0$ נמצא ברשימת העובדות הידועות.' },
          },
          {
            n: 4,
            text: 'לכן $n=\\sqrt{2k}$.',
            just: 'algebra',
            uses: [2, 3],
            why: 'מציבים $n^2=2k$ משורה (2) בשורה (3): חשבון (הצבה של שווה במקום שווה).',
          },
          {
            n: 5,
            text: 'המספר $\\sqrt{2k}$ הוא $2$ כפול מספר שלם.',
            just: 'none',
            uses: [4],
            why: 'זה הפער. השורה טוענת את מה שצריך להוכיח, בניסוח אחר, ושום הגדרה, הנחה, חשבון או עובדה ידועה לא נותנים אותה. הטענה עצמה נכונה, ונוכיח אותה בשיעור 0.4 בדרך אחרת. אבל ההוכחה הזו לא מוכיחה אותה.',
            wrong: {
              algebra: 'איזה חשבון מוציא מ-$\\sqrt{2k}$ גורם 2? אין כזה: השורש של זוגי אינו אפילו בהכרח שלם ($\\sqrt{2}$, $\\sqrt{6}$).',
              known: 'ברשימת העובדות הידועות אין "השורש של זוגי הוא זוגי", וזה לא מקרה: זו הטענה שאנחנו מוכיחים, בניסוח אחר, ואותה אסור להניח.',
              definition: 'ההגדרה של "זוגי" אומרת מה צריך להראות, לא שזה נכון. מי הראה ש-$\\sqrt{2k}$ הוא 2 כפול שלם?',
            },
          },
          {
            n: 6,
            text: 'לכן $n$ זוגי.',
            just: 'definition',
            uses: [4, 5],
            why: 'אם מקבלים את שורה (5), אז לפי שורה (4) $n$ הוא 2 כפול שלם, וזו ההגדרה של "זוגי". המעבר עצמו תקין; הבעיה בשורה (5).',
          },
        ],
      },
    ],
  },

  backwards: {
    id: 'backwards',
    name: 'הוכחה מהסוף',
    blocks: [
      {
        id: 'claim',
        role: 'claim',
        text: 'לכל שני מספרים ממשיים $a$ ו-$b$ מתקיים $a^2+b^2\\ge 2ab$.',
        why: 'אי-שוויון שנאמר על כל שני ממשיים: טענה.',
        hint: 'האם הקטע אומר שמשהו נכון? על כמה מקרים?',
      },
      {
        id: 'example',
        role: 'example',
        text: 'למשל, עבור $a=3$ ו-$b=5$: $9+25=34$ ו-$2\\cdot 15=30$, ו-$34\\ge 30$.',
        why: 'מקרה אחד, אחרי "למשל": דוגמה.',
        hint: 'כמה מקרים הקטע בודק?',
      },
      {
        id: 'proof',
        role: 'proof',
        why: 'שורות ממוספרות שאמורות להוביל לטענה: הוכחה. האם היא תקינה? זו שאלה אחרת.',
        hint: 'הקטע הוא שרשרת של שורות ממוספרות.',
        lines: [
          {
            n: 1,
            text: '$a^2+b^2\\ge 2ab$.',
            just: 'none',
            uses: [],
            why: 'זה הפער: השורה הראשונה היא הטענה עצמה, שעוד לא הוכחה. כל מה שאחריה מראה רק שהטענה **גוררת** משהו נכון, וגם טענה שקרית יכולה לגרור משהו נכון.',
            wrong: {
              hypothesis: 'לטענה הזו אין הנחה מלבד "$a$ ו-$b$ ממשיים". אי-השוויון הוא המסקנה, מה שצריך להוכיח, ואסור להניח אותו.',
              known: 'האם אי-השוויון הזה כבר הוכח? זו בדיוק הטענה שההוכחה אמורה להוכיח.',
            },
          },
          {
            n: 2,
            text: 'לכן $a^2-2ab+b^2\\ge 0$.',
            just: 'algebra',
            uses: [1],
            why: 'מחסירים $2ab$ משני האגפים של שורה (1): חשבון. המעבר עצמו תקין.',
          },
          {
            n: 3,
            text: 'לכן $(a-b)^2\\ge 0$.',
            just: 'algebra',
            uses: [2],
            why: 'נוסחת הכפל המקוצר: $a^2-2ab+b^2=(a-b)^2$. חשבון.',
          },
          {
            n: 4,
            text: 'וזה נכון, כי ריבוע אינו שלילי.',
            just: 'known',
            uses: [3],
            why: 'עובדה ידועה. אבל היא מאשרת את השורה האחרונה, לא את הראשונה: ההוכחה הלכה בכיוון ההפוך.',
          },
        ],
      },
    ],
  },
};

export type PresetId = keyof typeof PRESETS;

/* ------------------------------------------------------------------ grading */

export interface Answers {
  /** block id → the role the learner picked */
  roles: Record<string, Role | undefined>;
  /** line number → the justification the learner picked */
  justs: Record<number, Justification | undefined>;
}

export const emptyAnswers = (): Answers => ({ roles: {}, justs: {} });

export const roleRight = (p: ProofPreset, blockId: string, r: Role | undefined): boolean =>
  r !== undefined && p.blocks.find((b) => b.id === blockId)?.role === r;

export const justRight = (p: ProofPreset, n: number, j: Justification | undefined): boolean =>
  j !== undefined && linesOf(p).find((l) => l.n === n)?.just === j;

/** How many blocks have the right role, out of how many. */
export function roleScore(p: ProofPreset, a: Answers): { right: number; total: number } {
  return { right: p.blocks.filter((b) => roleRight(p, b.id, a.roles[b.id])).length, total: p.blocks.length };
}

/** How many proof lines have the right justification, out of how many. */
export function justScore(p: ProofPreset, a: Answers): { right: number; total: number } {
  const lines = linesOf(p);
  return { right: lines.filter((l) => justRight(p, l.n, a.justs[l.n])).length, total: lines.length };
}

/** Every block labelled with its role. */
export const allLabelled = (p: ProofPreset, a: Answers): boolean => {
  const s = roleScore(p, a);
  return s.right === s.total;
};

/** A proof with no gap, every line justified correctly. */
export const allJustified = (p: ProofPreset, a: Answers): boolean => {
  const s = justScore(p, a);
  return !hasGap(p) && s.right === s.total;
};

/**
 * The gap is found: every gap line is marked "none" and no other line is. Marking every line "none" finds
 * nothing, so it does not count.
 */
export const gapFound = (p: ProofPreset, a: Answers): boolean => {
  const gaps = gapLines(p);
  if (gaps.length === 0) return false;
  return linesOf(p).every((l) => (a.justs[l.n] === 'none') === gaps.includes(l.n));
};

/** The feedback for a pick: the line's own reason when right, its specific hint or the generic one when wrong. */
export function lineFeedback(line: ProofLine, j: Justification): { ok: boolean; text: string } {
  if (j === line.just) {
    const from = line.uses.length ? ` (משתמשת ב${line.uses.map((u) => `-(${u})`).join(' וב')})` : '';
    return { ok: true, text: `${line.why}${line.just === 'none' ? '' : from}` };
  }
  if (j === 'none') return { ok: false, text: line.wrong?.none ?? 'יש לשורה הזו הצדקה. חפשו אותה בשורות הקודמות, בהגדרה, בהנחה, בחשבון או בעובדה ידועה.' };
  return { ok: false, text: line.wrong?.[j] ?? GENERIC_LINE_HINT };
}

export function blockFeedback(block: TextBlock, r: Role): { ok: boolean; text: string } {
  return r === block.role ? { ok: true, text: block.why } : { ok: false, text: block.hint || GENERIC_ROLE_HINT };
}

/** Structural problems of a preset (an empty list means it is sound). The tests run it on every preset. */
export function presetProblems(p: ProofPreset): string[] {
  const out: string[] = [];
  const ids = p.blocks.map((b) => b.id);
  if (new Set(ids).size !== ids.length) out.push(`${p.id}: duplicate block id`);
  const proofs = p.blocks.filter((b) => b.role === 'proof');
  if (proofs.length !== 1) out.push(`${p.id}: needs exactly one proof block`);
  for (const b of p.blocks) {
    if (b.role === 'proof' && !(b.lines && b.lines.length)) out.push(`${p.id}/${b.id}: a proof block needs lines`);
    if (b.role !== 'proof' && !b.text) out.push(`${p.id}/${b.id}: a text block needs text`);
  }
  linesOf(p).forEach((l, i) => {
    if (l.n !== i + 1) out.push(`${p.id}: line ${l.n} is numbered out of order`);
    for (const u of l.uses) if (u >= l.n || u < 1) out.push(`${p.id}: line ${l.n} uses line ${u}, which is not earlier`);
    if (l.wrong && l.just in l.wrong) out.push(`${p.id}: line ${l.n} has a "wrong" hint for its own answer`);
  });
  return out;
}

/** Every student-facing string of a preset, for the TeX and control-character checks. */
export function presetStrings(p: ProofPreset): string[] {
  return [
    p.name,
    ...p.blocks.flatMap((b) => [
      b.text ?? '',
      b.why,
      b.hint,
      ...(b.lines ?? []).flatMap((l) => [l.text, l.why, ...Object.values(l.wrong ?? {})]),
    ]),
  ].filter((s): s is string => typeof s === 'string' && s.length > 0);
}
