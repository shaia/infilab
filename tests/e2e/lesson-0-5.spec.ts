import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/0-5/';

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

const push = (fig: Locator) => fig.locator('[data-action="push"]').click();

test.describe('lesson 0.5: mathematical induction', () => {
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

  test('the sum topples to the end of the window, the +1 formula does not start, and both tick their tasks', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-5a');
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('P(10)');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-5a:topple']).toBeTruthy();
    await fig.getByRole('button', { name: /n\(n\+1\)\/2 \+ 1/ }).click();
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('לא נכון');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-5a:no-base']).toBeTruthy();
  });

  test('in the horses family the chain stops at P(1), and clicking the link 1 ⇒ 2 ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-5a');
    await fig.getByRole('button', { name: 'כל המספרים שווים' }).click();
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('P(1) ⇒ P(2)');
    // keyboard: P(1), then the link 1 ⇒ 2
    const canvas = fig.locator('canvas');
    await canvas.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(fig.locator('[data-readout="sel"]')).toContainText('שקרית');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-5a:broken-link']).toBeTruthy();
  });

  test('2ⁿ > n³: from base 1 the chain breaks at once; the student’s base 10 reaches the end and ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-5b');
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('P(1) ⇒ P(2)');
    const base = fig.locator('input[type=range]').first();
    await slide(base, 9);
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('לא נכון');
    expect((await progress(page))?.tasks?.['fig-0-5b:late-base']).toBeFalsy();
    await slide(base, 10);
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('P(14)');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-5b:late-base']).toBeTruthy();
  });

  test('Bernoulli with x = −4 breaks at the link 2 ⇒ 3, and only the student’s own x ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-5b');
    await fig.getByRole('button', { name: 'ברנולי' }).click();
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('P(10)');
    // the sliders are: base n₀, then x
    await slide(fig.locator('input[type=range]').nth(1), -4);
    await push(fig);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('P(2) ⇒ P(3)');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-5b:bernoulli-break']).toBeTruthy();
  });

  test('text steps never tick a task, even the one that sets x = −4', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-0-5b"], .step[data-fig="fig-0-5a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    for (const t of ['fig-0-5a:topple', 'fig-0-5a:no-base', 'fig-0-5a:broken-link', 'fig-0-5b:late-base', 'fig-0-5b:bernoulli-break']) {
      expect(tasks[t]).toBeFalsy();
    }
  });

  test('the Check has the eight bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-0.5-step-meaning', 'Q-0.5-what-to-prove', 'Q-0.5-start-point', 'Q-0.5-no-base', 'Q-0.5-bernoulli-why', 'Q-0.5-step-too-early', 'Q-0.5-strong-why', 'Q-0.5-well-ordering-z']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-0-5-"]');
    await expect(examples).toHaveCount(6);
    const sol = examples.first().locator('details').first();
    await expect(sol).not.toHaveAttribute('open', '');
  });
});
