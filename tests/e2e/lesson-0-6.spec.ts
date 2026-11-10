import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/0-6/';

/** Set a range input as a student would: the value, then an input event. */
const slide = (s: Locator, v: number) =>
  s.evaluate((el: HTMLInputElement, value) => {
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);

/** Bring the figure into view, wait for its island, stop text steps from driving it, and reset it. */
async function ready(page: Page) {
  const f = page.locator('#fig-0-6a');
  await f.scrollIntoViewIfNeeded();
  await hydrated(f.locator('canvas'));
  await freezeSteps(page);
  await f.getByRole('button', { name: 'איפוס' }).click();
  return f;
}

const push = (fig: Locator) => fig.locator('[data-action="push"]').click();
/** the sliders are: base n₀, then x */
const base = (fig: Locator) => fig.locator('input[type=range]').nth(0);
const xSlider = (fig: Locator) => fig.locator('input[type=range]').nth(1);

test.describe('lesson 0.6: strong induction, well-ordering, Bernoulli, the binomial theorem', () => {
  test('the figure draws, in LTR math space', async ({ page }) => {
    await page.goto(LESSON);
    const canvases = page.locator('.sim-stage canvas');
    await expect(canvases).toHaveCount(1);
    const c = canvases.first();
    await c.scrollIntoViewIfNeeded();
    await expect(c).toHaveCSS('direction', 'ltr');
    await expect.poll(() => inked(c)).toBeGreaterThan(200);
  });

  test('Bernoulli with x = 0.5 topples all ten; x = −4 breaks at the link 2 ⇒ 3 and ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('P(10)');
    expect((await progress(page))?.tasks?.['fig-0-6a:bernoulli-break']).toBeFalsy();
    await slide(xSlider(fig), -4);
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('P(2) ⇒ P(3)');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-6a:bernoulli-break']).toBeTruthy();
  });

  test('the strict form fails at the base P(1); the student’s base 2 reaches the end and ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: 'ברנולי, אי-שוויון חזק', exact: true }).click();
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('לא נכון');
    await slide(base(fig), 2);
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('P(10)');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-6a:strict-base']).toBeTruthy();
  });

  test('the improved form reaches the end for x = 0.5 and breaks at 2 ⇒ 3 for the student’s negative x', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page);
    await fig.getByRole('button', { name: 'ברנולי משופר', exact: true }).click();
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('P(10)');
    expect((await progress(page))?.tasks?.['fig-0-6a:square-break']).toBeFalsy();
    await slide(xSlider(fig), -0.5);
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('P(2) ⇒ P(3)');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-6a:square-break']).toBeTruthy();
  });

  test('text steps never tick a task, even those that set x = −4, x = −0.9 or the base 2', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-0-6a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    for (const t of ['fig-0-6a:bernoulli-break', 'fig-0-6a:strict-base', 'fig-0-6a:square-break']) expect(tasks[t]).toBeFalsy();
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-0.6-strong-why', 'Q-0.6-well-ordering-z', 'Q-0.6-bernoulli-why', 'Q-0.6-bernoulli-condition', 'Q-0.6-pascal-value', 'Q-0.6-binomial-coef']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-0-6-"]');
    await expect(examples).toHaveCount(6);
    const sol = examples.first().locator('details').first();
    await expect(sol).not.toHaveAttribute('open', '');
  });
});
