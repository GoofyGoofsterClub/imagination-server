const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('redis');
const { startCacheBus, stopCacheBus, onInvalidation } = require('../lib/utilities/cachebus');
const { getFileByFilename, invalidateAllFiles } = require('../lib/utilities/filecache');
const RateLimiter = require('../lib/utilities/ratelimit').default;

test('Redis invalidations evict metadata loaded by another worker', { skip: !process.env.PERF_TEST_REDIS_URL, timeout: 5000 }, async t => {
    const redis = createClient({ url: process.env.PERF_TEST_REDIS_URL });
    redis.on('error', () => {});
    await redis.connect();
    t.after(async () => { await stopCacheBus(); await redis.quit(); });
    await startCacheBus(redis);
    invalidateAllFiles();
    let calls = 0;
    const db = { query: async () => { calls++; return { rows: [{ id: String(calls) }] }; } };
    const first = await getFileByFilename(db, 'redis-test-file');
    const second = await getFileByFilename(db, 'redis-test-file');
    assert.equal(first.id, second.id);
    const received = new Promise(resolve => onInvalidation('files', filename => { if (filename === 'redis-test-file') resolve(); }));
    await redis.publish('imagination:cache-invalidations:v1', JSON.stringify({ origin: 'another-worker', topic: 'files', payload: 'redis-test-file' }));
    await received;
    assert.equal((await getFileByFilename(db, 'redis-test-file')).id, '2');
});

test('stalled rate limits fall back locally and open a short circuit', async () => {
    const previous = process.env.REDIS_COMMAND_TIMEOUT_MS;
    process.env.REDIS_COMMAND_TIMEOUT_MS = '5';
    let calls = 0;
    const pipeline = { set() { return this; }, incr() { return this; }, ttl() { return this; }, exec() { calls++; return new Promise(() => {}); } };
    const limiter = new RateLimiter({ isReady: true, multi: () => pipeline }, 'test', 1, 60);
    const keepAlive = setTimeout(() => {}, 100);
    try {
        assert.equal((await limiter.hit('user')).allowed, true);
        assert.equal((await limiter.hit('user')).allowed, false);
        assert.equal(calls, 1);
    } finally {
        clearTimeout(keepAlive);
        if (previous === undefined) delete process.env.REDIS_COMMAND_TIMEOUT_MS;
        else process.env.REDIS_COMMAND_TIMEOUT_MS = previous;
    }
});
