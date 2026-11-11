import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/2-2/';

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

test.describe('lesson 2.2: the definition of the limit', () => {
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

  test('for 1/n and ε = 0.1 the smallest N is 10, N = 9 leaves term 10 outside, and finding it ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-2a');
    const [eps, N] = [fig.locator('input[type=range]').nth(0), fig.locator('input[type=range]').nth(1)];
    await expect(fig.locator('[data-readout="eps"]')).toContainText('0.1');
    await slide(N, 9);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('n = 10');
    await slide(N, 10);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('מתאים');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-2a:find-N']).toBeTruthy();
    // a narrower band needs a larger N: at ε = 0.02, N = 10 no longer works
    // the slider runs wide → narrow over EPSILONS = [0.5, 0.3, 0.2, 0.1, 0.05, 0.03, 0.02, …]: position 6 is 0.02
    await slide(eps, 6);
    await expect(fig.locator('[data-readout="eps"]')).toContainText('0.02');
    await expect(fig.locator('[data-readout="verdict"]')).not.toContainText('מתאים');
  });

  test('a text step never ticks a task, even one that sets the figure to the answer', async ({ page }) => {
    await page.goto(LESSON);
    // the second step of 2.2א sets N = 10 on 1/n with ε = 0.1: exactly the find-N answer
    for (const step of await page.locator('#fig-2-2a ~ * .step, .step[data-fig="fig-2-2a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    expect((await progress(page))?.tasks?.['fig-2-2a:find-N']).toBeFalsy();
  });

  test('for (−1)ⁿ and L = 1 no N works, however far it moves, and trying ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-2b');
    await fig.getByRole('button', { name: '(−1)ⁿ' }).click();
    const N = fig.locator('input[type=range]').nth(1);
    for (const v of [5, 20, 40]) {
      await slide(N, v);
      await expect(fig.locator('[data-readout="verdict"]')).toContainText('מחוץ לסביבה');
    }
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-2b:no-N']).toBeTruthy();
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-2.2-order', 'Q-2.2-neg', 'Q-2.2-N1', 'Q-2.2-band', 'Q-2.2-N2', 'Q-2.2-escape']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-2-2-"]');
    await expect(examples).toHaveCount(6);
    const sol = examples.first().locator('details').first();
    await expect(sol).not.toHaveAttribute('open', '');
  });
});
