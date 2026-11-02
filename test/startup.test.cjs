const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const pg = require('pg');

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

test('startup initializes an existing schema automatically, serializes replicas and skips completed updates', {
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
    t.after(async () => {
        for (const process of processes) if (process.child.exitCode === null) process.child.kill('SIGKILL');
        await Promise.all(processes.map(process => process.exited));
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
    assert.deepEqual(before.map(row => row.version), ['001-runtime-schema', '002-online-indexes']);
    assert.equal((await database.query(`SELECT indisvalid FROM pg_index WHERE indexrelid='uwuso.users_username_uindex'::regclass`)).rows[0].indisvalid, true);
    assert.equal((await database.query(`SELECT value FROM uwuso.settings WHERE key='file_id_key'`)).rows[0].value, key);
    const repeated = launch(env);
    processes.push(repeated);
    await repeated.ready;
    repeated.child.kill('SIGTERM');
    assert.equal((await repeated.exited).code, 0);
    assert.deepEqual((await database.query('SELECT version, applied_at FROM uwuso.schema_migrations ORDER BY version')).rows, before);
});
