import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/2-7/';

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

/** a₁ slider positions: whole steps of 0.05 from the map's minimum (src/math/recursion.ts, MAPS[map].a1) */
const A1 = { sqrt2: (v: number) => Math.round((v + 2) / 0.05), heron: (v: number) => Math.round((v - 0.2) / 0.05), double: (v: number) => Math.round((v + 1) / 0.05) };

test.describe('lesson 2.7: monotone sequences and the number e', () => {
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

  test('√(2 + x) rises from a₁ = 0, falls from a₁ = 3, and finding a falling start ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-7a');
    const a1 = fig.locator('input[type=range]').nth(0);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('עולה');
    await slide(a1, A1.sqrt2(3));
    await expect(fig.locator('[data-readout="a1"]')).toContainText('3');
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('יורדת');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-7a:sqrt-down']).toBeTruthy();
  });

  test('Heron from a₁ = 1 jumps up and falls from n = 2; 2x converges only from a₁ = 0', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-7a');
    const a1 = fig.locator('input[type=range]').nth(0);
    await fig.getByRole('button', { name: /הרון/ }).click();
    await slide(a1, A1.heron(1));
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('מ-n = 2');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-7a:heron-jump']).toBeTruthy();
    await fig.locator('button.toggle', { hasText: /^\W*2x\W*$/ }).click();
    await slide(a1, A1.double(0));
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('קבועה');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-7a:double-zero']).toBeTruthy();
  });

  test('a text step never ticks a task, even the one that sets √(2 + x) to a₁ = 3', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-2-7a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    expect((await progress(page))?.tasks?.['fig-2-7a:sqrt-down']).toBeFalsy();
  });

  test('e mode: f₅ < 3 is the first fₙ below 3, and n = 74 is the first interval inside (2.7, 2.8)', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-7b');
    const n = fig.locator('input[type=range]').nth(0);
    await slide(n, 4);
    await expect(fig.locator('[data-readout="fn"]')).toContainText('3.051758');
    await slide(n, 5);
    await expect(fig.locator('[data-readout="fn"]')).toContainText('2.985984');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-7b:e-three']).toBeTruthy();
    await slide(n, 74);
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-2-7b:e-digit']).toBeTruthy();
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-2.7-thm', 'Q-2.7-tail', 'Q-2.7-sqrt', 'Q-2.7-start', 'Q-2.7-e', 'Q-2.7-strict']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-2-7-"]');
    await expect(examples).toHaveCount(6);
    const sol = examples.first().locator('details').first();
    await expect(sol).not.toHaveAttribute('open', '');
  });
});
