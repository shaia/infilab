import { expect, test, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/2-9/';

/** Bring a figure into view, wait for its island, stop text steps from driving it, and reset it. */
async function ready(page: Page, fig: string) {
  const f = page.locator(`#${fig}`);
  await f.scrollIntoViewIfNeeded();
  await hydrated(f.locator('canvas'));
  await freezeSteps(page);
  await f.getByRole('button', { name: 'איפוס' }).click();
  return f;
}

test.describe('lesson 2.9: subsequences and Bolzano–Weierstrass', () => {
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

  test('(−1)ⁿ + 1/n: [−2, −1] is empty, [−1/2, 0] holds only a₁, and the way down to −1 picks n = 1, 3, 5, 7, 9, 17', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-9a');
    const lower = fig.locator('[data-action="lower"]');
    const upper = fig.locator('[data-action="upper"]');
    await lower.click(); // [−2, 0]
    await expect(fig.locator('[data-readout="lower"]')).toContainText('אין בו אף איבר');
    await upper.click(); // [−1, 0]
    await expect(fig.locator('[data-readout="upper"]')).toContainText('נראה סופי');
    await expect(fig.locator('[data-readout="upper"] [data-last]')).toHaveText('n = 1');
    // keeping the half that looks finite ticks the task, and the readout says the proof cannot go on
    await upper.click();
    await expect(fig.locator('[data-readout="stuck"]')).toBeVisible();
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-9a:finite-half']).toBeTruthy();
    await fig.locator('[data-action="undo"]').click();
    for (let i = 0; i < 4; i++) await lower.click();
    await expect(fig.locator('[data-readout="interval"]')).toContainText('0.0625');
    await expect(fig.locator('[data-readout="indices"]')).toContainText('1, 3, 5, 7, 9, 17');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-9a:toward-minus-one']).toBeTruthy();
  });

  test('the fractional part of n√2: five own choices toward 0.7 tick the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-9a');
    await fig.getByRole('button', { name: /n√2/ }).click();
    // [0.5, 1], [0.5, 0.75], [0.625, 0.75], [0.6875, 0.75], [0.6875, 0.71875]
    for (const a of ['upper', 'lower', 'upper', 'upper', 'lower']) await fig.locator(`[data-action="${a}"]`).click();
    await expect(fig.locator('[data-readout="interval"]')).toContainText('0.71875');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-9a:aim-dense']).toBeTruthy();
  });

  test('a text step never ticks a task', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-2-9a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    for (const t of ['toward-minus-one', 'finite-half', 'aim-dense']) expect(tasks[`fig-2-9a:${t}`]).toBeFalsy();
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-2.9-def', 'Q-2.9-converse', 'Q-2.9-find', 'Q-2.9-unique', 'Q-2.9-bw', 'Q-2.9-bisect']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-2-9-"]');
    await expect(examples).toHaveCount(6);
    const sol = examples.first().locator('details').first();
    await expect(sol).not.toHaveAttribute('open', '');
  });
});
