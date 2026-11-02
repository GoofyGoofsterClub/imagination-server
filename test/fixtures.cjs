const HTTPServer = require('../lib/http/server').default;
const HTTPRouting = require('../lib/http/routing').default;
const hash = require('../lib/utilities/hash').default;

async function fixtureServer() {
    const calls = [];
    const user = { id: '1', username: 'fixture', permissions: '0', superuser: false, banned: false, views: 10, uploads: 2, badges: [] };
    const db = {
        calls,
        pool: { totalCount: 0, idleCount: 0, waitingCount: 0 },
        metrics: {},
        findUserByAccessKey: async key => key === hash('fixture-key') ? user : null,
        doesUserExistByAccessKey: async key => key === hash('fixture-key'),
        findUserByDisplayName: async name => name === 'fixture' ? user : null,
        query: async (sql, params) => {
            calls.push({ sql, params });
            if (/COALESCE\(SUM\(views\)/.test(sql)) return { rows: [{ uploads: '2', views: '10' }] };
            if (/COUNT\(\*\)/.test(sql)) return { rows: [{ count: '2' }] };
            if (/FROM uwuso.uploads/.test(sql) && /ORDER BY/.test(sql)) return { rows: [
                { id: '2', filename: 'file-two', upload_time: '1700000001', upload_domain: 'localhost' },
                { id: '1', filename: 'file-one', upload_time: '1700000000', upload_domain: 'localhost' }
            ] };
            return { rows: [], rowCount: 0 };
        }
    };
    const server = new HTTPServer(null, db, null, { add() {} });
    await HTTPRouting.RegisterRoutes(server);
    await server.pluginsReady;
    return { server, db };
}

module.exports = { fixtureServer };
