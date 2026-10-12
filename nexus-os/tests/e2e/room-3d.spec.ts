import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function waitForScene(page: Page) {
  await page.waitForFunction(() => window.__nexus?.ready === true, null, { timeout: 60_000 });
  // O OS montou no monitor e o Drei já aplicou a transformação 3D (largura projetada ≠ 1280).
  await page.waitForFunction(
    () => {
      const rect = document.querySelector('[data-os-viewport="fixed"]')?.getBoundingClientRect();
      return rect !== undefined && rect.width > 0 && Math.abs(rect.width - 1280) > 1;
    },
    null,
    { timeout: 30_000 },
  );
}

async function waitForPhase(page: Page, phase: 'free' | 'focused') {
  await page.waitForFunction((wanted) => window.__nexus?.phase() === wanted, phase, { timeout: 45_000 });
}

test.describe('quarto 3D', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mode=3d&debug');
    await waitForScene(page);
  });

  test('o DOM do OS cobre exatamente a tela do monitor', async ({ page }) => {
    const os = page.locator('[data-os-root][data-os-viewport="fixed"]');
    await expect(os).toBeAttached();
    expect(await os.evaluate((el) => [(el as HTMLElement).offsetWidth, (el as HTMLElement).offsetHeight])).toEqual([
      1280, 800,
    ]);

    const { screen, dom } = await page.evaluate(() => {
      const root = document.querySelector('[data-os-root]');
      return { screen: window.__nexus?.screenRect() ?? null, dom: root?.getBoundingClientRect().toJSON() };
    });
    expect(screen).not.toBeNull();
    const width = screen!.right - screen!.left;
    const tolerance = width * 0.02;
    expect(Math.abs(dom.left - screen!.left)).toBeLessThan(tolerance);
    expect(Math.abs(dom.right - screen!.right)).toBeLessThan(tolerance);
    expect(Math.abs(dom.top - screen!.top)).toBeLessThan(tolerance);
    expect(Math.abs(dom.bottom - screen!.bottom)).toBeLessThan(tolerance);
  });

  test('focar o monitor, digitar e abrir menu dentro dele; o estado sobrevive ao 2D', async ({ page }) => {
    await page.keyboard.press('f');
    await waitForPhase(page, 'focused');

    const viewport = page.viewportSize()!;
    const osBox = (await page.locator('[data-os-root]').boundingBox())!;
    expect(Math.max(osBox.width / viewport.width, osBox.height / viewport.height)).toBeGreaterThan(0.8);

    // Digitar "f" e Esc dentro do OS não pode mexer na câmera.
    await page.getByTestId('probe-input').click();
    await page.keyboard.type('fofo');
    await expect(page.getByTestId('probe-echo')).toHaveText('fofo');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => window.__nexus?.focused())).toBe(true);

    const trigger = page.getByTestId('probe-menu-trigger');
    await trigger.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    expect(await menu.evaluate((el) => el.closest('[data-os-portal]') !== null)).toBe(true);
    const triggerBox = (await trigger.boundingBox())!;
    const menuBox = (await menu.boundingBox())!;
    const gap = menuBox.y - (triggerBox.y + triggerBox.height);
    expect(Math.abs(menuBox.x - triggerBox.x)).toBeLessThan(24);
    expect(gap).toBeGreaterThan(-2);
    expect(gap).toBeLessThan(40);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();

    await page.getByTestId('leave-monitor').click();
    await waitForPhase(page, 'free');

    await page.getByRole('button', { name: 'Desktop 2D' }).click();
    await expect(page.locator('[data-os-root][data-os-viewport="fluid"]')).toBeVisible();
    await expect(page.getByTestId('probe-echo')).toHaveText('fofo');
  });

  test('clicar no monitor também foca', async ({ page }) => {
    await page.getByTestId('probe-input').click();
    await waitForPhase(page, 'focused');
  });

  test('trocar a qualidade recria o canvas com o preset escolhido', async ({ page }) => {
    await page.getByTestId('quality-select').selectOption('low');
    await expect(page.locator('[data-quality="low"]')).toBeAttached();
    await page.waitForFunction(() => window.__nexus?.ready === true);
  });
});
