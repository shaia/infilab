import { expect, test, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/0-6/';

/** Bring a figure into view, wait for its island, stop text steps from driving it, and reset it. */
async function ready(page: Page, fig: string) {
  const f = page.locator(`#${fig}`);
  await f.scrollIntoViewIfNeeded();
  await hydrated(f.locator('canvas'));
  await freezeSteps(page);
  await f.getByRole('button', { name: 'איפוס' }).click();
  return f;
}

/** Drive the figure from the keyboard, as a learner without a mouse would: arrows move the cursor, Enter picks. */
async function keys(page: Page, fig: string, seq: string[]) {
  await page.locator(`#${fig} canvas`).focus();
  for (const k of seq) await page.keyboard.press(k);
}

test.describe('lesson 0.6: sets and functions', () => {
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

  test('the broken relation is not a function; fixing it from the keyboard makes one and ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-6a');
    const verdict = fig.locator('[data-readout="function"]');
    await expect(verdict).toContainText('לא פונקציה');
    // the preset: 1 → a, 1 → b, 3 → c. Remove 1 → b, then add 2 → d.
    await keys(page, 'fig-0-6a', ['Enter', 'ArrowRight', 'ArrowDown', 'Enter']);
    await expect(verdict).toContainText('לא פונקציה');
    await keys(page, 'fig-0-6a', ['ArrowLeft', 'Enter', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'Enter']);
    await expect(verdict).not.toContainText('לא פונקציה');
    await expect(fig.locator('[data-readout="rule"]')).toContainText('f(2) = d');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-6a:make-function']).toBeTruthy();
  });

  test('x² on {−2,…,2} is neither injective nor onto, and its image is {0, 1, 4}', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-6a');
    await fig.getByRole('button', { name: /x²/ }).click();
    await expect(fig.locator('[data-readout="injective"]')).toContainText('לא חד-חד-ערכית');
    await expect(fig.locator('[data-readout="onto"]')).toContainText('לא על');
    await expect(fig.locator('[data-readout="image"]')).toContainText('{0, 1, 4}');
  });

  test('a bijection, flipped, is a function back: the inverse; making it ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-6b');
    await fig.getByRole('button', { name: '3 אל 3' }).click();
    // the preset: 1 → b, 2 → b, 3 → a. Re-aim 2 at c.
    await keys(page, 'fig-0-6b', ['ArrowDown', 'Enter', 'ArrowRight', 'Enter', 'ArrowLeft', 'Enter', 'ArrowRight', 'ArrowDown', 'Enter']);
    await expect(fig.locator('[data-readout="injective"]')).toContainText('חד-חד-ערכית');
    await expect(fig.locator('[data-readout="injective"]')).not.toContainText('לא');
    await expect(fig.locator('[data-readout="onto"]')).not.toContainText('לא');
    await fig.getByRole('button', { name: 'הפכו את החצים' }).click();
    await expect(fig.locator('[data-readout="flip"]')).toContainText('הפונקציה ההפוכה');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-6b:bijection-invert']).toBeTruthy();
  });

  test('flipping x² fails twice over: a point with two arrows and a point with none', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-6b');
    await fig.getByRole('button', { name: 'הפכו את החצים' }).click();
    const flip = fig.locator('[data-readout="flip"]');
    await expect(flip).toContainText('אינם פונקציה');
    await expect(flip).toContainText('אין חץ');
    await expect(flip).toContainText('כמה חצים');
  });

  test('g∘f becomes injective although g is not, and that ticks the composition task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-6b');
    await fig.getByRole('button', { name: 'הרכבה' }).click();
    const comp = fig.locator('[data-readout="compose"]');
    await expect(comp).toContainText(/g∘f⁩? אינה חד-חד-ערכית/);
    // f: 1 → a, 2 → b. Re-aim 2 at c, which g sends to q.
    await keys(page, 'fig-0-6b', ['ArrowDown', 'Enter', 'ArrowRight', 'Enter', 'ArrowLeft', 'Enter', 'ArrowRight', 'ArrowDown', 'Enter']);
    await expect(comp).toContainText(/g∘f⁩? חד-חד-ערכית/);
    await expect(comp).toContainText(/g⁩? אינה חד-חד-ערכית/);
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-6b:composition']).toBeTruthy();
  });

  test('a text step never ticks a task, even the step that shows the flipped bijection', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-0-6b"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const t = (await progress(page))?.tasks ?? {};
    expect(t['fig-0-6b:bijection-invert']).toBeFalsy();
    expect(t['fig-0-6b:composition']).toBeFalsy();
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-0.6-operations', 'Q-0.6-domain-image', 'Q-0.6-injective-definition', 'Q-0.6-compose', 'Q-0.6-inverse-value', 'Q-0.6-inverse-exists']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-0-6-"]');
    await expect(examples).toHaveCount(6);
    await expect(examples.first().locator('details').first()).not.toHaveAttribute('open', '');
  });

  test('every misconception anchor of the lesson exists on the page', async ({ page }) => {
    await page.goto(LESSON);
    for (const a of ['set-operations', 'de-morgan', 'double-inclusion', 'domain-codomain-image', 'injective', 'injective-onto', 'formula-not-function', 'inverse-theorem', 'composition', 'not-reciprocal', 'restrict', 'hotel-back']) {
      await expect(page.locator(`[id="${a}"]`)).toHaveCount(1);
    }
  });
});
