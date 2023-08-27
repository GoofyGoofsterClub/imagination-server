const fastify = require('fastify')({ logger: true, bodyLimit: Number.MAX_SAFE_INTEGER });

fastify.get('/', async (request, reply) => {
    return { hello: 'world' };
});

fastify.listen({
    host: '0.0.0.0',
    port: process.env.HTTP_PORT
}).catch((e) => { console.log(e); });