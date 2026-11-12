import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/1-3/';
const FIG = 'fig-1-3a';

/** Set a range input as a student would: the value, then an input event. */
const slide = (s: Locator, v: number) =>
  s.evaluate((el: HTMLInputElement, value) => {
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);

/** Bring the figure into view, wait for its island, stop text steps from driving it, and reset it. */
async function ready(page: Page) {
  const f = page.locator(`#${FIG}`);
  await f.scrollIntoViewIfNeeded();
  await hydrated(f.locator('canvas'));
  await freezeSteps(page);
  await f.getByRole('button', { name: 'איפוס' }).click();
  return f;
}

const ticked = (page: Page, task: string) => expect.poll(async () => (await progress(page))?.tasks?.[`${FIG}:${task}`]).toBeTruthy();

test.describe('lesson 1.3: naturals, integers and rationals', () => {
  test('the figure draws in every view, in LTR math space', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    const c = fig.locator('canvas');
    await expect(c).toHaveCSS('direction', 'ltr');
    for (const view of ['קבוצה אינדוקטיבית?', 'שבר שריבועו n', 'ירידה במכנים']) {
      await fig.getByRole('button', { name: view }).click();
      await expect.poll(() => inked(c)).toBeGreaterThan(200);
    }
  });

  test('in [1, 5] the point x = 4.5 has x + 1 outside the set, and that ticks the witness task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await expect(fig.locator('[data-readout="set"]')).toContainText('[1, 5]');
    await expect(fig.locator('[data-readout="x"]')).toContainText('✓');
    await slide(fig.locator('input[type=range]').first(), 4.5);
    await expect(fig.locator('[data-readout="x"]')).toContainText('✗');
    await ticked(page, 'witness');
  });

  test('an inductive set never shows a witness: ℕ ∪ {n + ½} at x = 2.5', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: 'ℕ ∪ {n + ½ : n ∈ ℕ}' }).click();
    await slide(fig.locator('input[type=range]').first(), 2.5);
    await expect(fig.locator('[data-readout="x"]')).toContainText('✓');
    expect((await progress(page))?.tasks?.[`${FIG}:witness`]).toBeFalsy();
  });

  test('q = 12 gives 17² − 2·12² = 1 and ticks the pell task; no q reaches 0 for n = 2', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: 'שבר שריבועו n' }).click();
    const q = fig.locator('input[type=range]').first();
    await slide(q, 12);
    await expect(fig.locator('[data-readout="search"]')).toContainText('289 − 288 = 1');
    await ticked(page, 'pell');
    await slide(q, 60);
    await expect(fig.locator('[data-readout="search"]')).toContainText('✗');
  });

  test('n = 4 puts every point on the zero line', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: 'שבר שריבועו n' }).click();
    await fig.getByRole('button', { name: 'n = 4' }).click();
    await slide(fig.locator('input[type=range]').first(), 7);
    await expect(fig.locator('[data-readout="search"]')).toContainText('= 0');
  });

  test('577/408 descends to the integer 1 in seven steps, and that ticks the descend task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: 'ירידה במכנים' }).click();
    const step = fig.getByRole('button', { name: 'צעד ירידה' });
    for (let i = 0; i < 7; i++) await step.click();
    await expect(fig.locator('[data-readout="descent"]')).toContainText('577/408 → 239/169 → 99/70 → 41/29 → 17/12 → 7/5 → 3/2 → 1/1');
    await expect(step).toBeDisabled();
    await ticked(page, 'descend');
  });

  test('a text step never ticks a task', async ({ page }) => {
    await page.goto(LESSON);
    for (const s of await page.locator(`.step[data-fig="${FIG}"]`).all()) {
      await s.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    for (const t of ['witness', 'pell', 'descend']) expect(tasks[`${FIG}:${t}`]).toBeFalsy();
  });

  test('the Check has its five bank questions, six worked examples, and the anchors the register links to exist', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-1.3-smallest-inductive', 'Q-1.3-induction-theorem', 'Q-1.3-which-irrational', 'Q-1.3-sqrt4-fails', 'Q-1.3-closure']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    await expect(page.locator('[id^="ex-1-3-"]')).toHaveCount(6);
    for (const id of ['naturals', 'induction', 'integers', 'well-ordering', 'division', 'finite-max', 'chapter-0', 'rationals', 'least-denominator', 'sqrt2', 'hook-answer', 'generalise', 'closure']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });
});
