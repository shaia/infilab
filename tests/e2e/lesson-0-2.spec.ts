import { expect, test, type Page } from '@playwright/test';
import { freezeSteps, hydrated, progress } from './helpers';

const LESSON = '/lessons/0-2/';

/** Bring a figure into view, wait for its island, stop text steps from driving it, and reset it. */
async function ready(page: Page, fig: string) {
  const f = page.locator(`#${fig}`);
  await f.scrollIntoViewIfNeeded();
  await hydrated(f.locator('table.tt-table'));
  await freezeSteps(page);
  await f.getByRole('button', { name: 'איפוס' }).click();
  return f;
}

const task = (page: Page, id: string) => progress(page).then((p) => p?.tasks?.[id]);

test.describe('lesson 0.2: statements, connectives and implication', () => {
  test('both truth tables render four rows, in LTR math space', async ({ page }) => {
    await page.goto(LESSON);
    const tables = page.locator('table.tt-table');
    await expect(tables).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      const t = tables.nth(i);
      await t.scrollIntoViewIfNeeded();
      await expect(t).toHaveCSS('direction', 'ltr');
      await expect(t.locator('tbody tr')).toHaveCount(4);
    }
  });

  test('filling P ⇒ Q as T, F, T, T checks four ✓ and ticks the task; a wrong cell gets ✗', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-2a');
    const cells = fig.locator('button.guess');
    await expect(cells).toHaveCount(4);
    // one click → T, two clicks → F; the wrong guess first: row 2 as T
    await cells.nth(1).click();
    await fig.getByRole('button', { name: 'בדקו' }).click();
    await expect(fig.locator('td.fillcell.bad .mark')).toHaveText('✗');
    expect(await task(page, 'fig-0-2a:fill-implication')).toBeFalsy();
    await cells.nth(0).click();
    await cells.nth(1).click(); // T → F
    await cells.nth(2).click();
    await cells.nth(3).click();
    await fig.getByRole('button', { name: 'בדקו' }).click();
    await expect(fig.locator('td.fillcell.ok .mark')).toHaveCount(4);
    await expect.poll(() => task(page, 'fig-0-2a:fill-implication')).toBeTruthy();
  });

  test('marking row 2 (P true, Q false) ticks only-false-row and tells the story of the broken promise', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-2a');
    await fig.locator('button.pick').nth(2).click();
    expect(await task(page, 'fig-0-2a:only-false-row')).toBeFalsy();
    await fig.locator('button.pick').nth(1).click();
    await expect(fig.locator('[data-readout="row"]')).toContainText('הופרה');
    await expect.poll(() => task(page, 'fig-0-2a:only-false-row')).toBeTruthy();
  });

  test('¬(P ⇒ Q) differs from P ⇒ ¬Q and is equivalent to P ∧ ¬Q', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-2a');
    await fig.getByRole('button', { name: 'מלאו בעצמכם' }).click();
    for (const name of ['¬(P ⇒ Q)', 'P ⇒ ¬Q', 'P ∧ ¬Q']) await fig.getByRole('button', { name, exact: true }).click();
    const [a, b] = [fig.locator('.tt-compare select').nth(0), fig.locator('.tt-compare select').nth(1)];
    await a.selectOption('negImpl');
    await b.selectOption('implNotQ');
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('נבדלות בשורות 3 ו-4');
    await b.selectOption('pAndNotQ');
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('שקולות');
    await expect.poll(() => task(page, 'fig-0-2a:neg-implication')).toBeTruthy();
  });

  test('the contrapositive is equivalent, the converse differs in rows 2 and 3, and marking such a row ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-2b');
    const [a, b] = [fig.locator('.tt-compare select').nth(0), fig.locator('.tt-compare select').nth(1)];
    await a.selectOption('impl');
    await b.selectOption('contra');
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('שקולות');
    await expect.poll(() => task(page, 'fig-0-2b:contrapositive')).toBeTruthy();
    await b.selectOption('conv');
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('נבדלות בשורות 2 ו-3');
    await expect(fig.locator('td.cmpcell.ne')).toHaveCount(2);
    await fig.locator('button.pick').nth(2).click();
    await expect(fig.locator('[data-readout="row"]')).toContainText('n = 6');
    await expect.poll(() => task(page, 'fig-0-2b:converse-differs')).toBeTruthy();
  });

  test('a text step never ticks a task, even one that sets the comparison to the converse', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig^="fig-0-2"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const p = await progress(page);
    for (const id of ['fig-0-2a:fill-implication', 'fig-0-2a:only-false-row', 'fig-0-2a:neg-implication', 'fig-0-2b:contrapositive', 'fig-0-2b:converse-differs', 'fig-0-2b:iff-both']) {
      expect(p?.tasks?.[id], id).toBeFalsy();
    }
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-0.2-table-row', 'Q-0.2-false-premise', 'Q-0.2-or', 'Q-0.2-contrapositive', 'Q-0.2-converse-fails', 'Q-0.2-necessary-symbols']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-0-2-"]');
    await expect(examples).toHaveCount(6);
    await expect(examples.first().locator('details').first()).not.toHaveAttribute('open', '');
  });
});
