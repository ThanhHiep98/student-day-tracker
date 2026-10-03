import { expect, test } from '@playwright/test';
import { openSignedInWithGoals, seedActivities, setAiError, setAiReply } from './support/emulator';
import { sampleHabitGoals } from './support/sample-goals';

/**
 * F3 AI comments (ADR-009 §1.2 ⑦⑧⑨): consent → mocked Gemini comment shown
 * and cached, decline → rule-based, withdraw → rule-based again, offline →
 * fallback notice. The AI client is always mocked (`window.__sdtTest`,
 * emulator-only) — these tests never reach the real Gemini API.
 */

async function browserYesterday(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

/** One tracked, ended day — enough for `evaluateWeek`/`buildAiInput` to have something to say. */
async function seedOneTrackedDay(page: import('@playwright/test').Page, uid: string) {
  const yesterday = await browserYesterday(page);
  await seedActivities(uid, [
    {
      id: 'y-sleep',
      categoryId: 'sleep',
      name: 'Sleep',
      date: yesterday,
      startMinutes: 0,
      endMinutes: 378,
      createdAt: 1,
    },
    {
      id: 'y-entertainment',
      categoryId: 'entertainment',
      name: 'Gaming',
      date: yesterday,
      startMinutes: 500,
      endMinutes: 620,
      createdAt: 2,
    },
  ]);
}

test.describe('Insights — F3 AI comments', () => {
  test('consent → mocked comment shown and cached (second load makes no new call)', async ({
    page,
  }) => {
    const user = await openSignedInWithGoals(page, sampleHabitGoals(Date.now()));
    await seedOneTrackedDay(page, user.uid);
    await setAiReply(page, 'A mocked weekly summary of the tracked days.');

    await page.getByRole('link', { name: 'Insights' }).click();
    const card = page.getByRole('region', { name: 'Comments on your week' });
    await expect(card.getByText('AI comments are off')).toBeVisible();

    await card.getByRole('button', { name: 'Turn on' }).click();
    const consentDialog = page.getByRole('dialog', { name: 'Get AI comments on your days?' });
    await expect(consentDialog).toBeVisible();
    await consentDialog.getByRole('button', { name: 'Turn on AI comments' }).click();
    await expect(consentDialog).toBeHidden();

    await expect(card.getByText('✨ Gemini')).toBeVisible();
    await expect(card.getByText('A mocked weekly summary of the tracked days.')).toBeVisible();
    await expect(card.getByText(/Generated today/)).toBeVisible();
    await expect(card.getByText('Next update tomorrow')).toBeVisible();

    // Second load: even if the mock would now error, the cached text must
    // still show — proving no second call was made (D11).
    await setAiError(page);
    await page.reload();
    const reloaded = page.getByRole('region', { name: 'Comments on your week' });
    await expect(reloaded.getByText('A mocked weekly summary of the tracked days.')).toBeVisible();
    await expect(reloaded.getByText('✨ Gemini')).toBeVisible();
  });

  test('decline keeps rule-based comments and never calls the AI client', async ({ page }) => {
    const user = await openSignedInWithGoals(page, sampleHabitGoals(Date.now()));
    await seedOneTrackedDay(page, user.uid);
    await setAiError(page); // if this were ever called, the UI would show a fallback notice

    await page.getByRole('link', { name: 'Insights' }).click();
    const card = page.getByRole('region', { name: 'Comments on your week' });
    await card.getByRole('button', { name: 'Turn on' }).click();
    const consentDialog = page.getByRole('dialog', { name: 'Get AI comments on your days?' });
    await consentDialog.getByRole('button', { name: 'Not now — keep rule-based' }).click();
    await expect(consentDialog).toBeHidden();

    await expect(card.getByText('Rule-based', { exact: true })).toBeVisible();
    await expect(card.getByText('AI comments are off')).toBeVisible();
    await expect(card.getByText(/mock AI error/)).toHaveCount(0);
  });

  test('withdrawing from the account menu reverts to rule-based', async ({ page }) => {
    const user = await openSignedInWithGoals(page, sampleHabitGoals(Date.now()));
    await seedOneTrackedDay(page, user.uid);
    await setAiReply(page, 'A mocked weekly summary of the tracked days.');

    await page.getByRole('link', { name: 'Insights' }).click();
    const card = page.getByRole('region', { name: 'Comments on your week' });
    await card.getByRole('button', { name: 'Turn on' }).click();
    await page
      .getByRole('dialog', { name: 'Get AI comments on your days?' })
      .getByRole('button', { name: 'Turn on AI comments' })
      .click();
    await expect(card.getByText('✨ Gemini')).toBeVisible();

    await page.getByRole('button', { name: /Minh Anh/ }).click();
    const account = page.getByRole('dialog', { name: 'Account' });
    await account.getByRole('button', { name: /AI comments: On/ }).click();

    await expect(card.getByText('Rule-based', { exact: true })).toBeVisible();
    await expect(card.getByText('AI comments are off')).toBeVisible();
  });

  test('offline shows the fallback notice, not an error', async ({ page, context }) => {
    const user = await openSignedInWithGoals(page, sampleHabitGoals(Date.now()));
    await seedOneTrackedDay(page, user.uid);
    await setAiReply(page, 'Should never be shown, offline test.');

    await page.getByRole('link', { name: 'Insights' }).click();
    const card = page.getByRole('region', { name: 'Comments on your week' });
    await card.getByRole('button', { name: 'Turn on' }).click();
    await context.setOffline(true);
    await page
      .getByRole('dialog', { name: 'Get AI comments on your days?' })
      .getByRole('button', { name: 'Turn on AI comments' })
      .click();

    await expect(card.getByText(/AI comment unavailable offline/)).toBeVisible();
    await expect(card.getByText('Rule-based', { exact: true })).toBeVisible();
    await context.setOffline(false);
  });

  test('a cached Gemini comment is reused in the welcome-back dialog (④)', async ({ page }) => {
    // Lands on Insights directly: visiting Home first would mark D8's
    // "shown today" flag before yesterday's (REST-seeded) data streams in,
    // and the dialog is deliberately never reopened once marked.
    const user = await openSignedInWithGoals(page, sampleHabitGoals(Date.now()), '/insights/');
    await seedOneTrackedDay(page, user.uid);
    await setAiReply(page, 'A mocked weekly summary of the tracked days.');

    const card = page.getByRole('region', { name: 'Comments on your week' });
    await expect(card.getByText('AI comments are off')).toBeVisible();
    await card.getByRole('button', { name: 'Turn on' }).click();
    await page
      .getByRole('dialog', { name: 'Get AI comments on your days?' })
      .getByRole('button', { name: 'Turn on AI comments' })
      .click();
    await expect(card.getByText('✨ Gemini')).toBeVisible();

    await page.getByRole('link', { name: 'Home' }).click();
    await expect(
      page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })
    ).toBeVisible();
    const dialog = page.getByRole('dialog', { name: /Yesterday/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('✨ Gemini')).toBeVisible();
    await expect(dialog.getByText('A mocked weekly summary of the tracked days.')).toBeVisible();
  });
});

test.describe('F3 — not before consent', () => {
  test('never calls the AI client before consent is granted', async ({ page }) => {
    const user = await openSignedInWithGoals(page, sampleHabitGoals(Date.now()));
    await seedOneTrackedDay(page, user.uid);
    await setAiError(page); // any accidental call would surface as the fallback notice

    await page.getByRole('link', { name: 'Insights' }).click();
    const card = page.getByRole('region', { name: 'Comments on your week' });
    await expect(card.getByText('Rule-based', { exact: true })).toBeVisible();
    await expect(card.getByText(/unavailable/)).toHaveCount(0);
  });
});
