import type { Locator, Page } from '@playwright/test';
import { expect } from './fixtures';

export async function waitForDesktop(page: Page) {
  await page.waitForSelector('[data-desktop-ready]', { timeout: 30_000 });
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
