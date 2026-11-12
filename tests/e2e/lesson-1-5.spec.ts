import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/1-5/';

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

test.describe('lesson 1.5: the completeness axiom', () => {
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

  test('on the positive rationals with square below 2, 1.45 is the least bound on the grid and 1.4 is not a bound', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-1-5a');
    // bound mode: the only slider is the candidate M (grid 0.05)
    const M = fig.locator('input[type=range]').first();
    await slide(M, 1.4);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('אינו חסם מלעיל');
    await slide(M, 1.45);
    await expect(fig.locator('[data-readout="verdict"]')).not.toContainText('אינו חסם מלעיל');
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('חסם מלעיל');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-5a:least-bound']).toBeTruthy();
  });

  test('with M = sup, shrinking ε to 0.1 still finds a rational in the band, and that ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-1-5a');
    await fig.getByRole('button', { name: 'אפסילון', exact: true }).click();
    // eps mode: slider 0 = M, slider 1 = ε on the ladder 2, 1, 0.5, 0.25, 0.1, … (index 4 is 0.1)
    await slide(fig.locator('input[type=range]').nth(1), 4);
    await expect(fig.locator('[data-readout="band"]')).toContainText('ε = 0.1');
    await expect(fig.locator('[data-readout="band"]')).toContainText('נמצא בתוכה');
    await expect(fig.locator('[data-readout="sup"]')).toContainText('√2');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-5a:eps-witness']).toBeTruthy();
  });

  test('the sum of (0,1) and [2,3) has sup 4 = 1 + 3, and shrinking ε ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-1-5b');
    await fig.getByRole('button', { name: 'סכום קבוצות', exact: true }).click();
    await expect(fig.locator('[data-readout="sums"]')).toContainText('sup(A + B) = 4');
    // sum mode: the only slider is ε
    await slide(fig.locator('input[type=range]').first(), 4);
    await expect(fig.locator('[data-readout="witness"]')).toContainText('ε = 0.1');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-5b:sum-eps']).toBeTruthy();
  });

  test('a text step never ticks a task', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-1-5a"], .step[data-fig="fig-1-5b"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    for (const t of ['fig-1-5a:least-bound', 'fig-1-5a:eps-witness', 'fig-1-5b:sum-eps']) expect(tasks[t]).toBeFalsy();
  });

  test('the Check has its five bank questions, six worked examples, and the remedy anchors exist', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-1.5-axiom', 'Q-1.5-rationals-gap', 'Q-1.5-one-side', 'Q-1.5-subset', 'Q-1.5-negative-scalar']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-1-5-"]');
    await expect(examples).toHaveCount(6);
    await expect(examples.first().locator('details').first()).not.toHaveAttribute('open', '');
    for (const id of ['axiom', 'rationals', 'two-sides', 'inclusion', 'separation', 'scalar', 'products', 'inf-exists']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });
});
