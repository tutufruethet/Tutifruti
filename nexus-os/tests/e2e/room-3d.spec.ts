import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { appWindow, bounds, dragTitle, launch, terminalText, typeInTerminal, waitForDesktop } from './helpers';

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
  await waitForDesktop(page);
}

async function waitForPhase(page: Page, phase: 'free' | 'focused') {
  await page.waitForFunction((wanted) => window.__nexus?.phase() === wanted, phase, { timeout: 45_000 });
}

async function focusMonitor(page: Page) {
  await page.keyboard.press('f');
  await waitForPhase(page, 'focused');
}

test.describe('quarto 3D', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mode=3d&debug');
    await waitForScene(page);
  });

  test('o DOM do OS cobre exatamente a tela do monitor', async ({ page }) => {
    const os = page.locator('[data-os-root][data-os-viewport="fixed"]');
    expect(await os.evaluate((el) => [(el as HTMLElement).offsetWidth, (el as HTMLElement).offsetHeight])).toEqual([
      1280, 800,
    ]);

    const { screen, dom } = await page.evaluate(() => {
      const root = document.querySelector('[data-os-root]');
      return { screen: window.__nexus?.screenRect() ?? null, dom: root?.getBoundingClientRect().toJSON() };
    });
    expect(screen).not.toBeNull();
    const tolerance = (screen!.right - screen!.left) * 0.02;
    expect(Math.abs(dom.left - screen!.left)).toBeLessThan(tolerance);
    expect(Math.abs(dom.right - screen!.right)).toBeLessThan(tolerance);
    expect(Math.abs(dom.top - screen!.top)).toBeLessThan(tolerance);
    expect(Math.abs(dom.bottom - screen!.bottom)).toBeLessThan(tolerance);
  });

  test('no monitor: abrir o Terminal pelo menu e digitar sem mexer na câmera', async ({ page }) => {
    await focusMonitor(page);
    const viewport = page.viewportSize()!;
    const osBox = (await page.locator('[data-os-root]').boundingBox())!;
    expect(Math.max(osBox.width / viewport.width, osBox.height / viewport.height)).toBeGreaterThan(0.8);

    await launch(page, 'term');
    await expect(page.getByTestId('launcher')).toHaveCount(0);
    await page.getByTestId('terminal-app').click();
    await expect.poll(() => terminalText(page)).toContain('nexus:~$');

    // "f" e Esc digitados no OS não podem tirar a câmera do monitor.
    await typeInTerminal(page, 'echo foco');
    await typeInTerminal(page, 'pwd');
    await page.keyboard.press('Escape');
    await expect.poll(() => terminalText(page)).toContain('/home/nexus');
    expect(await page.evaluate(() => window.__nexus?.focused())).toBe(true);
  });

  test('arrastar uma janela no monitor converte px da tela em px do OS', async ({ page }) => {
    await focusMonitor(page);
    await page.getByTestId('desktop-icon-settings').click();
    const win = appWindow(page, 'settings');
    await expect(win).toBeVisible();

    const scale = await page
      .locator('[data-os-root]')
      .evaluate((el) => el.getBoundingClientRect().width / (el as HTMLElement).offsetWidth);
    const before = await bounds(win);
    await dragTitle(page, win, 100, 40);
    const after = await bounds(win);
    expect(Math.abs(after.x - before.x - 100 / scale)).toBeLessThanOrEqual(3);
    expect(Math.abs(after.y - before.y - 40 / scale)).toBeLessThanOrEqual(3);
  });

  test('janelas abertas no monitor continuam lá no desktop 2D', async ({ page }) => {
    await focusMonitor(page);
    await page.getByTestId('desktop-icon-files').click();
    await expect(appWindow(page, 'files')).toBeVisible();

    await page.getByTestId('leave-monitor').click();
    await waitForPhase(page, 'free');
    await page.getByRole('button', { name: 'Desktop 2D' }).click();
    await expect(page.locator('[data-os-root][data-os-viewport="fluid"]')).toBeVisible();
    await expect(appWindow(page, 'files')).toBeVisible();
    await expect(page.getByTestId('files-app').locator('[data-name="LEIA-ME.md"]')).toBeVisible();
  });

  test('clicar no monitor também foca', async ({ page }) => {
    await page.getByTestId('taskbar').click();
    await waitForPhase(page, 'focused');
  });

  test('trocar a qualidade recria o canvas com o preset escolhido', async ({ page }) => {
    await page.getByTestId('quality-select').selectOption('low');
    await expect(page.locator('[data-quality="low"]')).toBeAttached();
    await page.waitForFunction(() => window.__nexus?.ready === true);
  });
});
