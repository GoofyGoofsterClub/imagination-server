const { test } = require('node:test');
const assert = require('node:assert/strict');
const AsyncCache = require('../lib/utilities/cache').default;
const { withDeadline } = require('../lib/utilities/deadline');
const { getFileByFilename, invalidateAllFiles } = require('../lib/utilities/filecache');

test('coalesces simultaneous cache misses, including missing files', async () => {
    invalidateAllFiles();
    let calls = 0;
    const db = { query: async () => { calls++; return { rows: [] }; } };
    const result = await Promise.all(Array.from({ length: 100 }, () => getFileByFilename(db, 'missing')));
    assert.equal(calls, 1);
    assert.ok(result.every(value => value === null));
    await getFileByFilename(db, 'missing');
    assert.equal(calls, 1);
});

test('invalidation cannot resurrect an in-flight stale entry', async () => {
    const cache = new AsyncCache();
    let resolve;
    const pending = cache.get('x', () => new Promise(done => { resolve = done; }));
    await Promise.resolve();
    cache.delete('x');
    resolve('old');
    await pending;
    assert.equal(await cache.get('x', () => 'new'), 'new');
});

test('stale reads return immediately while one background refresh runs', async () => {
    const cache = new AsyncCache({ ttl: 1000, stale: true });
    await cache.get('x', () => 'old');
    cache.entries.get('x').expiresAt = 0;
    let calls = 0;
    let resolve;
    const load = () => { calls++; return new Promise(done => { resolve = done; }); };
    assert.equal(await cache.get('x', load), 'old');
    assert.equal(await cache.get('x', load), 'old');
    assert.equal(calls, 1);
    const pending = cache.entries.get('x').pending;
    resolve('new');
    await pending;
    assert.equal(await cache.get('x', load), 'new');
});

test('cache is bounded and retries rejected loads', async () => {
    const cache = new AsyncCache({ max: 2 });
    await assert.rejects(cache.get('x', () => { throw Error('offline'); }));
    assert.equal(await cache.get('x', () => 1), 1);
    await cache.get('y', () => 2);
    await cache.get('z', () => 3);
    assert.equal(cache.entries.size, 2);
});

test('deadlines bound stalled dependencies', async () => {
    // Keep the test event loop alive; the production deadline is deliberately unref'ed.
    const keepAlive = setTimeout(() => {}, 100);
    try { await assert.rejects(withDeadline(() => new Promise(() => {}), 5, 'Redis'), /timed out/); }
    finally { clearTimeout(keepAlive); }
});
