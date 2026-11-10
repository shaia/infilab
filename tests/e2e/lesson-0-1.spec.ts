import { expect, test, type Page } from '@playwright/test';
import { freezeSteps, hydrated, progress } from './helpers';

const LESSON = '/lessons/0-1/';

/** Bring a figure into view, wait for its island, stop text steps from driving it, and reset it. */
async function ready(page: Page, fig: string) {
  const f = page.locator(`#${fig}`);
  await f.scrollIntoViewIfNeeded();
  await hydrated(f.locator('.proofreader'));
  await freezeSteps(page);
  await f.getByRole('button', { name: 'איפוס' }).click();
  return f;
}

/** The key of src/math/proofs.ts, restated: the spec checks the figure against it. */
const EVEN_SUM_ROLES: Record<string, string> = { def: 'הגדרה', claim: 'טענה', example: 'דוגמה', proof: 'הוכחה' };
const EVEN_SUM_JUSTS: Record<number, string> = { 1: 'hypothesis', 2: 'definition', 3: 'algebra', 4: 'known', 5: 'definition' };

test.describe('lesson 0.1: how to read a proof', () => {
  test('both figures render the text, with math typeset and no sideways scroll at the figure', async ({ page }) => {
    await page.goto(LESSON);
    const readers = page.locator('.proofreader');
    await expect(readers).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      const r = readers.nth(i);
      await r.scrollIntoViewIfNeeded();
      await expect(r.locator('.pr-block').first()).toBeVisible();
      await expect(r.locator('.katex').first()).toBeVisible();
      const overflow = await r.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });

  test('labelling every block ticks label-blocks; a wrong label is marked with a hollow ✗', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-1a');
    const def = fig.locator('[data-block="def"]');
    await def.getByRole('button', { name: 'טענה', exact: true }).click();
    await expect(def.locator('.pr-mark.bad')).toHaveText('✗');
    await expect(fig.locator('[data-readout="feedback"]')).toContainText('נקרא');
    for (const [block, role] of Object.entries(EVEN_SUM_ROLES)) {
      await fig.locator(`[data-block="${block}"]`).getByRole('button', { name: role, exact: true }).click();
    }
    await expect(fig.locator('[data-readout="roles"]')).toContainText('4 מתוך 4');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-1a:label-blocks']).toBeTruthy();
  });

  test('justifying every line of the gap-free proof ticks justify-all', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-1a');
    for (const [n, j] of Object.entries(EVEN_SUM_JUSTS)) {
      await fig.locator(`[data-line="${n}"] select`).selectOption(j);
    }
    await expect(fig.locator('[data-readout="justs"]')).toContainText('5 מתוך 5');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-1a:justify-all']).toBeTruthy();
  });

  test('marking every line as a gap finds nothing; marking only line 5 finds the gap', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-1b');
    for (const n of [1, 2, 3, 4, 5, 6]) await fig.locator(`[data-line="${n}"] select`).selectOption('none');
    await page.waitForTimeout(200);
    expect((await progress(page))?.tasks?.['fig-0-1b:find-gap']).toBeFalsy();
    for (const n of [1, 2, 3, 4, 6]) await fig.locator(`[data-line="${n}"] select`).selectOption('');
    await expect(fig.locator('[data-line="5"] .pr-mark.ok')).toHaveText('✓');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-1b:find-gap']).toBeTruthy();
  });

  test('a text step never ticks a task: steps switch the text and highlight, never answer', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig^="fig-0-1"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    for (const t of ['fig-0-1a:label-blocks', 'fig-0-1a:justify-all', 'fig-0-1b:find-gap']) expect(tasks[t]).toBeFalsy();
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-0.1-def-or-claim', 'Q-0.1-roles', 'Q-0.1-justify-line', 'Q-0.1-divide-by-zero', 'Q-0.1-study-order', 'Q-0.1-wrong-and-sure']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-0-1-"]');
    await expect(examples).toHaveCount(6);
    await expect(examples.first().locator('details').first()).not.toHaveAttribute('open', '');
  });
});
