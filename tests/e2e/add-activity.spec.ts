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
  await dialog.getByLabel('End time').fill('10:00');
  await dialog.getByRole('button', { name: 'Save activity' }).click();
  await expect(dialog.getByText("Start and end time can't be the same.")).toBeVisible();

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

/** Yesterday as YYYY-MM-DD in the browser's timezone, plus whether it's in the previous month. */
async function browserYesterday(page: Page) {
  return page.evaluate(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { iso, day: d.getDate(), previousMonth: d.getMonth() !== now.getMonth() };
  });
}

async function openHistoryDay(page: Page, day: number, previousMonth: boolean) {
  await page.goto('/history');
  if (previousMonth) await page.getByRole('button', { name: 'Previous month' }).click();
  await page.getByRole('button', { name: String(day), exact: true }).click();
}

test('an activity from 21:00 yesterday to 01:00 today is split across both days (Requirement.txt bug)', async ({
  page,
}) => {
  const yesterday = await browserYesterday(page);

  await page.getByRole('button', { name: '+ Add Activity' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Start date')).not.toHaveValue('');
  await dialog.getByLabel('What did you do?').fill('Sleep');
  await dialog.getByLabel('Start date').fill(yesterday.iso);
  await dialog.getByLabel('Start time').fill('21:00');
  await dialog.getByLabel('End time').fill('01:00');
  await expect(dialog.getByText('4h · ends next day')).toBeVisible();
  await dialog.getByRole('button', { name: 'Save activity' }).click();
  await expect(dialog).toBeHidden();

  // Home (today) only counts the 1h after midnight.
  const todayRow = timeline(page).locator('li').filter({ hasText: 'Sleep' });
  await expect(todayRow.getByText(/00:00–01:00 · from previous day/)).toBeVisible();
  await expect(todayRow.getByText('1h', { exact: true })).toBeVisible();

  // History (yesterday) counts the 3h before midnight.
  await openHistoryDay(page, yesterday.day, yesterday.previousMonth);
  const yesterdayRow = timeline(page).locator('li').filter({ hasText: 'Sleep' });
  await expect(yesterdayRow.getByText(/21:00–00:00 · continues next day/)).toBeVisible();
  await expect(yesterdayRow.getByText('3h', { exact: true })).toBeVisible();

  // Edit from today's half opens the whole span.
  await page.goto('/');
  await timeline(page)
    .locator('li')
    .filter({ hasText: 'Sleep' })
    .getByRole('button', { name: 'Edit' })
    .click();
  const editDialog = page.getByRole('dialog');
  await expect(editDialog.getByRole('heading', { name: 'Edit activity' })).toBeVisible();
  await expect(editDialog.getByLabel('Start date')).toHaveValue(yesterday.iso);
  await expect(editDialog.getByLabel('Start time')).toHaveValue('21:00');
  await expect(editDialog.getByLabel('End time')).toHaveValue('01:00');
  await editDialog.getByRole('button', { name: 'Cancel' }).click();

  // Delete from today removes both halves, and they stay gone after reload.
  await timeline(page)
    .locator('li')
    .filter({ hasText: 'Sleep' })
    .getByRole('button', { name: 'Delete' })
    .click();
  const confirmDialog = page.getByRole('dialog');
  await expect(confirmDialog.getByText(/this removes both days/)).toBeVisible();
  await confirmDialog.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Sleep')).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('Sleep')).toHaveCount(0);
  await openHistoryDay(page, yesterday.day, yesterday.previousMonth);
  await expect(page.getByRole('heading', { name: 'No activities yet today' })).toBeVisible();
  await expect(page.getByText('Sleep')).toHaveCount(0);
});

test('editing a span back to a same-day time leaves a single row', async ({ page }) => {
  const yesterday = await browserYesterday(page);
  await page.getByRole('button', { name: '+ Add Activity' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('What did you do?').fill('Late study');
  await dialog.getByLabel('Start date').fill(yesterday.iso);
  await dialog.getByLabel('Start time').fill('22:00');
  await dialog.getByLabel('End time').fill('00:30');
  await dialog.getByRole('button', { name: 'Save activity' }).click();
  await expect(dialog).toBeHidden();

  await timeline(page)
    .locator('li')
    .filter({ hasText: 'Late study' })
    .getByRole('button', { name: 'Edit' })
    .click();
  const editDialog = page.getByRole('dialog');
  await editDialog.getByLabel('End time').fill('23:30');
  await expect(editDialog.getByText('1h 30m', { exact: true })).toBeVisible();
  await editDialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(editDialog).toBeHidden();

  await page.reload();
  await expect(page.getByText('Late study')).toHaveCount(0);
  await openHistoryDay(page, yesterday.day, yesterday.previousMonth);
  const row = timeline(page).locator('li').filter({ hasText: 'Late study' });
  await expect(row).toHaveCount(1);
  await expect(row.getByText(/22:00–23:30$/)).toBeVisible();
});

test('21:00 to 00:00 is one row ending at midnight, with no next-day row', async ({ page }) => {
  const yesterday = await browserYesterday(page);
  await page.getByRole('button', { name: '+ Add Activity' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('What did you do?').fill('Movie');
  await dialog.getByLabel('Start date').fill(yesterday.iso);
  await dialog.getByLabel('Start time').fill('21:00');
  await dialog.getByLabel('End time').fill('00:00');
  await expect(dialog.getByText('3h', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Save activity' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole('heading', { name: 'No activities yet today' })).toBeVisible();
  await openHistoryDay(page, yesterday.day, yesterday.previousMonth);
  const row = timeline(page).locator('li').filter({ hasText: 'Movie' });
  await expect(row.getByText(/21:00–00:00$/)).toBeVisible();
});
