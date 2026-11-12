import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/1-1/';

/** Set a range input as a student would: the value, then an input event. */
const slide = (s: Locator, v: number) =>
  s.evaluate((el: HTMLInputElement, value) => {
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);

/** Bring the figure into view, wait for its island, stop text steps from driving it, and reset it. */
async function ready(page: Page) {
  const f = page.locator('#fig-1-1a');
  await f.scrollIntoViewIfNeeded();
  await hydrated(f.locator('canvas'));
  await freezeSteps(page);
  await f.getByRole('button', { name: 'איפוס' }).click();
  return f;
}

/** Move the selected cell with the arrow keys: the first key selects (1, 1), then each key moves one cell. */
async function keys(canvas: Locator, ...ks: string[]) {
  await canvas.focus();
  for (const k of ks) await canvas.press(k);
}

test.describe('lesson 1.1: the field axioms', () => {
  test('the figure draws, in LTR math space, and starts on the multiplication table of ℤ₇', async ({ page }) => {
    await page.goto(LESSON);
    const canvas = page.locator('.sim-stage canvas');
    await expect(canvas).toHaveCount(1);
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveCSS('direction', 'ltr');
    await expect.poll(() => inked(canvas)).toBeGreaterThan(200);
    const fig = await ready(page);
    await expect(fig.locator('[data-readout="field"]')).toContainText('ℤ₇ שדה');
  });

  test('picking 3 ⊙ 5 in ℤ₇ shows the inverse of 3 and ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    const canvas = fig.locator('canvas');
    await keys(canvas, 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight');
    await expect(fig.locator('[data-readout="cell"]')).toContainText('3 ⊙ 5 = 1 ב-ℤ₇');
    await expect(fig.locator('[data-readout="cell"]')).toContainText('ההופכי של 3');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-1a:inverse-3']).toBeTruthy();
  });

  test('in ℤ₆, 2 ⊙ 3 = 0: zero divisors, 2 has no inverse, and both tasks tick', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await slide(fig.locator('input[type=range]').nth(0), 6);
    await expect(fig.locator('[data-readout="field"]')).toContainText('ℤ₆ אינו שדה');
    await expect(fig.locator('[data-readout="field"]')).toContainText('2, 3, 4');
    await keys(fig.locator('canvas'), 'ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowRight');
    await expect(fig.locator('[data-readout="cell"]')).toContainText('2 ⊙ 3 = 0 ב-ℤ₆');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-1a:zero-product']).toBeTruthy();
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-1a:no-inverse']).toBeTruthy();
  });

  test('the addition table: every row has a 0, the negative', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: /חיבור/ }).click();
    await expect(fig.locator('[data-readout="field"]')).toContainText('בכל שורה של טבלת החיבור יש 0');
    await keys(fig.locator('canvas'), 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowRight');
    await expect(fig.locator('[data-readout="cell"]')).toContainText('3 ⊕ 4 = 0 ב-ℤ₇');
    await expect(fig.locator('[data-readout="cell"]')).toContainText('הנגדי של 3');
  });

  test('a text step never ticks a task', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-1-1a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    for (const t of ['inverse-3', 'no-inverse', 'zero-product']) expect(tasks[`fig-1-1a:${t}`]).toBeFalsy();
  });

  test('the Check has the five bank questions, six worked examples, and the anchors the register links to exist', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-1.1-which-axiom', 'Q-1.1-inverse-z7', 'Q-1.1-zero-no-inverse', 'Q-1.1-times-zero', 'Q-1.1-zn-fields']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    await expect(page.locator('[id^="ex-1-1-"]')).toHaveCount(6);
    for (const id of ['field-def', 'axiom-roles', 'consequences', 'inverses', 'times-zero', 'signs', 'no-zero-divisors', 'zn-field', 'non-fields']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });
});
