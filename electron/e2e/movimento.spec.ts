import { _electron as electron } from '@playwright/test';
import { test, expect } from '@playwright/test';
import path from 'node:path';

// Requires: pnpm run build (electron-forge build) before running.
// Script: pnpm run test:e2e

const APP_ROOT = path.join(__dirname, '..');

test('inserimento movimento → riga visibile in tabella', async () => {
  const app = await electron.launch({
    args: [APP_ROOT],
    env: { ...process.env, NODE_ENV: 'test' },
  });

  try {
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // Naviga alla tab Movimenti (tab chip nella ResocontoLayout)
    await page.click('text=Movimenti');
    await page.waitForTimeout(300);

    // Clicca "Nuovo movimento"
    await page.click('button[aria-label="Nuovo movimento"]');

    // Verifica dialog aperta
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Compila il form
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[name="data"]', today);
    await page.selectOption('[name="tipo"]', 'uscita');
    await page.fill('[name="importo"]', '42.50');
    await page.fill('[name="nota"]', 'Playwright E2E test');

    // Salva
    await page.click('button:has-text("Salva")');

    // Dialog chiusa
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

    // Riga appare in tabella
    await expect(
      page.locator('.ag-cell-value', { hasText: 'Playwright E2E test' }),
    ).toBeVisible({ timeout: 5000 });
  } finally {
    await app.close();
  }
});

test('doppio click su riga apre dialog in modifica', async () => {
  const app = await electron.launch({
    args: [APP_ROOT],
    env: { ...process.env, NODE_ENV: 'test' },
  });

  try {
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    // Crea prima un movimento
    await page.click('text=Movimenti');
    await page.waitForTimeout(300);
    await page.click('button[aria-label="Nuovo movimento"]');
    await page.fill('[name="data"]', new Date().toISOString().split('T')[0]);
    await page.fill('[name="importo"]', '10.00');
    await page.click('button:has-text("Salva")');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

    // Doppio click sulla prima riga AG Grid
    await page.locator('.ag-row').first().dblclick();

    // Dialog in modalità modifica con dati precompilati
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('#dialog-title')).toHaveText('Modifica movimento');
    await expect(page.locator('[name="importo"]')).toHaveValue('10');
    await expect(page.locator('[name="data"]')).toHaveValue(new Date().toISOString().split('T')[0]);
    await expect(page.locator('[name="tipo"]')).toHaveValue('uscita');
  } finally {
    await app.close();
  }
});
