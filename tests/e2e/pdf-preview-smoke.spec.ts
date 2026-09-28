import { expect, test } from '@playwright/test';

test.describe('Vercel PDF preview smoke', () => {
  test('does not show server PDF worker/polyfill errors', async ({ page }) => {
    const targetUrl = process.env.VERCEL_PDF_PREVIEW_URL;
    test.skip(!targetUrl, 'Set VERCEL_PDF_PREVIEW_URL to run this deployment smoke test.');

    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    await page.goto(targetUrl!, { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toBeVisible();

    const joinedErrors = errors.join('\n');
    expect(joinedErrors).not.toContain('DOMMatrix');
    expect(joinedErrors).not.toContain('Setting up fake worker failed');
    expect(joinedErrors).not.toContain('pdf.worker.mjs');
  });
});
