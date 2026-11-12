import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/1-7/';

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

// SupFinder in mode 'root' with no mode picker: the sliders are a (0), k (1), the candidate x (2).
test.describe('lesson 1.7: existence of roots and powers', () => {
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

  test('for x² < 2 the step goes up into S, for x² > 2 it gives a smaller bound, and both cases tick the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-1-7a');
    const x = fig.locator('input[type=range]').nth(2);
    // a = 2, k = 2: the bisection probe shows s ≈ 1.4142 (fmtNum rounds to 4 places)
    await expect(fig.locator('[data-readout="root"]')).toContainText('1.4142');
    await slide(x, 0.5);
    await expect(fig.locator('[data-readout="case"]')).toContainText('אינו חסם מלעיל');
    expect((await progress(page))?.tasks?.['fig-1-7a:root-cases']).toBeFalsy();
    // x = 1.5: x² = 2.25 > 2, h = 1/12, x − h = 17/12 is a smaller upper bound
    await slide(x, 1.5);
    await expect(fig.locator('[data-readout="case"]')).toContainText('h ≈ 0.0833');
    await expect(fig.locator('[data-readout="case"]')).toContainText('אינו הקטן ביותר');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-1-7a:root-cases']).toBeTruthy();
  });

  test('a = 5 and k = 3 give the cube root of 5, s ≈ 1.71, and x = 2 gives the step h = 0.25 of worked example 3', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-1-7a');
    const [a, k, x] = [0, 1, 2].map((i) => fig.locator('input[type=range]').nth(i));
    await slide(a, 5);
    await slide(k, 3);
    await expect(fig.locator('[data-readout="root"]')).toContainText('1.71');
    await slide(x, 2);
    await expect(fig.locator('[data-readout="case"]')).toContainText('h ≈ 0.25');
  });

  test('a text step never ticks a task, though the steps place x on both sides of the root', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-1-7a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    expect((await progress(page))?.tasks?.['fig-1-7a:root-cases']).toBeFalsy();
  });

  test('the Check has the five bank questions, six worked examples, and the anchors the misconception register links to exist', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-1.7-which-set', 'Q-1.7-both-cases', 'Q-1.7-power-value', 'Q-1.7-well-defined', 'Q-1.7-irrational-def']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-1-7-"]');
    await expect(examples).toHaveCount(6);
    await expect(examples.first().locator('details').first()).not.toHaveAttribute('open', '');
    for (const id of ['power-estimates', 'root-existence', 'root-rules', 'integer-powers', 'rational-power', 'negative-base', 'well-defined', 'real-power', 'real-power-bounded', 'facts-table']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });
});
