import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/2-3/';

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

const task = async (page: Page, id: string) => (await progress(page))?.tasks?.[`fig-2-3a:${id}`];

test.describe('lesson 2.3: proving a limit from the definition, first properties', () => {
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

  test('for (3n+1)/(n+2) at ε = 0.01 the estimate N = 500 fits, the smallest N is 498, and finding it ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-3a');
    const [eps, N] = [fig.locator('input[type=range]').nth(0), fig.locator('input[type=range]').nth(1)];
    // the ε slider runs wide → narrow over EPSILONS = [0.5, 0.3, 0.2, 0.1, 0.05, 0.03, 0.02, 0.01, …]: position 7 is 0.01
    await slide(eps, 7);
    await expect(fig.locator('[data-readout="eps"]')).toContainText('0.01');
    await slide(N, 500); // N = ⌈5/ε⌉ from the estimate 5/(n+2) < 5/n
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('מתאים');
    await slide(N, 497); // |a₄₉₈ − 3| = 5/500 = 0.01 is on the edge, hence outside
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('n = 498');
    await slide(N, 498);
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('מתאים');
    await expect.poll(() => task(page, 'estimate')).toBeTruthy();
  });

  test('a text step never ticks a task', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-2-3a"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    for (const id of ['estimate', 'bound-all', 'no-limit']) expect(await task(page, id)).toBeFalsy();
  });

  test('in bound mode on (3n²+n)/(n²+1), lowering M to just above the largest term 114/37 ticks bound-all', async ({ page }) => {
    await page.goto(LESSON);
    const fig = page.locator('#fig-2-3a');
    await fig.scrollIntoViewIfNeeded();
    await hydrated(fig.locator('canvas'));
    // the step "מצב החסם" puts the figure in bound mode with M = 5; the student then moves M
    const step = page.locator('.step[data-fig="fig-2-3a"]', { hasText: 'מצב החסם' });
    await step.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await freezeSteps(page);
    await fig.scrollIntoViewIfNeeded();
    const M = fig.locator('input[type=range]').nth(0);
    await expect(fig.locator('[data-readout="M"]')).toContainText('3.5');
    await slide(M, 3.1); // a₆ = 114/37 ≈ 3.0811 is the largest term; 3.1 ≤ 3.0811 + 0.05
    await expect.poll(() => task(page, 'bound-all')).toBeTruthy();
  });

  test('for (−1)ⁿ no candidate L works with N ≥ 30, and trying three ticks no-limit', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-2-3a');
    // exactly (−1)ⁿ: the chip of (−1)ⁿ n/(n+1) also contains "(−1)ⁿ" (names are wrapped in U+2066 … U+2069)
    await fig.getByRole('button', { name: /^⁦?\(−1\)ⁿ⁩?$/ }).click();
    const ranges = fig.locator('input[type=range]');
    await slide(ranges.nth(0), 0); // ε = 0.5
    await slide(ranges.nth(1), 30);
    for (const L of [-0.5, 0, 0.5]) {
      await slide(ranges.nth(2), L);
      await expect(fig.locator('[data-readout="verdict"]')).toContainText('מחוץ לסביבה');
    }
    await expect.poll(() => task(page, 'no-limit')).toBeTruthy();
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-2.3-estimate', 'Q-2.3-why-estimate', 'Q-2.3-unique-eps', 'Q-2.3-bounded-converse', 'Q-2.3-diverge-def', 'Q-2.3-alt-eps']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-2-3-"]');
    await expect(examples).toHaveCount(6);
    const sol = examples.first().locator('details').first();
    await expect(sol).not.toHaveAttribute('open', '');
  });
});
