const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const pg = require('pg');
const Database = require('../lib/db/db').default;
const HTTPServer = require('../lib/http/server').default;
const HTTPRouting = require('../lib/http/routing').default;
const hash = require('../lib/utilities/hash').default;

function launch(env) {
    const child = spawn(process.execPath, ['lib/run.js'], {
        cwd: path.resolve(__dirname, '..'), env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
    const ready = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Startup timed out:\n' + output)), 20000);
        const receive = chunk => {
            output += chunk.toString();
            if (output.includes('Server started!')) { clearTimeout(timer); resolve(); }
        };
        child.stdout.on('data', receive);
        child.stderr.on('data', receive);
        child.once('error', error => { clearTimeout(timer); reject(error); });
        exited.then(({ code }) => {
            clearTimeout(timer);
            if (!output.includes('Server started!')) reject(new Error(`Startup exited (${code}):\n${output}`));
        });
    });
    return { child, ready, exited };
}

for (const legacyDuplicates of [false, true]) test(`startup initializes automatically and preserves data${legacyDuplicates ? ' with legacy duplicate hashes' : ''}`, {
    skip: !process.env.PERF_TEST_DATABASE_URL, timeout: 60000
}, async t => {
    // Create and remove only our own disposable database on the isolated test server.
    const url = new URL(process.env.PERF_TEST_DATABASE_URL);
    const admin = new pg.Client({ connectionString: url.toString() });
    await admin.connect();
    const name = 'imagination_startup_' + crypto.randomBytes(6).toString('hex');
    await admin.query(`CREATE DATABASE ${name}`);
    url.pathname = '/' + name;
    const database = new pg.Client({ connectionString: url.toString() });
    const processes = [];
    let server;
    let pool;
    t.after(async () => {
        if (server) await server.stop();
        if (pool) await pool.end();
        for (const process of processes) if (process.child.exitCode === null) process.child.kill('SIGKILL');
        await Promise.all(processes.map(process => process.exited));
        const files = await database.query('SELECT disk_filename FROM uwuso.uploads');
        await Promise.all(files.rows.map(row => fs.unlink(path.resolve(__dirname, '../privateuploads', row.disk_filename)).catch(() => {})));
        await database.end();
        await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
        await admin.end();
    });
    await database.connect();
    const schema = await fs.readFile(path.resolve(__dirname, '../docker-entrypoint-initdb.d/uwu.sql'), 'utf8');
    await database.query(schema.slice(schema.indexOf('CREATE SCHEMA uwuso;')));
    const key = 'ab'.repeat(32);
    await database.query(`INSERT INTO uwuso.settings (key, value) VALUES ('file_id_key', $1)`, [key]);
    // Reproduce an interrupted/failed concurrent index build, then fix only the
    // fixture data. Startup should recover the leftover invalid index itself.
    await database.query('DROP INDEX uwuso.users_username_uindex');
    const duplicates = (await database.query(`INSERT INTO uwuso.users (username, access_key)
        VALUES ('startup_fixture', 'first'), ('startup_fixture', 'second') RETURNING id`)).rows;
    await assert.rejects(database.query('CREATE UNIQUE INDEX CONCURRENTLY users_username_uindex ON uwuso.users (username)'), error => error.code === '23505');
    await database.query('DELETE FROM uwuso.users WHERE id = $1', [duplicates[1].id]);
    const content = Buffer.from('legacy duplicate upload content');
    const fileHash = crypto.createHash('sha256').update(content).digest('hex');
    const legacyFiles = [name + '_one', name + '_two'];
    if (legacyDuplicates) {
        await database.query('DROP INDEX uwuso.uploads_uploader_filehash_uindex');
        await database.query('UPDATE uwuso.users SET access_key=$1 WHERE id=$2', [hash('fixture-upload-key'), duplicates[0].id]);
        await fs.mkdir(path.resolve(__dirname, '../privateuploads'), { recursive: true });
        for (const filename of legacyFiles) {
            await fs.writeFile(path.resolve(__dirname, '../privateuploads', filename), content);
            await database.query(`INSERT INTO uwuso.uploads
                (uploader_id, filename, disk_filename, mimetype, filehash, filesize, upload_time, upload_domain)
                VALUES ($1, $2, $2, 'application/octet-stream', $3, $4, 1700000000, 'localhost')`,
                [duplicates[0].id, filename, fileHash, content.length]);
        }
        // Leave the failed index behind, just like a production startup failure.
        await assert.rejects(database.query('CREATE UNIQUE INDEX CONCURRENTLY uploads_uploader_filehash_uindex ON uwuso.uploads (uploader_id, filehash)'), error => error.code === '23505');
    }
    const env = {
        PGHOST: url.hostname, PGPORT: url.port || '5432', PGDATABASE: name,
        PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
        HTTP_PORT: '0', LEGACY_MONGO_ENABLED: 'false', REDISHOST: '', REDIS_HOST: '',
        LOG_WEBHOOK: '', OTLP_LOG_ENDPOINT: '', NODE_ENV: 'production', ENABLE_TRIGRAM_INDEXES: 'false'
    };
    // Neither instance invokes the CLI or requires a separate deployment step.
    const starters = [launch(env), launch(env)];
    processes.push(...starters);
    await Promise.all(starters.map(process => process.ready));
    for (const process of starters) process.child.kill('SIGTERM');
    for (const process of starters) assert.equal((await process.exited).code, 0);
    const before = (await database.query('SELECT version, applied_at FROM uwuso.schema_migrations ORDER BY version')).rows;
    const extensionColumns = (await database.query(`SELECT data_type, is_nullable FROM information_schema.columns
        WHERE table_schema = 'uwuso' AND table_name = 'uploads' AND column_name = 'file_extension'`)).rows;
    assert.deepEqual(extensionColumns, [{ data_type: 'text', is_nullable: 'YES' }]);
    assert.equal((await database.query(`SELECT indisvalid FROM pg_index WHERE indexrelid='uwuso.users_username_uindex'::regclass`)).rows[0].indisvalid, true);
    assert.equal((await database.query(`SELECT value FROM uwuso.settings WHERE key='file_id_key'`)).rows[0].value, key);
    const repeated = launch(env);
    processes.push(repeated);
    await repeated.ready;
    repeated.child.kill('SIGTERM');
    assert.equal((await repeated.exited).code, 0);
    assert.deepEqual((await database.query('SELECT version, applied_at FROM uwuso.schema_migrations ORDER BY version')).rows, before);
    if (legacyDuplicates) {
        assert.equal((await database.query(`SELECT COUNT(*) AS count FROM uwuso.uploads WHERE filehash=$1`, [fileHash])).rows[0].count, '2');
        assert.equal((await database.query(`SELECT indisvalid AND NOT indisunique AS valid FROM pg_index
            WHERE indexrelid='uwuso.idx_uploads_uploader_filehash'::regclass`)).rows[0].valid, true);
        for (const filename of legacyFiles) assert.deepEqual(await fs.readFile(path.resolve(__dirname, '../privateuploads', filename)), content);

        // Exercise the real upload endpoint without a unique hash index.
        pool = new pg.Pool({ connectionString: url.toString() });
        const db = Object.create(Database.prototype);
        Object.assign(db, { pool, metrics: { queries: 0, failures: 0, totalMs: 0, poolWaitMs: 0 }, Output: { Log() {} } });
        await db.loadFileIdKey();
        server = new HTTPServer(null, db, null, { add() {} });
        await HTTPRouting.RegisterRoutes(server);
        const upload = (bytes, mimetype = 'application/octet-stream') => server.server.inject({
            method: 'POST', url: '/api/private/uploads/new',
            headers: { authorization: 'fixture-upload-key', 'content-type': 'multipart/form-data; boundary=fixture-boundary' },
            payload: Buffer.concat([
                Buffer.from(`--fixture-boundary\r\nContent-Disposition: form-data; name="file"; filename="fixture.bin"\r\nContent-Type: ${mimetype}\r\n\r\n`),
                bytes, Buffer.from('\r\n--fixture-boundary--\r\n')
            ])
        });
        const old = await upload(content);
        assert.equal(old.statusCode, 200, old.body);
        assert.ok(old.json().data.link.endsWith('/' + legacyFiles[0]));
        const fresh = Buffer.from('new identical concurrent uploads');
        const responses = await Promise.all(Array.from({ length: 6 }, () => upload(fresh)));
        for (const response of responses) {
            assert.equal(response.statusCode, 200, response.body);
            assert.equal(response.json().success, true, response.body);
        }
        assert.equal(new Set(responses.map(response => response.json().data.link)).size, 1);
        const newHash = crypto.createHash('sha256').update(fresh).digest('hex');
        assert.equal((await database.query('SELECT COUNT(*) AS count FROM uwuso.uploads WHERE filehash=$1', [newHash])).rows[0].count, '1');
        assert.equal((await database.query('SELECT COUNT(*) AS count FROM uwuso.uploads WHERE filehash=$1', [fileHash])).rows[0].count, '2');
        const image = await require('sharp')({ create: { width: 64, height: 64, channels: 3, background: '#7799aa' } }).png().toBuffer();
        const imageResponse = await upload(image, 'image/png');
        assert.equal(imageResponse.statusCode, 200, imageResponse.body);
        const imageName = new URL(imageResponse.json().data.link).pathname.slice(1);
        const stored = (await database.query('SELECT disk_filename FROM uwuso.uploads WHERE filename=$1', [imageName])).rows[0].disk_filename;
        const storedFiles = await fs.readdir(path.resolve(__dirname, '../privateuploads'));
        assert.deepEqual(storedFiles.filter(filename => filename === stored || filename.startsWith(stored + '.preview')), [stored]);
        assert.deepEqual(await fs.readFile(path.resolve(__dirname, '../privateuploads', stored)), image);
    }
});
