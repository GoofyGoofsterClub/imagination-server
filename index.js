const fastify = require('fastify')({ logger: true, bodyLimit: Number.MAX_SAFE_INTEGER });
fastify.register(require('fastify-multipart'), {
    limits: {
        fieldNameSize: Number.MAX_SAFE_INTEGER,
        fieldSize: Number.MAX_SAFE_INTEGER,
        fields: Number.MAX_SAFE_INTEGER,
        fileSize: Number.MAX_SAFE_INTEGER,
        parts: Number.MAX_SAFE_INTEGER,
        headerPairs: Number.MAX_SAFE_INTEGER
    }
});
const fs = require('fs');
const util = require('util');
const path = require('path');
const { pipeline } = require('stream');
const pump = util.promisify(pipeline);

const config = require('./config.json');

fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/',
})

fastify.get('/', async (request, reply) => {
    return "image server"
});

fastify.post('/uploadImage', async (req, reply) =>
{
    if (req.headers['authorization'] != config.AuthToken) { reply.code(401); return "Fuck you bitch!"; }
    const data = await req.file();
    const fileName = `${generateFileName()}.png`;
    await pump(data.file, fs.createWriteStream(path.join('public', fileName)));

    return { "data": { "link": "https://boobs.pics/" + fileName, "deletehash": "test" } };
});

function generateFileName(length) {
   return (Math.random() + 1).toString(36).substring(2);
}

fastify.listen(3000).catch(() => { });