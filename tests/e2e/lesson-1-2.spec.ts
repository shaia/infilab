import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/1-2/';
const FIG = 'fig-1-2a';

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

test.describe('lesson 1.2: the order axioms', () => {
  test('the figure draws, in LTR math space, and starts with x ↦ x + c keeping the order', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    const c = fig.locator('canvas');
    await expect(c).toHaveCSS('direction', 'ltr');
    await expect.poll(() => inked(c)).toBeGreaterThan(200);
    await expect(fig.locator('[data-readout="pair"]')).toContainText('a + c = 2, b + c = 5');
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('הסדר נשמר');
  });

  test('multiplying by a negative c reverses the order, and that ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: 'x ↦ cx' }).click();
    // sliders: a, b, c
    const c = fig.locator('input[type=range]').nth(2);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('הסדר נשמר');
    await slide(c, -1);
    await expect(fig.locator('[data-readout="pair"]')).toContainText('ca = 1, cb = −2');
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('הסדר מתהפך');
    await expect.poll(async () => (await progress(page))?.tasks?.[`${FIG}:reverse-c`]).toBeTruthy();
    await slide(c, 0);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('התמונות שוות');
  });

  test('1/x keeps the order across 0 (−2 < 2 and −1/2 < 1/2), and that ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: 'x ↦ 1/x' }).click();
    const a = fig.locator('input[type=range]').nth(0);
    await slide(a, 1);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('הסדר מתהפך');
    await slide(a, -2);
    await expect(fig.locator('[data-readout="pair"]')).toContainText('1/a = −0.5, 1/b = 0.5');
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('הסדר נשמר');
    await expect.poll(async () => (await progress(page))?.tasks?.[`${FIG}:recip-keep`]).toBeTruthy();
    await slide(a, 0);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('אין הופכי');
  });

  test('x² reverses −4 < 1, and that ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: 'x ↦ x²' }).click();
    const [a, b] = [fig.locator('input[type=range]').nth(0), fig.locator('input[type=range]').nth(1)];
    await slide(b, 1);
    await slide(a, -4);
    await expect(fig.locator('[data-readout="pair"]')).toContainText('a² = 16, b² = 1');
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('הסדר מתהפך');
    await expect.poll(async () => (await progress(page))?.tasks?.[`${FIG}:square-flip`]).toBeTruthy();
  });

  test('a text step never ticks a task', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator(`.step[data-fig="${FIG}"]`).all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    for (const t of ['reverse-c', 'recip-keep', 'square-flip']) expect(tasks[`${FIG}:${t}`]).toBeFalsy();
  });

  test('the Check has the five bank questions, six worked examples, and the anchors the registers link to exist', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-1.2-one-positive', 'Q-1.2-multiply-negative', 'Q-1.2-combine', 'Q-1.2-reciprocal', 'Q-1.2-abs-sum']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    await expect(page.locator('[id^="ex-1-2-"]')).toHaveCount(6);
    for (const id of ['ordered-field', 'add-inequalities', 'sign-rules', 'squares', 'midpoint', 'reciprocal', 'multiply-inequalities', 'no-order', 'char-positive', 'abs-order', 'triangle', 'reverse', 'ch0-on-axioms']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });
});
