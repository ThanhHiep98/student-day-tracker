import { type Page, expect, test } from '@playwright/test';
import { signInAs, skipOnboarding } from './support/emulator';

/**
 * ADR-008 — onboarding habit questionnaire, against the Auth + Firestore
 * emulators. Screens ①–⑨ refer to architecture/assets/adr-008/*.webp.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sdt-install-dismissed', '1'));
});

const welcome = (page: Page) => page.getByRole('heading', { name: /Let's set up your day/ });
const greeting = (page: Page) =>
  page.getByRole('heading', { name: /good (morning|afternoon|evening)/i });

async function freshSignIn(page: Page) {
  await page.goto('/');
  return signInAs(page, { waitForHome: false });
}

test('a fresh account sees ① then walks Q1-Q5 to ⑦ and saves, no banner on Home', async ({
  page,
}) => {
  await freshSignIn(page);
  await expect(welcome(page)).toBeVisible();
  await expect(page.getByText('Sleep', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();

  await expect(page.getByText('Question 1 of 5')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'How much sleep do you want each night?' })
  ).toBeVisible();
  await expect(page.getByText('7h 30m').first()).toBeVisible();
  await expect(page.getByText('Wake-up time is worked out for you:')).toBeVisible();
  await expect(page.getByText('06:30')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await expect(page.getByText('Question 2 of 5')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'When are you at school?' })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await expect(page.getByText('Question 3 of 5')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await expect(page.getByText('Question 4 of 5')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await expect(page.getByText('Question 5 of 5')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'How much free time is OK for you?' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Review' }).click();

  await expect(page.getByRole('heading', { name: 'Your ideal school day' })).toBeVisible();
  await expect(page.getByText('Tight day:')).toBeVisible();
  await page.getByRole('button', { name: 'Save my plan' }).click();

  await expect(greeting(page)).toBeVisible();
  await expect(page.getByText('Finish setting up your day')).toHaveCount(0);
});

test('Skip for now at the welcome screen shows the Home banner, Continue resumes', async ({
  page,
}) => {
  await freshSignIn(page);
  await expect(welcome(page)).toBeVisible();
  await page.getByRole('button', { name: 'Skip for now' }).click();

  await expect(greeting(page)).toBeVisible();
  await expect(page.getByText('Finish setting up your day')).toBeVisible();
  const resume = page.getByRole('button', { name: 'Continue (1 of 5)' });
  await expect(resume).toBeVisible();
  await resume.click();

  await expect(
    page.getByRole('heading', { name: 'How much sleep do you want each night?' })
  ).toBeVisible();
});

test('skipping partway through resumes at the right question and the banner updates', async ({
  page,
}) => {
  await freshSignIn(page);
  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click(); // finishes Q1
  await expect(page.getByText('Question 2 of 5')).toBeVisible();
  await page.getByRole('button', { name: 'Skip for now' }).click();

  await expect(greeting(page)).toBeVisible();
  const resume = page.getByRole('button', { name: 'Continue (2 of 5)' });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(page.getByText('Question 2 of 5')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'When are you at school?' })).toBeVisible();
});

test('Habits & goals ⑨: editing a value persists after reload and completes onboarding', async ({
  page,
}) => {
  await freshSignIn(page);
  await skipOnboarding(page);
  await expect(greeting(page)).toBeVisible();
  await expect(page.getByText('Finish setting up your day')).toBeVisible();

  await page.getByRole('button', { name: /Minh Anh/ }).click();
  await page.getByRole('link', { name: 'Habits & goals' }).click();
  await expect(page.getByRole('heading', { name: 'Habits & goals' })).toBeVisible();

  await page.getByLabel('Target').fill('8');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Target')).toHaveValue('8');

  // Saving from the Habits & goals page marks onboarding completed — the
  // Home banner is gone.
  await page.getByRole('link', { name: 'Home' }).click();
  await expect(greeting(page)).toBeVisible();
  await expect(page.getByText('Finish setting up your day')).toHaveCount(0);
});

test('Re-run questionnaire from Habits & goals reopens the wizard', async ({ page }) => {
  await freshSignIn(page);
  await skipOnboarding(page);
  await page.getByRole('button', { name: /Minh Anh/ }).click();
  await page.getByRole('link', { name: 'Habits & goals' }).click();
  await page.getByRole('button', { name: 'Re-run questionnaire' }).click();
  await expect(welcome(page)).toBeVisible();
});

test('offline: saving the plan works and persists after reconnecting', async ({
  page,
  context,
}) => {
  await freshSignIn(page);
  await page.getByRole('button', { name: 'Start' }).click();
  await context.setOffline(true);

  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Review' }).click();
  await page.getByRole('button', { name: 'Save my plan' }).click();
  await expect(greeting(page)).toBeVisible();

  await context.setOffline(false);
  await page.reload();
  await expect(greeting(page)).toBeVisible();
  await expect(page.getByText('Finish setting up your day')).toHaveCount(0);
});
