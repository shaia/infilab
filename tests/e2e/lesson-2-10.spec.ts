import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/2-10/';

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

/**
 * Move the ε slider to the position whose readout shows `want`. The slider runs over the figure's ε list (as in
 * 2.2, wide → narrow); searching by the readout keeps the test independent of the list's exact positions.
 */
async function setEps(fig: Locator, want: string) {
  const eps = fig.locator('input[type=range]').nth(0);
  const max = Number((await eps.getAttribute('max')) ?? '10');
  for (let i = 0; i <= max; i++) {
    await slide(eps, i);
    const text = (await fig.locator('[data-readout="eps"]').textContent()) ?? '';
    if (new RegExp(`=\\s*${want.replace('.', '\\.')}(?!\\d)`).test(text)) return;
  }
  throw new Error(`no ε position shows ${want}`);
}

test.describe('lesson 2.10: Cauchy sequences', () => {
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

  test('for Σ 1/k² and ε = 0.05, sweeping N passes the smallest Cauchy N in the window and ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-10a');
    // the reset puts the figure on its props: the inverse-squares sums, ε = 0.1, N = 0
    await setEps(fig, '0.05');
    const N = fig.locator('input[type=range]').nth(1);
    // the proof (2.10.7) gives N = 20 for every m, n; the window's smallest N is at most that
    for (let v = 0; v <= 20; v++) await slide(N, v);
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-10a:cauchy-N']).toBeTruthy();
  });

  test('for Hₙ the tail spread stays at least 1/2 however far N moves, and trying ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-10a');
    await fig.getByRole('button', { name: /Hₙ/ }).click();
    await setEps(fig, '0.5');
    const N = fig.locator('input[type=range]').nth(1);
    for (const v of [30, 100, 150]) {
      await slide(N, v);
      await expect(fig.locator('[data-readout="N"]')).toContainText(String(v));
    }
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-10a:harmonic-grows']).toBeTruthy();
  });

  test('a text step never ticks a task', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('#fig-2-10a ~ * .step, .step[data-fig="fig-2-10a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    expect(tasks['fig-2-10a:cauchy-N']).toBeFalsy();
    expect(tasks['fig-2-10a:harmonic-grows']).toBeFalsy();
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-2.10-def', 'Q-2.10-sqrt', 'Q-2.10-conv-cauchy', 'Q-2.10-bounded', 'Q-2.10-gap', 'Q-2.10-squares']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-2-10-"]');
    await expect(examples).toHaveCount(6);
    const sol = examples.first().locator('details').first();
    await expect(sol).not.toHaveAttribute('open', '');
  });
});
