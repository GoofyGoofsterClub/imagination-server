const { fixtureServer } = require('./fixtures.cjs');
fixtureServer().then(async ({ server }) => {
    await server.server.listen({ host: '127.0.0.1', port: 18763 });
    process.on('SIGTERM', () => server.stop().then(() => process.exit(0)));
}).catch(error => { console.error(error); process.exitCode = 1; });
