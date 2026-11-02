const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => { await page.route('https://a.uwu.so/**', route => route.abort()); });

test('welcome remains visible with blocked translations and analytics', async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://a.uwu.so/**', route => route.abort());
    await page.route('**/public/translations/**', route => route.abort());
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('opacity', '1');
    await expect(page.locator('#__upload_counter')).toHaveText('2');
    await page.screenshot({ path: `/tmp/opencode/imagination-${info.project.name}-welcome.png`, fullPage: true });
    expect(errors).toEqual([]);
});

test('dashboard uses one session request and skips the hero', async ({ page }, info) => {
    await page.addInitScript(() => localStorage.setItem('key', 'fixture-key'));
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.route('https://a.uwu.so/**', route => route.abort());
    await page.goto('/#dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#__dashboard_logged_displayname')).toHaveText('fixture');
    await expect(page.locator('#__dashboard_logged_uploads_table')).toContainText('file-two');
    expect(requests.filter(url => url.includes('/session/info'))).toHaveLength(1);
    expect(requests.filter(url => url.includes('/session/check'))).toHaveLength(0);
    expect(requests.filter(url => /sagiri\./.test(url))).toHaveLength(0);
    await page.screenshot({ path: `/tmp/opencode/imagination-${info.project.name}-dashboard.png`, fullPage: true });
    await page.locator('.nav-el[data-content="faq"]').click();
    await page.locator('.nav-el[data-content="dashboard"]').click();
    await expect(page.locator('#__dashboard_logged_displayname')).toHaveText('fixture');
    expect(requests.filter(url => /dashboard-logged\.[a-f0-9]+\.js/.test(url))).toHaveLength(1);
});

test('temporary session failures preserve credentials and offer retry', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('key', 'fixture-key'));
    await page.route('**/api/private/session/info', route => route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Please wait.' }) }));
    await page.goto('/#dashboard');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('key'))).toBe('fixture-key');
});

test('profile loads without waiting for the window load event', async ({ page }, info) => {
    await page.goto('/profile/fixture', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#profile-user-name')).toHaveText('fixture');
    await expect(page.locator('.profile')).toBeVisible();
    await page.screenshot({ path: `/tmp/opencode/imagination-${info.project.name}-profile.png`, fullPage: true });
});
