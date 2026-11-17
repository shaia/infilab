import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/2-8/';

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

/** The two sliders of GrowthLadder: the window (an index into WINDOWS) and the cursor n. */
const sliders = (fig: Locator) => ({ win: fig.locator('input[type=range]').nth(0), n: fig.locator('input[type=range]').nth(1) });
/** WINDOWS = [20, 40, 60, 80, 100, 150, 200, 300, 500, 700, 1000] in src/math/growth.ts */
const WIN = { 100: 4, 300: 7, 1000: 10 } as const;

test.describe('lesson 2.8: useful limits', () => {
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

  test('2ⁿ overtakes n¹⁰ at n = 59, and moving the cursor there ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-8a');
    const { n } = sliders(fig);
    await expect(fig.locator('[data-readout="overtake"]')).toContainText('n = 59');
    await slide(n, 58);
    await expect(fig.locator('[data-readout="n"]')).toContainText('58');
    expect((await progress(page))?.tasks?.['fig-2-8a:cross']).toBeFalsy();
    await slide(n, 59);
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-8a:cross']).toBeTruthy();
  });

  test('the ratio of 100ⁿ/n! drops below 1 at n = 100, not at 99, where it is exactly 1', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-8a');
    await fig.getByRole('button', { name: '100ⁿ/n!' }).first().click();
    const { win, n } = sliders(fig);
    await slide(win, WIN[300]);
    await slide(n, 99);
    await expect(fig.locator('[data-readout="a"]')).toContainText('המנה 1');
    expect((await progress(page))?.tasks?.['fig-2-8a:ratio-below']).toBeFalsy();
    await slide(n, 100);
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-8a:ratio-below']).toBeTruthy();
  });

  test('1.1ⁿ overtakes n¹⁰ only at n = 686, visible once the window is widened', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-8a');
    await fig.getByRole('button', { name: '1.1ⁿ' }).nth(1).click();
    const { win, n } = sliders(fig);
    // in the first 100 terms n¹⁰ leads: the window misleads
    await expect(fig.locator('[data-readout="overtake"]')).toContainText('n¹⁰ גדולה');
    await slide(win, WIN[1000]);
    await expect(fig.locator('[data-readout="overtake"]')).toContainText('n = 686');
    await slide(n, 686);
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-8a:late']).toBeTruthy();
  });

  test('a text step never ticks a task', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-2-8a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    for (const t of ['cross', 'ratio-below', 'late']) expect(tasks[`fig-2-8a:${t}`]).toBeFalsy();
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-2.8-roots', 'Q-2.8-rootsum', 'Q-2.8-ratio', 'Q-2.8-below-one', 'Q-2.8-scale', 'Q-2.8-early']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-2-8-"]');
    await expect(examples).toHaveCount(6);
    const sol = examples.first().locator('details').first();
    await expect(sol).not.toHaveAttribute('open', '');
  });
});
