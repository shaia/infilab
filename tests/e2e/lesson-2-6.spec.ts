import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/2-6/';

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

/** SequenceStrip's controls in mode `infinite` are [M] [N] (header of SequenceStrip.tsx): N is the last range. */
const nSlider = (fig: Locator) => fig.locator('input[type=range]').last();

test.describe('lesson 2.6: infinite limits', () => {
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

  test('for √n and M = 10 the smallest N is 100 (= ⌊M²⌋), and finding it ticks find-N-M', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-6a');
    await fig.getByRole('button', { name: /√n/ }).click();
    // picking the preset resets M to its start (4); the task wants M ≥ 10
    const M = fig.locator('input[type=range]').first();
    await slide(M, 10);
    await slide(nSlider(fig), 99);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('100');
    await slide(nSlider(fig), 100);
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-6a:find-N-M']).toBeTruthy();
  });

  test('a text step never ticks a task, even one that sets the figure to the answer', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-2-6a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    expect(tasks['fig-2-6a:find-N-M']).toBeFalsy();
    expect(tasks['fig-2-6a:no-N-M']).toBeFalsy();
  });

  test('for the zigzag sequence no N fits M = 5, however far N moves, and trying ticks no-N-M', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-6a');
    await fig.getByRole('button', { name: /זיגזג/ }).click();
    await slide(fig.locator('input[type=range]').first(), 5);
    for (const v of [5, 20, 40]) {
      await slide(nSlider(fig), v);
      await expect(fig.locator('[data-readout="verdict"]')).not.toContainText('מתאים (');
    }
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-6a:no-N-M']).toBeTruthy();
  });

  test('the Check has the six bank questions, the anchors of the register exist, and solutions stay closed', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-2.6-def', 'Q-2.6-N', 'Q-2.6-ext', 'Q-2.6-forms', 'Q-2.6-classify', 'Q-2.6-implications']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    for (const anchor of ['definition', 'reciprocal', 'forms', 'taxonomy']) {
      await expect(page.locator(`#${anchor}`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-2-6-"]');
    await expect(examples).toHaveCount(6);
    await expect(examples.first().locator('details').first()).not.toHaveAttribute('open', '');
  });
});
