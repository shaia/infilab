import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

/**
 * Lesson 2.5 (limits and inequalities): SequenceStrip in mode `sandwich` (header of src/sims/SequenceStrip.tsx).
 * Controls in sandwich mode: preset chips, then [ε] [N] [L, only for 'outer-differ'], and the toggle; the ε slider
 * runs over the ladder 0.5, 0.3, 0.2, 0.1, 0.05, … (position 2 is 0.2, position 4 is 0.05). The verdict reads
 * "ה-N הזה מתאים / אינו מתאים לסדרה התחתונה ו(אינו) מתאים לעליונה".
 */

const LESSON = '/lessons/2-5/';
const FIG = 'fig-2-5a';

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

const task = async (page: Page, id: string) => (await progress(page))?.tasks?.[`${FIG}:${id}`];

test.describe('lesson 2.5: limits and inequalities', () => {
  test('the figure draws, in LTR math space', async ({ page }) => {
    await page.goto(LESSON);
    const canvases = page.locator('.sim-stage canvas');
    await expect(canvases).toHaveCount(1);
    const c = canvases.first();
    await c.scrollIntoViewIfNeeded();
    await expect(c).toHaveCSS('direction', 'ltr');
    await expect.poll(() => inked(c)).toBeGreaterThan(200);
  });

  test('⌊n√2⌋/n at ε = 0.05: N = 19 misses the lower sequence √2 − 1/n, N = 20 fits both and ticks squeeze', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    const [eps, N] = [fig.locator('input[type=range]').nth(0), fig.locator('input[type=range]').nth(1)];
    await slide(eps, 4);
    await expect(fig.locator('[data-readout="eps"]')).toContainText('0.05');
    // |(√2 − 1/n) − √2| = 1/n < 0.05 exactly for n > 20: term 20 sits on the edge, so the smallest N is 20
    await slide(N, 19);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('אינו מתאים לסדרה התחתונה');
    expect(await task(page, 'squeeze')).toBeFalsy();
    await slide(N, 20);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('מתאים לסדרה התחתונה ומתאים לעליונה');
    await expect.poll(() => task(page, 'squeeze')).toBeTruthy();
  });

  test('outer limits differ: with (−1)ⁿ between −1 and 1, no N ≥ 30 fits the middle, and trying ticks outer-differ', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: 'גבולות חיצוניים שונים' }).click();
    const [eps, N] = [fig.locator('input[type=range]').nth(0), fig.locator('input[type=range]').nth(1)];
    await slide(eps, 2);
    await expect(fig.locator('[data-readout="eps"]')).toContainText('0.2');
    for (const v of [30, 60]) {
      await slide(N, v);
      // the middle term after N alternates between 1 and −1, 2 apart: no band of width 0.4 holds both
      await expect(fig.locator('[data-readout="verdict"]')).not.toContainText('מתאים לסדרה התחתונה ומתאים לעליונה');
    }
    await expect.poll(() => task(page, 'outer-differ')).toBeTruthy();
  });

  test('a text step never ticks a task, even one that sets the figure to a task state', async ({ page }) => {
    await page.goto(LESSON);
    // the steps set floor-x with ε = 0.05, N = 20 (the squeeze answer) and outer-differ with ε = 0.2, N = 30
    for (const step of await page.locator(`.step[data-fig="${FIG}"]`).all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    expect(await task(page, 'squeeze')).toBeFalsy();
    expect(await task(page, 'outer-differ')).toBeFalsy();
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-2.5-squeeze-hyp', 'Q-2.5-strict', 'Q-2.5-sin', 'Q-2.5-floor', 'Q-2.5-interval', 'Q-2.5-conditions']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-2-5-"]');
    await expect(examples).toHaveCount(6);
    const sol = examples.first().locator('details').first();
    await expect(sol).not.toHaveAttribute('open', '');
  });
});
