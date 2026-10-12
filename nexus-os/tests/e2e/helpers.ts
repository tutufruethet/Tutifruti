import type { Locator, Page } from '@playwright/test';
import { expect } from './fixtures';

/** Espera o desktop. Se a tela de entrada aparecer, entra como convidado. */
export async function waitForDesktop(page: Page) {
  const guest = page.getByTestId('login-guest');
  const ready = page.locator('[data-desktop-ready]');
  await expect(guest.or(ready)).toBeVisible({ timeout: 30_000 });
  if (await guest.isVisible()) await guest.click();
  await expect(ready).toBeVisible({ timeout: 30_000 });
}

/** Cria um perfil local na tela de entrada. */
export async function createProfile(page: Page, name: string) {
  const input = page.getByTestId('login-new-profile');
  await expect(input).toBeVisible({ timeout: 30_000 });
  await input.fill(name);
  await input.press('Enter');
  await expect(page.locator('[data-desktop-ready]')).toBeVisible({ timeout: 30_000 });
}

export async function signOut(page: Page) {
  await page.getByTestId('user-menu-button').click();
  await page.getByTestId('sign-out-button').click();
  await expect(page.getByTestId('login-screen')).toBeVisible();
}

export async function newFolder(page: Page, name: string) {
  await page.getByTestId('files-new-folder').click();
  await page.getByTestId('files-draft-input').fill(name);
  await page.getByTestId('files-draft-input').press('Enter');
  await expect(page.getByTestId('files-app').locator(`[data-name="${name}"]`)).toBeVisible();
}

/** Abre um app pelo menu de apps (busca + Enter). */
export async function launch(page: Page, query: string) {
  await page.getByTestId('launcher-button').click();
  const search = page.getByTestId('launcher-search');
  await expect(search).toBeVisible();
  await search.fill(query);
  await search.press('Enter');
}

export function appWindow(page: Page, appId: string): Locator {
  return page.locator(`[data-window-id][data-app-id="${appId}"]`).last();
}

export async function bounds(win: Locator) {
  const value = await win.getAttribute('data-bounds');
  const [x, y, width, height] = (value ?? '').split(',').map(Number);
  return { x: x ?? 0, y: y ?? 0, width: width ?? 0, height: height ?? 0 };
}

/** Arrasta a barra de título por (dx, dy) px da tela. */
export async function dragTitle(page: Page, win: Locator, dx: number, dy: number) {
  const header = win.locator('header');
  const box = (await header.boundingBox())!;
  const startX = box.x + box.width * 0.35;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx / 2, startY + dy / 2, { steps: 4 });
  await page.mouse.move(startX + dx, startY + dy, { steps: 4 });
  await page.mouse.up();
}

/** Texto visível do terminal (linhas do renderizador DOM do xterm). */
export async function terminalText(page: Page) {
  return (await page.locator('[data-testid="terminal-app"] .xterm-rows').last().textContent()) ?? '';
}

export async function typeInTerminal(page: Page, line: string) {
  await page.keyboard.type(line);
  await page.keyboard.press('Enter');
}
