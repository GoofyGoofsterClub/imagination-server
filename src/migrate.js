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

export async function migrate({ connectionString } = {}) {
    const client = new pg.Client({
        connectionString,
        connectionTimeoutMillis: 5000,
        statement_timeout: Number(process.env.MIGRATION_STATEMENT_TIMEOUT_MS) || 0,
        lock_timeout: 5000,
        application_name: 'imagination-migrations'
    });
    let connected = false;
    try {
        await client.connect();
        connected = true;
        // A blocking SELECT would retain a snapshot that CREATE INDEX CONCURRENTLY
        // can wait for, deadlocking against the advisory lock. Wait between short queries.
        const waitUntil = Date.now() + (Number(process.env.MIGRATION_WAIT_TIMEOUT_MS) || 300000);
        while (!(await client.query('SELECT pg_try_advisory_lock(18745201) AS acquired')).rows[0].acquired) {
            if (Date.now() >= waitUntil) throw new Error('Timed out waiting for another starter to initialize the database.');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
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
            const createIndex = async (name, definition, unique = false) => {
                const existing = await client.query('SELECT indisvalid FROM pg_index WHERE indexrelid = to_regclass($1)', [`uwuso.${name}`]);
                if (existing.rows[0] && !existing.rows[0].indisvalid)
                    await client.query(`DROP INDEX CONCURRENTLY IF EXISTS uwuso.${name}`);
                await client.query(`CREATE ${unique ? 'UNIQUE ' : ''}INDEX CONCURRENTLY IF NOT EXISTS ${name} ON ${definition}`);
            };
            for (const [name, definition, unique] of indexes) {
                try {
                    await createIndex(name, definition, unique);
                } catch (error) {
                    if (name !== 'uploads_uploader_filehash_uindex' || error.code !== '23505') throw error;
                    // Old installations allowed duplicate hashes. Keep every existing
                    // record/link/file; new uploads use a transaction-scoped hash lock.
                    await client.query(`DROP INDEX CONCURRENTLY IF EXISTS uwuso.uploads_uploader_filehash_uindex`);
                    await createIndex('idx_uploads_uploader_filehash', 'uwuso.uploads (uploader_id, filehash)');
                    console.warn('Existing duplicate upload hashes found; preserved all uploads and installed a non-unique lookup index.');
                }
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
    } catch (error) {
        if (connected) error.migrationFailure = true;
        throw error;
    } finally { await client.end(); }
}

if (require.main === module) {
    migrate().catch(error => { console.error(error.message); process.exitCode = 1; });
}
