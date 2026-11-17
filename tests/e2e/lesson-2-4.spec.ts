import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

/**
 * Lesson 2.4 (arithmetic of limits): SequenceStrip in mode `combine` (spine, "SequenceStrip contract").
 *
 * Written before the figure's `combine` mode landed, from the contract alone. The selectors below assume, as in
 * lesson 2.2's figure: the ε slider is the first range input and runs over EPSILONS = [0.5, 0.3, 0.2, 0.1, 0.05, …]
 * (position 4 is 0.05), the N slider is the second, the reset button is "איפוס", the readouts carry
 * data-readout="eps" / "verdict", and a fitting N reads "מתאים". The op picker and the pair buttons are looked up
 * by their visible names (מכפלה; the pair-cancel button by a name containing "(−1)ⁿ"): adjust them to the
 * figure's header once it lands.
 */

const LESSON = '/lessons/2-4/';
const FIG = 'fig-2-4a';

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

test.describe('lesson 2.4: arithmetic of limits', () => {
  test('the figure draws, in LTR math space', async ({ page }) => {
    await page.goto(LESSON);
    const c = page.locator(`#${FIG} canvas`).first();
    await c.scrollIntoViewIfNeeded();
    await expect(c).toHaveCSS('direction', 'ltr');
    await expect.poll(() => inked(c)).toBeGreaterThan(200);
  });

  test('sum of 1 + 1/n and 2 − 1/√n at ε = 0.05: N = 357 leaves a term outside, N = 358 fits and ticks sum-N', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    const [eps, N] = [fig.locator('input[type=range]').nth(0), fig.locator('input[type=range]').nth(1)];
    await slide(eps, 4);
    await expect(fig.locator('[data-readout="eps"]')).toContainText('0.05');
    // |cₙ − 3| = 1/√n − 1/n < 0.05 exactly for n ≥ 359 (recomputed with smallestN): the smallest N is 358
    await slide(N, 357);
    await expect(fig.locator('[data-readout="verdict"]')).not.toContainText('מתאים');
    await slide(N, 358);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('מתאים');
    await expect.poll(() => task(page, 'sum-N')).toBeTruthy();
  });

  test('product at ε = 0.05: N = 317 fits and ticks product-N', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: 'מכפלה' }).click();
    const [eps, N] = [fig.locator('input[type=range]').nth(0), fig.locator('input[type=range]').nth(1)];
    await slide(eps, 4);
    // |aₙbₙ − 2| < 0.05 for every n > 317 and not at n = 317 (smallestN)
    await slide(N, 317);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('מתאים');
    await expect.poll(() => task(page, 'product-N')).toBeTruthy();
  });

  test('pair-cancel: (−1)ⁿ and 1 − (−1)ⁿ diverge, their sum is 1, and finding a fitting N ticks cancel', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: /\(−1\)ⁿ/ }).first().click();
    const [eps, N] = [fig.locator('input[type=range]').nth(0), fig.locator('input[type=range]').nth(1)];
    await slide(eps, 3); // 0.1
    await slide(N, 5);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('מתאים');
    await expect.poll(() => task(page, 'cancel')).toBeTruthy();
  });

  test('a text step never ticks a task, even one that sets the figure to a fitting N', async ({ page }) => {
    await page.goto(LESSON);
    // the second step sets N = 400 on the sum at ε = 0.1, which fits; the last Explore step sets pair-cancel
    for (const step of await page.locator('#fig-2-4a ~ * .step, .step[data-fig="fig-2-4a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    for (const id of ['sum-N', 'product-N', 'cancel']) expect(await task(page, id)).toBeFalsy();
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-2.4-sum-N', 'Q-2.4-quotient-hyp', 'Q-2.4-rational1', 'Q-2.4-conj', 'Q-2.4-sum-converse', 'Q-2.4-zero-over-zero']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-2-4-"]');
    await expect(examples).toHaveCount(6);
    await expect(examples.first().locator('details').first()).not.toHaveAttribute('open', '');
  });
});
