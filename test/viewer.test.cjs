const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixtureServer } = require('./fixtures.cjs');

test('new and legacy image viewers use raw originals, not preview sources', async t => {
    const { server } = await fixtureServer();
    t.after(() => server.stop());
    for (const url of ['/fixture-image.png', '/fixture/fixture-image.png']) {
        const response = await server.server.inject({ url, headers: { 'user-agent': 'Mozilla/5.0', accept: 'text/html' } });
        assert.equal(response.statusCode, 200, response.body);
        assert.ok(response.body.includes(`class="file-viewer-media" src="/raw${url}"`));
        assert.ok(response.body.includes(`data-src="/raw${url}"`));
        assert.doesNotMatch(response.body, /\/preview\/|srcset=/);
    }
    // Preview metadata must never override the original source in the template.
    const html = await server.server.view('viewer.ejs', {
        filename: 'fixture-image.png', kind: 'image', rawUrl: '/raw/fixture-image.png',
        downloadUrl: '/raw/fixture-image.png?download=1', embedUrl: 'https://fixture.invalid/raw/fixture-image.png',
        announcement: null, preview: { width: 1600, height: 1200 }, previewUrl: '/preview/fixture-image.png'
    });
    assert.ok(html.includes('class="file-viewer-media" src="/raw/fixture-image.png"'));
    assert.doesNotMatch(html, /\/preview\/|srcset=/);
});
