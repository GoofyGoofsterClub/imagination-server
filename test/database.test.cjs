const { test } = require('node:test');
const assert = require('node:assert/strict');
const pg = require('pg');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const Database = require('../lib/db/db').default;
const HTTPServer = require('../lib/http/server').default;
const HTTPRouting = require('../lib/http/routing').default;
const hash = require('../lib/utilities/hash').default;
const { clearListCounts } = require('../lib/utilities/pagination');
const { invalidateAllFiles } = require('../lib/utilities/filecache');
const { generatePreview, getPreview, deletePreviewFiles } = require('../lib/utilities/previews');
const sharp = require('sharp');

test('isolated PostgreSQL: quotas, stable cursors, raw ranges and previews', { skip: !process.env.PERF_TEST_DATABASE_URL }, async t => {
    // This URL must identify a disposable database, never a production connection.
    const pool = new pg.Pool({ connectionString: process.env.PERF_TEST_DATABASE_URL, options: '-c imagination.storage_quota=1000000' });
    const db = Object.create(Database.prototype);
    Object.assign(db, { pool, metrics: { queries: 0, failures: 0, totalMs: 0, poolWaitMs: 0 }, Output: { Log() {} } });
    const prefix = 'perf_test_' + crypto.randomBytes(6).toString('hex');
    const key = prefix + '_key';
    const user = (await pool.query('INSERT INTO uwuso.users (username, access_key) VALUES ($1, $2) RETURNING id', [prefix, hash(key)])).rows[0];
    const diskFilename = prefix + '_image';
    let server;
    t.after(async () => {
        if (server) await server.stop();
        await pool.query('DELETE FROM uwuso.uploads WHERE filename LIKE $1', [prefix + '%']);
        await pool.query('DELETE FROM uwuso.users WHERE id = $1', [user.id]);
        await pool.end();
        await fs.unlink(path.resolve(__dirname, '../privateuploads', diskFilename)).catch(() => {});
        await deletePreviewFiles(diskFilename);
        invalidateAllFiles();
        clearListCounts();
    });
    const insert = (filename, size = 10) => pool.query(`INSERT INTO uwuso.uploads
        (uploader_id, filename, disk_filename, mimetype, filehash, filesize, upload_time, upload_domain)
        VALUES ($1, $2, $3, 'image/png', $2, $4, 1700000000, 'localhost') RETURNING id`,
        [user.id, filename, diskFilename, size]);
    await Promise.all(Array.from({ length: 110 }, (_, index) => insert(prefix + index)));
    assert.equal(Number((await pool.query('SELECT used_bytes FROM uwuso.storage_usage WHERE uploader_id=$1', [user.id])).rows[0].used_bytes), 1100);
    await assert.rejects(insert(prefix + '_overquota', 1000000), error => error.constraint === 'storage_quota_exceeded');
    assert.equal(Number((await pool.query('SELECT used_bytes FROM uwuso.storage_usage WHERE uploader_id=$1', [user.id])).rows[0].used_bytes), 1100);
    // ON CONFLICT DO NOTHING must not consume quota.
    await pool.query(`INSERT INTO uwuso.uploads (uploader_id, filename, disk_filename, mimetype, filehash, filesize, upload_time, upload_domain)
        VALUES ($1, $2, $3, 'image/png', $2, 10, 1700000000, 'localhost') ON CONFLICT DO NOTHING`, [user.id, prefix + '0', diskFilename]);
    assert.equal(Number((await pool.query('SELECT used_bytes FROM uwuso.storage_usage WHERE uploader_id=$1', [user.id])).rows[0].used_bytes), 1100);
    server = new HTTPServer(null, db, null, { add() {} });
    await HTTPRouting.RegisterRoutes(server);
    const seen = new Set();
    let cursor = '';
    for (let page = 1; page <= 3; page++) {
        const response = await server.server.inject(`/api/private/session/uploads?key=${key}&pagination=cursor&page=${page}&cursor=${cursor}`);
        assert.equal(response.statusCode, 200, response.body);
        const result = response.json();
        assert.equal(result.total, 110);
        for (const row of result.data) { assert.ok(!seen.has(row.id)); seen.add(row.id); }
        cursor = result.nextCursor || '';
        assert.equal(result.hasNext, page < 3);
    }
    assert.equal(seen.size, 110);
    const image = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#7799aa' } }).png().toBuffer();
    await fs.mkdir(path.resolve(__dirname, '../privateuploads'), { recursive: true });
    await fs.writeFile(path.resolve(__dirname, '../privateuploads', diskFilename), image);
    const file = { disk_filename: diskFilename, mimetype: 'image/png' };
    assert.equal(await generatePreview(file), true);
    assert.deepEqual(await getPreview(file), { width: 1600, height: 1200 });
    const preview = await server.server.inject(`/preview/${prefix}0/640`);
    assert.equal(preview.statusCode, 200);
    assert.equal((await sharp(preview.rawPayload).metadata()).width, 640);
    const range = await server.server.inject({ url: `/raw/${prefix}0`, headers: { range: 'bytes=0-7' } });
    assert.equal(range.statusCode, 206);
    assert.deepEqual(range.rawPayload, image.subarray(0, 8));
    const previousAccel = process.env.MEDIA_ACCEL_PREFIX;
    try {
        process.env.MEDIA_ACCEL_PREFIX = '/_uploads/';
        const offloaded = await server.server.inject(`/raw/${prefix}0`);
        assert.equal(offloaded.headers['x-accel-redirect'], '/_uploads/' + diskFilename);
        assert.equal(offloaded.rawPayload.length, 0);
    } finally {
        if (previousAccel === undefined) delete process.env.MEDIA_ACCEL_PREFIX;
        else process.env.MEDIA_ACCEL_PREFIX = previousAccel;
    }
    const viewer = await server.server.inject({ url: '/' + prefix + '0', headers: { 'user-agent': 'Mozilla/5.0', accept: 'text/html' } });
    assert.equal(viewer.statusCode, 200, viewer.body);
    assert.match(viewer.body, /width="1600" height="1200"/);
    assert.match(viewer.body, /data-src="\/raw\//);
});
