import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/0-4/';

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

test.describe('lesson 0.4: proof methods and the counterexample', () => {
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

  test('n² + n + 41 is prime for n = 1 … 39, fails at 40 = 41 · 41, and reaching it ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-4a');
    const n = fig.locator('input[type=range]').first();
    await slide(n, 39);
    await expect(fig.locator('[data-readout="tally"]')).toContainText('39 מתקיימים');
    await expect(fig.locator('[data-readout="tally"]')).toContainText('אין דוגמה נגדית');
    expect((await progress(page))?.tasks?.['fig-0-4a:find-40']).toBeFalsy();
    await fig.locator('[data-action="next"]').click();
    await expect(fig.locator('[data-readout="current"]')).toContainText('1681 = 41 · 41');
    // formulas inside Hebrew text sit in LTR isolates, so the bidi algorithm cannot reverse them
    await expect(fig.locator('[data-readout="current"] bdi[dir="ltr"]', { hasText: '1681 = 41 · 41' })).toHaveCount(1);
    await expect(fig.locator('[data-readout="claim"] bdi[dir="ltr"]', { hasText: 'n² + n + 41' })).toHaveCount(1);
    await expect(fig.locator('[data-readout="tally"]')).toContainText('הראשונה ב-n = 40');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-4a:find-40']).toBeTruthy();
  });

  test('in an implication a case without the hypothesis is not a counterexample; n = 11 is the first one', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-4a');
    await fig.getByRole('button', { name: 'אם n ראשוני' }).click();
    const n = fig.locator('input[type=range]').first();
    await slide(n, 4);
    await expect(fig.locator('[data-readout="current"]')).toContainText('ההנחה לא מתקיימת');
    await expect(fig.locator('[data-readout="tally"]')).toContainText('אין דוגמה נגדית');
    await slide(n, 11);
    await expect(fig.locator('[data-readout="current"]')).toContainText('2047 = 23 · 89');
    await expect(fig.locator('[data-readout="tally"]')).toContainText('הראשונה ב-n = 11');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-4a:hypothesis']).toBeTruthy();
  });

  test('a text step never ticks a task, even one that shows the counterexample', async ({ page }) => {
    await page.goto(LESSON);
    // a step of 0.4א sets n = 40 on Euler's claim: exactly the find-40 answer
    for (const step of await page.locator('.step[data-fig="fig-0-4a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    for (const t of ['find-40', 'early', 'hypothesis']) expect(tasks[`fig-0-4a:${t}`]).toBeFalsy();
  });

  test('n² + n is even on all 50 cases: no counterexample, and checking them all ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-4b');
    await slide(fig.locator('input[type=range]').first(), 50);
    await expect(fig.locator('[data-readout="tally"]')).toContainText('50 מתקיימים');
    await expect(fig.locator('[data-readout="tally"]')).toContainText('אין דוגמה נגדית');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-4b:no-counterexample']).toBeTruthy();
  });

  test('the Check has the five bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-0.4-contradiction-start', 'Q-0.4-squares-counterexample', 'Q-0.4-contrapositive-proof', 'Q-0.4-iff-plan', 'Q-0.4-iff-false']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-0-4-"]');
    await expect(examples).toHaveCount(6);
    await expect(examples.first().locator('details').first()).not.toHaveAttribute('open', '');
  });
});
