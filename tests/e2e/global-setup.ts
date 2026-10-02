/**
 * `next dev` compiles each route on first request, and a compile while a test
 * page is open triggers a Fast Refresh rebuild (sometimes a full reload) that
 * can swallow a click. Request every route once before the tests run.
 */
export default async function globalSetup() {
  const base = 'http://localhost:3100';
  for (const path of ['/', '/history/', '/insights/', '/privacy/']) {
    const response = await fetch(`${base}${path}`);
    if (!response.ok) throw new Error(`Warm-up of ${path} failed: ${response.status}`);
  }
}
