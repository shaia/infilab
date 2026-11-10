import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/0-9/';

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

test.describe('lesson 0.9: inequalities and absolute value', () => {
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

  test('centre 2 and radius 3 make the band the open interval (−1, 5), and that ticks the task; ≤ closes it', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-9a');
    // band view sliders: a, r, x
    const [a, r] = [fig.locator('input[type=range]').nth(0), fig.locator('input[type=range]').nth(1)];
    await expect(fig.locator('[data-readout="set"]')).toContainText('(0, 2)');
    await slide(a, 2);
    await slide(r, 3);
    await expect(fig.locator('[data-readout="set"]')).toContainText('(−1, 5)');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-9a:centre-radius']).toBeTruthy();
    await fig.getByRole('button', { name: '|x − a| ≤ r' }).click();
    await expect(fig.locator('[data-readout="set"]')).toContainText('[−1, 5]');
  });

  test('|x + y| = |x| + |y| once x and y have the same sign, and that ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-9a');
    await fig.getByRole('button', { name: 'אי-שוויון המשולש' }).click();
    await expect(fig.locator('[data-readout="tri"]')).toContainText('✗');
    await slide(fig.locator('input[type=range]').nth(1), 2);
    await expect(fig.locator('[data-readout="tri"]')).toContainText('|x + y| = 5 = 5 = |x| + |y|');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-9a:equality-case']).toBeTruthy();
  });

  test('the sum of distances to 2 and −1 is never below 3: c = 3 leaves the set empty and ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-9a');
    await fig.getByRole('button', { name: 'סכום מרחקים' }).click();
    // two-distances view sliders: a, b, c, x
    const c = fig.locator('input[type=range]').nth(2);
    await expect(fig.locator('[data-readout="set"]')).toContainText('(−2, 3)');
    await slide(c, 3);
    await expect(fig.locator('[data-readout="set"]')).toContainText('∅');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-9a:two-distances']).toBeTruthy();
    await slide(c, 3.5);
    await expect(fig.locator('[data-readout="set"]')).toContainText('(−1.25, 2.25)');
  });

  test('a text step never ticks a task', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-0-9a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    for (const t of ['centre-radius', 'equality-case', 'two-distances']) expect(tasks[`fig-0-9a:${t}`]).toBeFalsy();
  });

  test('the Check has the six bank questions, six worked examples, and the anchors other lessons link to exist', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-0.9-abs-less', 'Q-0.9-abs-distance', 'Q-0.9-abs-greater', 'Q-0.9-sum-bound', 'Q-0.9-which-hold', 'Q-0.9-amgm-sign']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    await expect(page.locator('[id^="ex-0-9-"]')).toHaveCount(6);
    for (const id of ['centre-radius', 'solving', 'equality', 'reverse', 'estimates', 'fractions']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });
});
