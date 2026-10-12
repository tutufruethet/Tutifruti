import { test as base, expect } from '@playwright/test';

/** Falha o teste se a página lançar erro ou registrar `console.error`. */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, provide) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
      });
      await provide(errors);
      expect(errors, errors.join('\n')).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
