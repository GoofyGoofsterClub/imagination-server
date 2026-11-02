import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';

const indexes = [
    ['idx_uploads_filehash', 'uwuso.uploads (filehash)'],
    ['idx_uploads_uploader_time_id', 'uwuso.uploads (uploader_id, upload_time DESC, id DESC)'],
    ['idx_users_access_key', 'uwuso.users (access_key)'],
    ['idx_invites_hash', 'uwuso.invites (hash)'],
    ['idx_services_access_key', 'uwuso.services (access_key)'],
    ['idx_services_owner', 'uwuso.services (owner)'],
    ['idx_invites_inviter', 'uwuso.invites (inviter)'],
    ['idx_events_caller', 'uwuso.events (event_caller)'],
    ['uploads_uploader_filehash_uindex', 'uwuso.uploads (uploader_id, filehash)', true],
    ['uploads_filename_uindex', 'uwuso.uploads (filename)', true],
    ['users_username_uindex', 'uwuso.users (username)', true]
];

async function migrate() {
    const client = new pg.Client({
        connectionTimeoutMillis: 5000,
        statement_timeout: Number(process.env.MIGRATION_STATEMENT_TIMEOUT_MS) || 0,
        lock_timeout: 5000,
        application_name: 'imagination-migrations'
    });
    await client.connect();
    try {
        // Fail fast if another deploy is migrating, rather than queueing forever.
        const lock = await client.query('SELECT pg_try_advisory_lock(18745201) AS acquired');
        if (!lock.rows[0].acquired) throw new Error('Another migration is running. Retry after it completes.');
        await client.query('CREATE TABLE IF NOT EXISTS uwuso.schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT NOW())');
        const applied = new Set((await client.query('SELECT version FROM uwuso.schema_migrations')).rows.map(row => row.version));
        if (!applied.has('001-runtime-schema')) {
            await client.query('BEGIN');
            try {
                await client.query(await fs.readFile(path.resolve(__dirname, '../migrations/001-runtime-schema.sql'), 'utf8'));
                await client.query(`INSERT INTO uwuso.settings (key, value) VALUES ('file_id_key', $1) ON CONFLICT (key) DO NOTHING`, [crypto.randomBytes(32).toString('hex')]);
                await client.query(`INSERT INTO uwuso.schema_migrations (version) VALUES ('001-runtime-schema')`);
                await client.query('COMMIT');
            } catch (error) { await client.query('ROLLBACK'); throw error; }
        }
        if (!applied.has('002-online-indexes')) {
            for (const [name, definition, unique] of indexes) {
                const existing = await client.query('SELECT indisvalid FROM pg_index WHERE indexrelid = to_regclass($1)', [`uwuso.${name}`]);
                if (existing.rows[0] && !existing.rows[0].indisvalid)
                    throw new Error(`Index ${name} is invalid from an interrupted build. Inspect and drop it concurrently before retrying.`);
                await client.query(`CREATE ${unique ? 'UNIQUE ' : ''}INDEX CONCURRENTLY IF NOT EXISTS ${name} ON ${definition}`);
            }
            // Only remove known redundant indexes after the replacement is valid.
            for (const name of ['idx_uploads_filename', 'idx_users_username', 'idx_uploads_uploader_time'])
                await client.query(`DROP INDEX CONCURRENTLY IF EXISTS uwuso.${name}`);
            await client.query(`INSERT INTO uwuso.schema_migrations (version) VALUES ('002-online-indexes')`);
        }
        if (process.env.ENABLE_TRIGRAM_INDEXES === 'true' && !applied.has('003-substring-search')) {
            await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
            await client.query('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_uploads_filename_trgm ON uwuso.uploads USING gin (filename gin_trgm_ops)');
            await client.query('CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_trgm ON uwuso.users USING gin (username gin_trgm_ops)');
            await client.query(`INSERT INTO uwuso.schema_migrations (version) VALUES ('003-substring-search')`);
        }
        console.log('Database migrations complete.');
    } finally { await client.end(); }
}

migrate().catch(error => { console.error(error.message); process.exitCode = 1; });
