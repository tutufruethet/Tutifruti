import { expect, test } from './fixtures';

test.describe('desktop 2D', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mode=2d');
    await expect(page.locator('[data-os-root][data-os-viewport="fluid"]')).toBeVisible();
  });

  test('teclado, menu, diálogo, dica e atalho ficam dentro do OS', async ({ page }) => {
    await page.getByTestId('probe-input').fill('nexus');
    await expect(page.getByTestId('probe-echo')).toHaveText('nexus');

    await page.getByTestId('probe-menu-trigger').click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    expect(await menu.evaluate((el) => el.closest('[data-os-portal]') !== null)).toBe(true);
    await page.getByRole('menuitem', { name: 'Beta' }).click();
    await expect(page.getByTestId('probe-menu-value')).toHaveText('Beta');

    await page.getByTestId('probe-dialog-trigger').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => el.closest('[data-os-portal]') !== null)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await page.getByTestId('probe-tooltip-trigger').hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    expect(await tooltip.evaluate((el) => el.closest('[data-os-portal]') !== null)).toBe(true);

    await page.getByTestId('probe-input').focus();
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByTestId('probe-shortcut-count')).toHaveText('1');

    // Com o foco fora do OS (no HUD da página), o atalho não chega ao OS.
    await page.getByRole('button', { name: 'Desktop 2D' }).focus();
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByTestId('probe-shortcut-count')).toHaveText('1');
  });

  test('cabe em 375px sem rolagem horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByTestId('probe-input')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
