import { expect, test } from './fixtures';
import { appWindow, createProfile, newFolder, signOut, waitForDesktop } from './helpers';

/** Espera as gravações (salvamento com atraso de 400 ms + IndexedDB). */
async function waitForSaves(page: import('@playwright/test').Page) {
  await page.waitForTimeout(1200);
}

test.describe('sessão e persistência', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mode=2d');
  });

  test('perfil local: arquivos, wallpaper e janelas sobrevivem ao recarregar', async ({ page }) => {
    await createProfile(page, 'Ana');
    await page.getByTestId('desktop-icon-files').click();
    await newFolder(page, 'Projetos');
    await page.getByTestId('desktop-icon-settings').click();
    await page.getByTestId('wallpaper-void').click();
    await waitForSaves(page);

    await page.reload();
    // Sem tela de entrada: a sessão de Ana volta sozinha.
    await expect(page.locator('[data-desktop-ready]')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('login-screen')).toHaveCount(0);
    await expect(page.locator('[data-wallpaper="void"]')).toBeAttached();
    await expect(appWindow(page, 'settings')).toBeVisible();
    await expect(appWindow(page, 'files')).toBeVisible();
    await expect(page.getByTestId('files-app').locator('[data-name="Projetos"]')).toBeVisible();
  });

  test('sair, entrar como convidado e voltar ao perfil', async ({ page }) => {
    await createProfile(page, 'Bia');
    await page.getByTestId('desktop-icon-files').click();
    await newFolder(page, 'DaBia');
    await waitForSaves(page);

    await signOut(page);
    await expect(page.getByTestId('login-profile-Bia')).toBeVisible();
    await waitForDesktop(page); // entra como convidado
    await page.getByTestId('desktop-icon-files').click();
    await expect(page.getByTestId('files-app').locator('[data-name="LEIA-ME.md"]')).toBeVisible();
    await expect(page.getByTestId('files-app').locator('[data-name="DaBia"]')).toHaveCount(0);

    await signOut(page);
    await page.getByTestId('login-profile-Bia').click();
    await expect(page.locator('[data-desktop-ready]')).toBeVisible();
    await expect(page.getByTestId('files-app').locator('[data-name="DaBia"]')).toBeVisible();
  });

  test('bloquear com Alt+L e desbloquear sem perder as janelas', async ({ page }) => {
    await createProfile(page, 'Caio');
    await page.getByTestId('desktop-icon-notes').click();
    await page.getByTestId('notes-body').click();
    await page.keyboard.press('Alt+l');
    await expect(page.getByTestId('lock-screen')).toBeVisible();
    await page.getByTestId('unlock').click();
    await expect(page.getByTestId('lock-screen')).toHaveCount(0);
    await expect(appWindow(page, 'notes')).toBeVisible();
  });

  test('apagar os dados do perfil volta para a entrada sem o perfil', async ({ page }) => {
    await createProfile(page, 'Duda');
    await page.getByTestId('desktop-icon-settings').click();
    await page.getByTestId('delete-profile-data').click();
    await page.getByTestId('confirm-delete-profile').click();
    await expect(page.getByTestId('login-screen')).toBeVisible();
    await expect(page.getByTestId('login-profile-Duda')).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('login-screen')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('login-profile-Duda')).toHaveCount(0);
  });
});
