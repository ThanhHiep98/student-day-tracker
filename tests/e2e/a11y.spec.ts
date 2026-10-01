import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sdt-install-dismissed', '1');
  });
});

for (const path of ['/', '/history', '/insights']) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations).toEqual([]);
  });
}

test('Home has no accessibility violations with the Add Activity dialog open', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ Add Activity' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});

test('Home has no accessibility violations with an inline validation error showing', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ Add Activity' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Save activity' }).click();
  await expect(dialog.getByText('Name is required.')).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});

test('/insights has no accessibility violations with demo data', async ({ page }) => {
  await page.goto('/insights');
  await expect(page.getByText('Demo data')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Weekly overview' })).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});

test('/insights has no accessibility violations in its empty state', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sdt-demo-dismissed', '1');
  });
  await page.goto('/insights');
  await expect(page.getByRole('heading', { name: 'Nothing tracked this week yet' })).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});
