import { type Page, expect, test } from '@playwright/test';

/**
 * Add / Edit / Delete Activity and "+ New category" write to Dexie
 * (plans/2026-09-26-add-activity.html §2), so every flow is asserted again
 * after page.reload() to prove persistence.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sdt-install-dismissed', '1');
    localStorage.setItem('sdt-demo-dismissed', '1');
  });
  await page.goto('/');
});

async function addActivity(page: Page, name: string, start: string, end: string) {
  await page.getByRole('button', { name: '+ Add Activity' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Add activity' })).toBeVisible();
  await dialog.getByLabel('What did you do?').fill(name);
  await dialog.getByLabel('Start time').fill(start);
  await dialog.getByLabel('End time').fill(end);
  await dialog.getByRole('button', { name: 'Save activity' }).click();
  await expect(dialog).toBeHidden();
}

const timeline = (page: Page) => page.getByRole('region', { name: "Today's timeline" });

test('an added activity persists in the timeline and daily summary across reload', async ({
  page,
}) => {
  await addActivity(page, 'Deep work session', '09:00', '10:30');
  await expect(timeline(page).getByText('Deep work session')).toBeVisible();
  await expect(timeline(page).getByText('1h 30m')).toBeVisible();

  await page.reload();

  await expect(timeline(page).getByText('Deep work session')).toBeVisible();
  await expect(timeline(page).getByText('1h 30m')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await expect(page.getByText('1h 30m').first()).toBeVisible();
});

test('shows each builder validation message inline and keeps the dialog open', async ({ page }) => {
  await page.getByRole('button', { name: '+ Add Activity' }).click();
  const dialog = page.getByRole('dialog');

  await dialog.getByRole('button', { name: 'Save activity' }).click();
  await expect(dialog.getByText('Name is required.')).toBeVisible();

  await dialog.getByLabel('What did you do?').fill('Bad timing');
  await dialog.getByLabel('Start time').fill('10:00');
  await dialog.getByLabel('End time').fill('09:00');
  await dialog.getByRole('button', { name: 'Save activity' }).click();
  await expect(dialog.getByText('End time must be after start time.')).toBeVisible();

  await dialog.getByLabel('End time').fill('');
  await dialog.getByRole('button', { name: 'Save activity' }).click();
  await expect(dialog.getByText('Enter a valid start and end time.')).toBeVisible();
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'No activities yet today' })).toBeVisible();
});

test('a custom category is auto-selected, persists across reload, and renders in the timeline', async ({
  page,
}) => {
  await page.getByRole('button', { name: '+ Add Activity' }).click();
  const dialog = page.getByRole('dialog');

  await dialog.getByRole('button', { name: '+ New' }).click();
  await dialog.getByLabel('New category name').fill('Volunteering');
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(dialog.getByRole('option', { name: /Volunteering/ })).toBeAttached();
  await expect(dialog.getByLabel('Category')).toHaveValue(
    (await dialog.getByRole('option', { name: /Volunteering/ }).getAttribute('value')) ?? ''
  );

  await dialog.getByLabel('What did you do?').fill('Beach cleanup');
  await dialog.getByLabel('Start time').fill('08:00');
  await dialog.getByLabel('End time').fill('09:00');
  await dialog.getByRole('button', { name: 'Save activity' }).click();

  await page.reload();

  const row = timeline(page).locator('li').filter({ hasText: 'Beach cleanup' });
  await expect(row).toBeVisible();
  await expect(row.getByText(/Volunteering/)).toBeVisible();
  await expect(row.getByText('🏷️')).toBeVisible();

  await page.getByRole('button', { name: '+ Add Activity' }).click();
  await expect(
    page.getByRole('dialog').getByRole('option', { name: /Volunteering/ })
  ).toBeAttached();
});

test('duplicate or empty category names show an inline error (case-insensitive)', async ({
  page,
}) => {
  await page.getByRole('button', { name: '+ Add Activity' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '+ New' }).click();

  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog.getByText('Category name is required.')).toBeVisible();

  await dialog.getByLabel('New category name').fill('work');
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog.getByText('That category already exists.')).toBeVisible();
  await expect(dialog.getByRole('option', { name: /work/i })).toHaveCount(1);
});

test('editing persists across reload and replaces the old name', async ({ page }) => {
  await addActivity(page, 'Read a book', '20:00', '20:30');

  const row = timeline(page).locator('li').filter({ hasText: 'Read a book' });
  await row.getByRole('button', { name: 'Edit' }).click();

  const editDialog = page.getByRole('dialog');
  await expect(editDialog.getByRole('heading', { name: 'Edit activity' })).toBeVisible();
  await editDialog.getByLabel('What did you do?').fill('Read a novel');
  await editDialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(timeline(page).getByText('Read a novel')).toBeVisible();

  await page.reload();

  await expect(timeline(page).getByText('Read a novel')).toBeVisible();
  await expect(page.getByText('Read a book')).toHaveCount(0);
  await expect(timeline(page).locator('li')).toHaveCount(1);
});

test('deleting via the confirm dialog persists across reload', async ({ page }) => {
  await addActivity(page, 'Short nap', '13:00', '13:20');

  const row = timeline(page).locator('li').filter({ hasText: 'Short nap' });
  await row.getByRole('button', { name: 'Delete' }).click();

  const confirmDialog = page.getByRole('dialog');
  await expect(confirmDialog.getByRole('heading', { name: 'Delete this activity?' })).toBeVisible();
  await confirmDialog.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Short nap')).toHaveCount(0);

  await page.reload();

  await expect(page.getByText('Short nap')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'No activities yet today' })).toBeVisible();
});
