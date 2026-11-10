import { expect, test, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/0-7/';
const FIG = 'fig-0-7a';

/** Bring the figure into view, wait for its island, stop text steps from driving it, and reset it. */
async function ready(page: Page) {
  const f = page.locator(`#${FIG}`);
  await f.scrollIntoViewIfNeeded();
  await hydrated(f.locator('canvas'));
  await freezeSteps(page);
  await f.getByRole('button', { name: 'איפוס' }).click();
  return f;
}

/** Drive the figure from the keyboard: arrows move between the elements of U (in order), Enter marks. */
async function keys(page: Page, seq: string[]) {
  await page.locator(`#${FIG} canvas`).focus();
  for (const k of seq) await page.keyboard.press(k);
}

test.describe('lesson 0.7: sets', () => {
  test('the figure draws, in LTR math space', async ({ page }) => {
    await page.goto(LESSON);
    const c = page.locator('.sim-stage canvas');
    await expect(c).toHaveCount(1);
    await c.scrollIntoViewIfNeeded();
    await expect(c).toHaveCSS('direction', 'ltr');
    await expect.poll(() => inked(c)).toBeGreaterThan(200);
  });

  test('marking A∖(B∪C) from the keyboard: wrong, then exactly {1, 2}, which ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    const verdict = fig.locator('[data-readout="verdict"]');
    await expect(fig.locator('[data-readout="target"]')).toContainText('A∖(B∪C)');
    // mark 1, then 3 (wrong): one missing, one extra
    await keys(page, ['Enter', 'ArrowRight', 'ArrowRight', 'Enter']);
    await expect(verdict).toContainText('עוד לא');
    // unmark 3, mark 2
    await keys(page, ['Enter', 'ArrowLeft', 'Enter']);
    await expect(fig.locator('[data-readout="marked"]')).toContainText('{1, 2}');
    await expect(verdict).toContainText('זו בדיוק הקבוצה');
    await expect.poll(async () => (await progress(page))?.tasks?.[`${FIG}:shade-difference`]).toBeTruthy();
  });

  test('(A∩B)ᶜ is everything but 3 and 4; marking it ticks the second task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: /\(A∩B\)ᶜ/ }).click();
    // U = {1, …, 8}: mark 1, 2, 5, 6, 7, 8
    await keys(page, ['Enter', 'ArrowRight', 'Enter', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'Enter', 'ArrowRight', 'Enter', 'ArrowRight', 'Enter', 'ArrowRight', 'Enter']);
    await expect(fig.locator('[data-readout="marked"]')).toContainText('{1, 2, 5, 6, 7, 8}');
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('זו בדיוק הקבוצה');
    await expect.poll(async () => (await progress(page))?.tasks?.[`${FIG}:shade-complement`]).toBeTruthy();
  });

  test('the witness hunt: 1 lies in both sides, 6 in one only, which ticks the third task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: /A∖\(B∖C\)/ }).click();
    const verdict = fig.locator('[data-readout="verdict"]');
    await keys(page, ['Enter']);
    await expect(verdict).toContainText('אינו מבדיל');
    await keys(page, ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'Enter']);
    await expect(fig.locator('[data-readout="marked"]')).toContainText('6');
    await expect(verdict).toContainText('דוגמה נגדית');
    await expect.poll(async () => (await progress(page))?.tasks?.[`${FIG}:find-witness`]).toBeTruthy();
  });

  test('a text step never ticks a task, even the steps that show a finished marking', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator(`.step[data-fig="${FIG}"]`).all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const t = (await progress(page))?.tasks ?? {};
    expect(t[`${FIG}:shade-difference`]).toBeFalsy();
    expect(t[`${FIG}:shade-complement`]).toBeFalsy();
    expect(t[`${FIG}:find-witness`]).toBeFalsy();
  });

  test('the Check has its five bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-0.7-operations', 'Q-0.7-element-subset', 'Q-0.7-complement', 'Q-0.7-nested-intersection', 'Q-0.7-power-membership']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-0-7-"]');
    await expect(examples).toHaveCount(6);
    await expect(examples.first().locator('details').first()).not.toHaveAttribute('open', '');
  });

  test('every misconception anchor of the lesson exists on the page', async ({ page }) => {
    await page.goto(LESSON);
    for (const a of ['set-operations', 'de-morgan', 'double-inclusion', 'power-set', 'product', 'nested-empty', 'power-set-ops']) {
      await expect(page.locator(`[id="${a}"]`)).toHaveCount(1);
    }
  });
});
