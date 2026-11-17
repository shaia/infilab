import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/2-1/';

/** Set a range input as a student would: the value, then an input event. */
const slide = (s: Locator, v: number) =>
  s.evaluate((el: HTMLInputElement, value) => {
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);

/** Bring a figure into view, wait for its island, stop text steps from driving it, and reset it. */
async function ready(page: Page, fig: string) {
  const f = page.locator(`#${fig}`);
  await f.scrollIntoViewIfNeeded();
  await hydrated(f.locator('canvas'));
  await freezeSteps(page);
  await f.getByRole('button', { name: 'איפוס' }).click();
  return f;
}

const task = async (page: Page, id: string) => (await progress(page))?.tasks?.[id];

test.describe('lesson 2.1: sequences, boundedness and monotonicity', () => {
  test('both figures draw, in LTR math space', async ({ page }) => {
    await page.goto(LESSON);
    const canvases = page.locator('.sim-stage canvas');
    await expect(canvases).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      const c = canvases.nth(i);
      await c.scrollIntoViewIfNeeded();
      await expect(c).toHaveCSS('direction', 'ltr');
      await expect.poll(() => inked(c)).toBeGreaterThan(200);
    }
  });

  test('n/(n+1): U = 0.99 bounds the drawn terms and ticks nothing; U = 1.005 is a bound below 1.01 and ticks', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-1a');
    await fig.getByRole('button', { name: 'n/(n+1)' }).click();
    await fig.getByRole('button', { name: 'חסם מלעיל', exact: true }).click();
    // sliders in order: the window, then U
    const U = fig.locator('input[type=range]').nth(1);
    await slide(U, 0.99);
    await expect(fig.locator('[data-readout="upper"]')).toContainText('אף איבר בחלון');
    expect(await task(page, 'fig-2-1a:tight-bound')).toBeFalsy();
    await slide(U, 1.005);
    await expect.poll(() => task(page, 'fig-2-1a:tight-bound')).toBeTruthy();
  });

  test('n² − 10n is monotone from n₀ = 5, not from 4, and finding 5 ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-1a');
    await fig.getByRole('button', { name: 'n² − 10n' }).click();
    await fig.getByRole('button', { name: 'סימני עלייה וירידה' }).click();
    // sliders in order: the window, then n₀ (no bound lines shown)
    const n0 = fig.locator('input[type=range]').nth(1);
    await slide(n0, 4);
    await expect(fig.locator('[data-readout="steps"]')).toContainText('לא מונוטונית');
    expect(await task(page, 'fig-2-1a:turn-point')).toBeFalsy();
    await slide(n0, 5);
    await expect(fig.locator('[data-readout="steps"]')).toContainText('עולה ממש');
    await expect.poll(() => task(page, 'fig-2-1a:turn-point')).toBeTruthy();
  });

  test('⌊10/n⌋ has finitely many values but does not tick; (−1)ⁿ⁺¹ does', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-1a');
    await fig.getByRole('button', { name: '⌊10/n⌋' }).click();
    await expect(fig.locator('[data-readout="values"]')).toContainText('6');
    expect(await task(page, 'fig-2-1a:finite-values')).toBeFalsy();
    await fig.getByRole('button', { name: '(−1)ⁿ⁺¹' }).click();
    await expect(fig.locator('[data-readout="values"]')).toContainText('2');
    await expect.poll(() => task(page, 'fig-2-1a:finite-values')).toBeTruthy();
  });

  test('a text step never ticks a task', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-2-1a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    for (const id of ['tight-bound', 'turn-point', 'finite-values']) expect(await task(page, `fig-2-1a:${id}`)).toBeFalsy();
  });

  test('n^((−1)ⁿ): a long enough window always has a term above U = 50, and finding it ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-1b');
    await fig.getByRole('button', { name: 'n^((−1)ⁿ)' }).click();
    await fig.getByRole('button', { name: 'חסם מלעיל', exact: true }).click();
    const [win, U] = [fig.locator('input[type=range]').nth(0), fig.locator('input[type=range]').nth(1)];
    await slide(win, 60);
    await slide(U, 50);
    await expect(fig.locator('[data-readout="upper"]')).toContainText('הראשון ב-n = 52');
    await expect.poll(() => task(page, 'fig-2-1b:beat-bound')).toBeTruthy();
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-2.1-function', 'Q-2.1-samepic', 'Q-2.1-bdd-def', 'Q-2.1-mono', 'Q-2.1-strict', 'Q-2.1-graph']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-2-1-"]');
    await expect(examples).toHaveCount(6);
    const sol = examples.first().locator('details').first();
    await expect(sol).not.toHaveAttribute('open', '');
  });
});
