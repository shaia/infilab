import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/1-6/';

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

test.describe('lesson 1.6: the Archimedean property, the floor and density', () => {
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

  test('every candidate bound M is beaten by the natural ⌊M⌋ + 1, and M ≥ 20 ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-1-6a');
    // archimedes view (the default, M = 10.5): one slider, the candidate M
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('n = 11');
    await slide(fig.locator('input[type=range]').nth(0), 20.5);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('n = 21');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-6a:beat-bound']).toBeTruthy();
  });

  test('inf {1/n} = 0: shrinking ε to 0.1 keeps an element (1/11) in the band and ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-1-6a');
    await fig.getByRole('button', { name: 'אפסילון' }).click();
    await fig.getByRole('button', { name: 'חסם מלרע, אינפימום' }).click();
    await expect(fig.locator('[data-readout="sup"]')).toContainText('inf = 0');
    // eps view sliders: M, ε; the ε ladder is [2, 1, 0.5, 0.25, 0.1, …]: position 4 is 0.1
    await slide(fig.locator('input[type=range]').nth(1), 4);
    await expect(fig.locator('[data-readout="band"]')).toContainText('0.0909');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-6a:eps-witness']).toBeTruthy();
  });

  test('density in (0.31, 0.36): n = 21 gives 7/21, n = 5 jumps over the interval, n = 3 lands by luck and ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-1-6a');
    await fig.getByRole('button', { name: 'צפיפות' }).click();
    await expect(fig.locator('[data-readout="n"]')).toContainText('n = 21');
    await expect(fig.locator('[data-readout="n"]')).toContainText('= 7');
    // density view sliders: a, b, n
    const n = fig.locator('input[type=range]').nth(2);
    await slide(n, 5);
    await expect(fig.locator('[data-readout="n"]')).toContainText('2/5');
    await expect(fig.locator('[data-readout="n"]')).toContainText('מחוץ לקטע');
    expect((await progress(page))?.tasks?.['fig-1-6a:rational-between']).toBeFalsy();
    await slide(n, 3);
    await expect(fig.locator('[data-readout="n"]')).toContainText('1/3');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-6a:rational-between']).toBeTruthy();
  });

  test('a text step never ticks a task', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-1-6a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    for (const t of ['beat-bound', 'eps-witness', 'rational-between']) expect(tasks[`fig-1-6a:${t}`]).toBeFalsy();
  });

  test('the Check has the five bank questions, six worked examples, and the anchors the register links to exist', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-1.6-archimedes-forms', 'Q-1.6-ratio-sup', 'Q-1.6-many-between', 'Q-1.6-floor-negative', 'Q-1.6-floor-additive']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    await expect(page.locator('[id^="ex-1-6-"]')).toHaveCount(6);
    for (const id of ['archimedes-proof', 'inf-reciprocals', 'floor-def', 'floor-properties', 'no-next-rational', 'irrational-density', 'construction-traps', 'approximation']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });
});
