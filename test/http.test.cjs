const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gunzipSync } = require('node:zlib');
const { fixtureServer } = require('./fixtures.cjs');
const manifest = require('../public/asset-manifest.json');

test('serves visible initial content, fingerprinted assets, compression and private API headers', async t => {
    const { server } = await fixtureServer();
    t.after(() => server.stop());
    const home = await server.server.inject('/');
    assert.equal(home.statusCode, 200, home.body);
    assert.match(home.body, /Welcome!/);
    assert.match(home.body, /window.__APP/);
    assert.doesNotMatch(home.body, /style="opacity: 0"/);
    assert.doesNotMatch(home.body, /<script src="\/public\/js/);
    const asset = await server.server.inject({ url: manifest['/public/js/new.js'], headers: { 'accept-encoding': 'gzip' } });
    assert.equal(asset.statusCode, 200);
    assert.match(asset.headers['cache-control'], /immutable/);
    assert.equal(asset.headers['content-encoding'], 'gzip');
    assert.match(gunzipSync(asset.rawPayload).toString(), /initialize/);
    const css = await server.server.inject(manifest['/public/css/new.css']);
    assert.match(css.body, /@font-face/);
    assert.doesNotMatch(css.body, /fonts.googleapis.com/);
    const invalid = await server.server.inject('/api/private/session/info?key=invalid');
    assert.equal(invalid.statusCode, 401);
    assert.equal(invalid.headers['cache-control'], 'no-store');
    const valid = await server.server.inject({ url: '/api/private/session/info', headers: { authorization: 'fixture-key' } });
    assert.equal(valid.json().data.displayName, 'fixture');
    const list = await server.server.inject('/api/private/session/uploads?key=fixture-key&pagination=cursor');
    assert.equal(list.json().data.length, 2);
    assert.equal(list.json().pagination, 'cursor');
    const badCursor = await server.server.inject('/api/private/session/uploads?key=fixture-key&pagination=cursor&cursor=not-valid');
    assert.equal(badCursor.statusCode, 400);
    const media = await server.server.inject({ url: '/unknown-file', headers: { 'user-agent': 'Mozilla/5.0', accept: 'text/html' } });
    assert.match(media.headers.vary, /Accept/);
    assert.match(media.headers.vary, /User-Agent/);
    assert.match(media.headers['cache-control'], /private/);
});

test('optional browser metrics are validated and never publicly readable', async t => {
    const previous = process.env.ENABLE_RUM;
    process.env.ENABLE_RUM = 'true';
    const { server } = await fixtureServer();
    t.after(async () => { await server.stop(); if (previous === undefined) delete process.env.ENABLE_RUM; else process.env.ENABLE_RUM = previous; });
    const home = await server.server.inject('/');
    assert.match(home.body, /web-vitals\.[a-f0-9]+\.js/);
    const good = await server.server.inject({ method: 'POST', url: '/api/public/performance', payload: { name: 'LCP', pageType: 'home', value: 1200 } });
    assert.equal(good.statusCode, 204);
    const bad = await server.server.inject({ method: 'POST', url: '/api/public/performance', payload: { name: 'LCP', pageType: '/private-name', value: -1 } });
    assert.equal(bad.statusCode, 400);
    const read = await server.server.inject('/api/private/admin/metrics?key=fixture-key');
    assert.equal(read.statusCode, 403);
    assert.equal(read.headers['cache-control'], 'no-store');
});

test('the APIRoute wrapper honors handler status, errors and the maintenance exclusion', async t => {
    const { server } = await fixtureServer();
    t.after(async () => { await server.stop(); });
    const { APIRoute } = require('../lib/http/routing');
    class StatusAPIRoute extends APIRoute {
        constructor() { super('GET'); }
        async call(request, reply) { reply.code(418); return { success: true }; }
    }
    class FailingAPIRoute extends APIRoute {
        constructor() { super('GET'); }
        async call() { throw new Error('api route exploded'); }
    }
    class ExcludedAPIRoute extends APIRoute {
        constructor() { super('GET', true); }
        async call() { return { success: true, excluded: true }; }
    }
    await new StatusAPIRoute().register(server, '/api/test/status');
    await new FailingAPIRoute().register(server, '/api/test/failing');
    await new ExcludedAPIRoute().register(server, '/api/test/excluded');
    const status = await server.server.inject('/api/test/status');
    assert.equal(status.statusCode, 418, status.body);
    assert.deepEqual(status.json(), { success: true });
    const failing = await server.server.inject('/api/test/failing');
    assert.equal(failing.statusCode, 500, failing.body);
    assert.match(failing.body, /api route exploded/);
    server.server._public.Maintenance = { value: { enabled: true, mode: 1, message: 'Updating the website' } };
    const blocked = await server.server.inject('/api/test/status');
    assert.equal(blocked.statusCode, 503, blocked.body);
    assert.equal(blocked.json().error, '503 - Maintenance: Updating the website');
    const excluded = await server.server.inject('/api/test/excluded');
    assert.equal(excluded.statusCode, 200, excluded.body);
    assert.deepEqual(excluded.json(), { success: true, excluded: true });
});
