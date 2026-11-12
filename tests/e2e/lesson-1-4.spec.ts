import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/1-4/';
const TASKS = ['find-upper-bound', 'least-bound', 'eps-witness', 'beat-bound'];

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

test.describe('lesson 1.4: bounds, supremum and infimum', () => {
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

  test('on [0, 1): 0.5 is not an upper bound, 1.5 is, and 1 is the least one on the grid; each ticks its task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-1-4a');
    // bound view: the only slider is the candidate M (the figure starts at M = 0.5)
    const M = fig.locator('input[type=range]').nth(0);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('אינו חסם מלעיל');
    await slide(M, 1.5);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('חסם מלעיל של הקבוצה');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-4a:find-upper-bound']).toBeTruthy();
    await slide(M, 1);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('חסם מלעיל של הקבוצה');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-4a:least-bound']).toBeTruthy();
    await slide(M, 0.95);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('אינו חסם מלעיל');
  });

  test('at the sup of [0, 1) every ε has an element in (1 − ε, 1], and ε = 0.1 ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-1-4a');
    await fig.getByRole('button', { name: 'אפסילון', exact: true }).click();
    // eps view: M slider, then ε over the ladder 2, 1, 0.5, 0.25, 0.1, …: position 4 is 0.1
    const band = fig.locator('[data-readout="band"]');
    await expect(band).toContainText('(0.75, 1]');
    await expect(band).toContainText('0.875');
    await slide(fig.locator('input[type=range]').nth(1), 4);
    await expect(band).toContainText('(0.9, 1]');
    await expect(band).toContainText('0.95');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-4a:eps-witness']).toBeTruthy();
  });

  test('M = 1.25 is a bound but not the least: ε = 0.25 leaves the band empty and ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-1-4a');
    await fig.getByRole('button', { name: 'אפסילון', exact: true }).click();
    const [M, eps] = [fig.locator('input[type=range]').nth(0), fig.locator('input[type=range]').nth(1)];
    const band = fig.locator('[data-readout="band"]');
    await slide(eps, 2); // ε = 0.5
    await slide(M, 1.25);
    await expect(band).toContainText('(0.75, 1.25]');
    await expect(band).toContainText('0.875');
    expect((await progress(page))?.tasks?.['fig-1-4a:beat-bound']).toBeFalsy();
    await slide(eps, 3); // ε = 0.25: the band (1, 1.25] holds no element of [0, 1)
    await expect(band).toContainText('אינו הסופרמום');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-4a:beat-bound']).toBeTruthy();
  });

  test('a text step never ticks a task', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-1-4a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    for (const t of TASKS) expect(tasks[`fig-1-4a:${t}`]).toBeFalsy();
  });

  test('the Check has the five bank questions, six worked examples, and the anchors other files link to exist', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-1.4-bound-def', 'Q-1.4-sup-def', 'Q-1.4-max-exists', 'Q-1.4-sup-in-set', 'Q-1.4-eps-char']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    await expect(page.locator('[id^="ex-1-4-"]')).toHaveCount(6);
    for (const id of ['bounds', 'max-min', 'half-open', 'sup-def', 'empty-set', 'sup-vs-max', 'eps-char', 'hook-answer', 'infinitely-many', 'negative-set']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });
});
