import { expect, test, type Locator, type Page } from '@playwright/test';
import { freezeSteps, hydrated, inked, progress } from './helpers';

const LESSON = '/lessons/0-3/';

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
 * Click the grid point (x, y) of a 6 × 6 QuantifierGame, through the keyboard: the canvas takes focus, the arrows
 * move the cursor from wherever it is to (x, y), and Enter plays it. Independent of the canvas layout.
 */
async function playPoint(fig: Locator, x: number, y: number) {
  const c = fig.locator('canvas');
  await c.focus();
  for (let i = 0; i < 6; i++) await c.press('ArrowLeft');
  for (let i = 0; i < 6; i++) await c.press('ArrowDown');
  for (let i = 1; i < x; i++) await c.press('ArrowRight');
  for (let i = 1; i < y; i++) await c.press('ArrowUp');
  await c.press('Enter');
}

const pickOrder = (fig: Locator, label: string) => fig.getByRole('button', { name: label, exact: true }).click();
const pickRel = (fig: Locator, label: string) => fig.getByRole('button', { name: label }).first().click();

test.describe('lesson 0.3: quantifiers and negation', () => {
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

  test('∀x ∃y on "mother": the figure picks x, answering with the mother wins and ticks the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-3a');
    const status = fig.locator('[data-readout="status"]');
    await expect(status).toContainText('המחשב בחר');
    // the figure's first move is a column x; the mother of x is MOTHER[x − 1] (src/math/quantifiers.ts)
    const MOTHER = [2, 5, 2, 1, 6, 5];
    const x = Number((await status.innerText()).match(/x = (\d)/)?.[1]);
    expect(x).toBeGreaterThanOrEqual(1);
    await playPoint(fig, x, MOTHER[x - 1]);
    await expect(status).toContainText('ניצחתם');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-3a:win-forall-exists']).toBeTruthy();
  });

  test('∃y ∀x on "mother": every y the student picks loses, and three of them tick the task', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-3a');
    await pickOrder(fig, '∃y ∀x');
    const status = fig.locator('[data-readout="status"]');
    for (const y of [1, 2, 5]) {
      await playPoint(fig, 1, y);
      await expect(status).toContainText('המחשב ניצח');
      await fig.getByRole('button', { name: 'סיבוב חדש' }).click();
    }
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-3a:lose-exists-forall']).toBeTruthy();
  });

  test('∃y ∀x on "master key": the master key y = 4 wins whatever lock the figure picks', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-3a');
    await pickRel(fig, 'מפתח ראשי');
    await pickOrder(fig, '∃y ∀x');
    await playPoint(fig, 3, 4);
    await expect(fig.locator('[data-readout="status"]')).toContainText('ניצחתם');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-3a:win-exists-forall']).toBeTruthy();
    await fig.getByRole('button', { name: 'הראו את התשובה' }).click();
    await expect(fig.locator('[data-readout="verdict"]')).toContainText('הטענה נכונה');
  });

  test('as refuter of ∀x ∃y on "y > x" the negation is shown, and x = 6 wins', async ({ page }) => {
    await page.goto(LESSON);
    const fig = await ready(page, 'fig-0-3b');
    await pickRel(fig, 'y > x');
    // the ∀ sits in a <bdi>, and the accessible name gains spaces at its edges: "אתם מפריכים ( ∀ )"
    await fig.getByRole('button', { name: /^אתם מפריכים/ }).click();
    await expect(fig.locator('[data-readout="negation"]')).toContainText('∃x ∀y: ¬R(x,y)');
    await playPoint(fig, 6, 1);
    await expect(fig.locator('[data-readout="status"]')).toContainText('ניצחתם');
    await expect.poll(async () => (await progress(page))?.tasks?.['fig-0-3b:negate']).toBeTruthy();
  });

  test('a text step never ticks a task', async ({ page }) => {
    await page.goto(LESSON);
    for (const step of await page.locator('.step[data-fig="fig-0-3a"], .step[data-fig="fig-0-3b"]').all()) {
      await step.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(400);
    const tasks = (await progress(page))?.tasks ?? {};
    expect(Object.keys(tasks).filter((k) => k.startsWith('fig-0-3'))).toEqual([]);
  });

  test('the Check has the six bank questions, and worked solutions stay closed until opened', async ({ page }) => {
    await page.goto(LESSON);
    for (const id of ['Q-0.3-translate-root', 'Q-0.3-negate-everyone', 'Q-0.3-negation-true', 'Q-0.3-hidden-quantifier', 'Q-0.3-negate-domain', 'Q-0.3-order-matters']) {
      await expect(page.locator(`[data-qid="${id}"]`)).toHaveCount(1);
    }
    const examples = page.locator('[id^="ex-0-3-"]');
    await expect(examples).toHaveCount(6);
    await expect(examples.first().locator('details').first()).not.toHaveAttribute('open', '');
  });
});
