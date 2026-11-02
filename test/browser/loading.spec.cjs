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

test('page changes retain slide/fade, stagger and hero transitions', async ({ page }) => {
    await page.goto('/');
    const expandedHeight = await page.locator('.big-showoff').evaluate(element => element.getBoundingClientRect().height);
    await page.evaluate(() => {
        window.motionCalls = [];
        const original = window.anime;
        function recorded(options) {
            window.motionCalls.push({
                target: options.targets === document.querySelector('body > .content') ? 'content'
                    : options.targets === document.querySelector('.big-showoff') ? 'hero' : 'children',
                duration: options.duration, opacity: options.opacity, translateY: options.translateY,
                staggered: typeof options.delay === 'function'
            });
            return original(options);
        }
        Object.assign(recorded, original);
        window.anime = recorded;
    });
    await page.evaluate(() => ChangePage('faq'));
    const calls = await page.evaluate(() => window.motionCalls);
    expect(calls).toEqual(expect.arrayContaining([
        expect.objectContaining({ target: 'content', duration: 200, opacity: [1, 0], translateY: [0, 100] }),
        expect.objectContaining({ target: 'content', duration: 200, opacity: [0, 1], translateY: [100, 0] }),
        expect.objectContaining({ target: 'children', staggered: true }),
        expect.objectContaining({ target: 'hero', duration: 200 })
    ]));
    await expect(page.locator('.big-showoff')).toBeHidden();
    await page.evaluate(() => ChangePage('welcome'));
    await expect.poll(() => page.locator('.big-showoff').evaluate(element => element.getBoundingClientRect().height)).toBe(expandedHeight);
    await expect(page.locator('body > .content')).toHaveCSS('opacity', '1');
});

test('larger pages use faster item animations and a bounded stagger', async ({ page }) => {
    await page.goto('/');
    const timings = await page.evaluate(() => {
        const original = window.anime;
        const timings = [];
        function recorded(options) {
            if (Array.isArray(options.targets)) {
                const children = options.targets;
                timings.push({
                    count: children.length,
                    duration: options.duration,
                    gap: options.delay(children[1], 1, children.length),
                    total: options.delay(children.at(-1), children.length - 1, children.length) + options.duration
                });
            }
            return original(options);
        }
        Object.assign(recorded, original);
        window.anime = recorded;
        const content = document.createElement('div');
        document.body.appendChild(content);
        for (const count of [4, 8, 60]) {
            stopPageMotion(content);
            content.replaceChildren(...Array.from({ length: count }, () => document.createElement('p')));
            animatePageIn(content);
        }
        stopPageMotion(content);
        content.remove();
        window.anime = original;
        return timings;
    });
    expect(timings[1].gap).toBeLessThan(timings[0].gap);
    expect(timings[2].gap).toBeLessThan(timings[1].gap);
    expect(timings[1].duration).toBeLessThan(timings[0].duration);
    expect(timings[2].duration).toBeLessThan(timings[1].duration);
    for (const timing of timings) expect(timing.total).toBeLessThanOrEqual(520);
});

test('interrupted transitions and reduced motion keep the final page usable', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.evaluate(async () => {
        const first = ChangePage('faq');
        await new Promise(resolve => setTimeout(resolve, 50));
        const second = ChangePage('dashboard');
        const last = ChangePage('welcome');
        await Promise.all([first, second, last]);
    });
    await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeVisible();
    await expect(page.locator('body > .content')).toHaveCSS('opacity', '1');
    await expect(page.locator('body > .content')).not.toHaveAttribute('aria-busy');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => ChangePage('faq'));
    await expect(page.locator('body > .content')).toHaveCSS('opacity', '1');
    await expect(page.locator('body > .content')).toHaveCSS('transform', 'none');
    expect(errors).toEqual([]);
});
