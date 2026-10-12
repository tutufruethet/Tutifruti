import { expect, test } from './fixtures';
import { appWindow, bounds, dragTitle, launch, terminalText, typeInTerminal, waitForDesktop } from './helpers';

test.describe('desktop 2D', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mode=2d');
    await waitForDesktop(page);
  });

  test('boot e entrada como convidado avisam que nada é salvo', async ({ page }) => {
    await expect(page.getByTestId('toasts')).toContainText('Modo convidado');
    await page.getByTestId('notifications-button').click();
    const center = page.getByTestId('notification-center');
    await expect(center).toContainText('Nada é salvo');
    expect(await center.evaluate((el) => el.closest('[data-os-portal]') !== null)).toBe(true);
  });

  test('Files e Terminal compartilham o mesmo sistema de arquivos', async ({ page }) => {
    await launch(page, 'files');
    const files = page.getByTestId('files-app');
    await expect(files.locator('[data-name="LEIA-ME.md"]')).toBeVisible();

    await page.getByTestId('files-new-folder').click();
    await page.getByTestId('files-draft-input').fill('Projetos');
    await page.getByTestId('files-draft-input').press('Enter');
    await expect(files.locator('[data-name="Projetos"]')).toBeVisible();

    await launch(page, 'term');
    await page.getByTestId('terminal-app').click();
    await expect.poll(() => terminalText(page)).toContain('nexus:~$');
    await typeInTerminal(page, 'ls');
    await expect.poll(() => terminalText(page)).toContain('Projetos/');

    await typeInTerminal(page, 'mkdir criada-no-terminal');
    await expect(files.locator('[data-name="criada-no-terminal"]')).toBeVisible();
  });

  test('janelas: arrastar, maximizar, minimizar, restaurar e fechar', async ({ page }) => {
    await page.getByTestId('desktop-icon-settings').click();
    const win = appWindow(page, 'settings');
    await expect(win).toBeVisible();

    const before = await bounds(win);
    await dragTitle(page, win, 120, 60);
    const after = await bounds(win);
    expect(Math.abs(after.x - before.x - 120)).toBeLessThanOrEqual(2);
    expect(Math.abs(after.y - before.y - 60)).toBeLessThanOrEqual(2);

    await win.locator('header').dblclick();
    await expect(win).toHaveAttribute('data-display', 'maximized');
    await win.getByRole('button', { name: 'Restaurar' }).click();
    await expect(win).toHaveAttribute('data-display', 'normal');

    await win.getByRole('button', { name: 'Minimizar' }).click();
    await expect(win).toHaveAttribute('data-display', 'minimized');
    const id = await win.getAttribute('data-window-id');
    await page.getByTestId(`taskbar-window-${id}`).click();
    await expect(win).toHaveAttribute('data-display', 'normal');

    await win.locator('header h2').click();
    await page.keyboard.press('Alt+w');
    await expect(page.locator('[data-app-id="settings"]')).toHaveCount(0);
  });

  test('Notes salva sozinho e acha pela busca', async ({ page }) => {
    await page.getByTestId('desktop-icon-notes').click();
    await page.getByTestId('notes-new').click();
    await page.getByTestId('notes-body').fill('texto do teste automático');
    await expect(page.getByTestId('notes-status')).toHaveText('Salvo', { timeout: 5000 });

    await appWindow(page, 'notes').getByRole('button', { name: 'Fechar' }).click();
    await page.getByTestId('desktop-icon-notes').click();
    await page.getByTestId('notes-search').fill('automatico');
    await page.getByRole('list', { name: 'Notas' }).getByRole('button', { name: /Nova nota/ }).click();
    await expect(page.getByTestId('notes-body')).toHaveValue('texto do teste automático');
  });

  test('menu de apps abre com Ctrl/⌘ K e calendário fica dentro do OS', async ({ page }) => {
    await page.getByTestId('desktop-icon-files').click();
    await page.getByTestId('files-search').click();
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByTestId('launcher')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByTestId('clock-button').click();
    const calendar = page.getByTestId('calendar');
    await expect(calendar).toBeVisible();
    expect(await calendar.evaluate((el) => el.closest('[data-os-portal]') !== null)).toBe(true);
  });

  test('em 375px, janelas ocupam a tela e não há rolagem horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByTestId('desktop-icon-files').click();
    await expect(appWindow(page, 'files')).toHaveAttribute('data-display', 'maximized');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
