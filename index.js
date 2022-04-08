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
const users = require("./users.json");

fastify.register(require('fastify-static'), {
    root: path.join(__dirname, 'public'),
    prefix: '/',
});

fastify.register(require("point-of-view"), {
  engine: {
    eta: require("eta"),
  },
});

fastify.get('/', async (request, reply) => {
    reply.view("private/index.ejs", {});
});
fastify.get('/setup', async (request, reply) => {
    reply.view("private/chatterino.ejs", {
        "key": request.query['key'] != undefined ? request.query['key'] : "YOURKEYHERE",
    });
});

fastify.post('/uploadImage', async (req, reply) =>
{
    if (!(req.headers['authorization'] in users)) { reply.code(401); return "Fuck you bitch!"; }
    const _user = users[req.headers['authorization']];
    const data = await req.file();
    const fileName = `${generateFileName(_user, 2)}.${getFileExt(data.filename)}`;
    if (!fs.existsSync(path.join('public', _user['displayName']))) {
        fs.mkdirSync(path.join('public', _user['displayName']));
    }
    await pump(data.file, fs.createWriteStream(path.join('public', _user['displayName'], fileName)));

    return { "data": { "link": "https://boobs.pics/" + _user['displayName'] + "/" + fileName, "deletehash": "test" } };
});

function generateFileName(u, length) {
    var _gen = (Math.random() + 1).toString(36).substring(2);
    if (fs.existsSync(path.join('public', u['displayName'], _gen)))
        return generateFileName(length);
   return _gen;
}

function getFileExt(filename)
{
    return filename.split('.').pop();
}

fastify.listen(3000).catch(() => { });