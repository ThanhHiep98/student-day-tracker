import { expect, test } from '@playwright/test';

/**
 * Frontend phase (plans/2026-09-26-add-activity.html §1.1): Add/Edit/Delete
 * Activity and "+ New category" are session-local only — no Dexie write,
 * no persistence across reload. These tests exercise exactly that: the UI
 * flow within a single page session.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sdt-install-dismissed', '1');
  });
  await page.goto('/');
});

test('user can add an activity and see it on the timeline + daily summary', async ({ page }) => {
  await page.getByRole('button', { name: '+ Add Activity' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Add activity' })).toBeVisible();

  await dialog.getByLabel('What did you do?').fill('Deep work session');
  await dialog.getByLabel('Start time').fill('09:00');
  await dialog.getByLabel('End time').fill('10:30');
  await dialog.getByRole('button', { name: 'Save activity' }).click();

  await expect(dialog).toBeHidden();
  const timeline = page.getByRole('region', { name: "Today's timeline" });
  await expect(timeline.getByText('Deep work session')).toBeVisible();
  await expect(timeline.getByText('1h 30m')).toBeVisible();
});

test('validates an empty name and an end time before the start time', async ({ page }) => {
  await page.getByRole('button', { name: '+ Add Activity' }).click();
  const dialog = page.getByRole('dialog');

  await dialog.getByRole('button', { name: 'Save activity' }).click();
  await expect(dialog.getByText('Name is required.')).toBeVisible();

  await dialog.getByLabel('What did you do?').fill('Bad timing');
  await dialog.getByLabel('Start time').fill('10:00');
  await dialog.getByLabel('End time').fill('09:00');
  await dialog.getByRole('button', { name: 'Save activity' }).click();
  await expect(dialog.getByText('End time must be after start time.')).toBeVisible();
});

test('user can create a custom category and use it immediately', async ({ page }) => {
  await page.getByRole('button', { name: '+ Add Activity' }).click();
  const dialog = page.getByRole('dialog');

  await dialog.getByRole('button', { name: '+ New' }).click();
  await dialog.getByLabel('New category name').fill('Volunteering');
  await dialog.getByRole('button', { name: 'Add' }).click();

  await expect(dialog.getByRole('option', { name: /Volunteering/ })).toBeAttached();

  await dialog.getByLabel('What did you do?').fill('Beach cleanup');
  await dialog.getByLabel('Start time').fill('08:00');
  await dialog.getByLabel('End time').fill('09:00');
  await dialog.getByRole('button', { name: 'Save activity' }).click();

  const timeline = page.getByRole('region', { name: "Today's timeline" });
  const row = timeline.locator('li').filter({ hasText: 'Beach cleanup' });
  await expect(row).toBeVisible();
  await expect(row.getByText('Volunteering')).toBeVisible();
});

test('user can edit and then delete an activity', async ({ page }) => {
  await page.getByRole('button', { name: '+ Add Activity' }).click();
  const addDialog = page.getByRole('dialog');
  await addDialog.getByLabel('What did you do?').fill('Read a book');
  await addDialog.getByLabel('Start time').fill('20:00');
  await addDialog.getByLabel('End time').fill('20:30');
  await addDialog.getByRole('button', { name: 'Save activity' }).click();

  const timeline = page.getByRole('region', { name: "Today's timeline" });
  await expect(timeline.getByText('Read a book')).toBeVisible();

  const row = timeline.locator('li').filter({ hasText: 'Read a book' });
  await row.getByRole('button', { name: 'Edit' }).click();

  const editDialog = page.getByRole('dialog');
  await expect(editDialog.getByRole('heading', { name: 'Edit activity' })).toBeVisible();
  await editDialog.getByLabel('What did you do?').fill('Read a novel');
  await editDialog.getByRole('button', { name: 'Save changes' }).click();

  await expect(timeline.getByText('Read a novel')).toBeVisible();
  await expect(page.getByText('Read a book')).toHaveCount(0);

  const updatedRow = timeline.locator('li').filter({ hasText: 'Read a novel' });
  await updatedRow.getByRole('button', { name: 'Delete' }).click();

  const confirmDialog = page.getByRole('dialog');
  await expect(confirmDialog.getByRole('heading', { name: 'Delete this activity?' })).toBeVisible();
  await confirmDialog.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('Read a novel')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'No activities yet today' })).toBeVisible();
});
