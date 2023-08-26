const fastify = require('fastify')({ logger: true, bodyLimit: Number.MAX_SAFE_INTEGER });
fastify.register(require('fastify-multipart'), {
    trustProxy: true,
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
const crypto = require('crypto');
const { pipeline } = require('stream');
const pump = util.promisify(pipeline);

const { MongoClient } = require('mongodb');

const {
    //MONGO_USER,
    //MONGO_PASSWORD,
    MONGO_HOST,
    MONGO_PORT
  } = process.env;

if (!fs.existsSync('privateuploads'))
    fs.mkdirSync('privateuploads');


const url = `mongodb://${MONGO_HOST}:${MONGO_PORT}`;
const client = new MongoClient(url);

var db = null;
var userCollection = null;
var invitesCollection = null;
var viewStatsCollection = null;
var individualViewStatsCollection = null;

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

(async () => {
    await client.connect();
    db = client.db("boobspics");
    userCollection = db.collection('users');
    await userCollection.find().toArray();                                      // TROLLERY??

    invitesCollection = db.collection('invites');
    await invitesCollection.find().toArray();                                   // TROLLERY??
    uploadsCollection = db.collection('uploads');
    await uploadsCollection.find().toArray();                                   // TROLLERY??
    leaderboardsCollection = db.collection('leaderboards');
    await leaderboardsCollection.find().toArray();                              // TROLLERY??
    viewStatsCollection = db.collection('viewstats');
    await viewStatsCollection.find().toArray();                                 // TROLLERY??
    individualViewStatsCollection = db.collection('individualviewstats');
    await individualViewStatsCollection.find().toArray();                       // TROLLERY??


})().catch(() => { });
fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/public/', // optional: default '/'
})
fastify.register(require("point-of-view"), {
  engine: {
    eta: require("eta"),
  },
});
fastify.register(require('fastify-cookie'), {
  secret: "sdbsdbsdbwewbqegqwg", // for cookies signature
  hook: 'onRequest', // set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
  parseOptions: {}  // options for parsing cookies
})


async function GetUploadCount()
{
    return [await uploadsCollection.countDocuments({}), await userCollection.countDocuments({})];
}

fastify.get('/', async (request, reply) => {
    var uploadsCount = await GetUploadCount();
    switch (request.headers['host'])
    {
        case "noboobs.pics":
            reply.view("private/newmain.ejs", {
                    'uploadsCount': uploadsCount[0],
                    "uploadersCount": uploadsCount[1],
                    "domain": request.headers['host']
                });
            break;
        default:
            reply.view("private/newmain.ejs", {
                'uploadsCount': uploadsCount[0],
                "uploadersCount": uploadsCount[1],
                "domain": request.headers['host']
            });
            break;
    }
});

fastify.get('/stats', async (req, reply) => {
    reply.view("private/stats.ejs", {});
});

var user_experienced = [];

fastify.post('/uploadImage', async (req, reply) =>
{
    var accesskey = req.headers['authorization'];
    var fetchedUsers = await userCollection.find({ "key": accesskey }).toArray();

    var hostUri = req.headers['host'];
    
    if (fetchedUsers.length < 1)
    {
        reply.code(401); return "Fuck you bitch!";
    }

    const _user = fetchedUsers[0];
    const data = await req.file();
    if (_user['allowed_regex'] != undefined && !data.filename.match(new RegExp(_user['allowed_regex'])))
    {
        return "You're ugly. (you are not allowed to upload this type of file)";
    }

    var _actualfilename = makeid(16);
    var _fakeuploadname = _user['allow_custom'] ? data.filename : makeid(8);
    var _deletehash = makeid(16);
    var _vxd = path.join('privateuploads', _actualfilename);
    await pump(data.file, fs.createWriteStream(
        _vxd
    ));
    var stats = fs.statSync(_vxd);
    var fileSizeInBytes = stats.size;

    const uploaderHash = crypto.createHash('sha256').update(_user.displayName, 'utf8').digest('hex');
    await uploadsCollection.insertMany([
        {
            "uploader": uploaderHash,
            "actual_filename": _actualfilename,
            "original_filename": data.filename,
            "filename": _fakeuploadname,
            "file_ext": data.filename.split(".")[1],
            "mimetype": data.mimetype,
            "timestamp": Date.now(),
            "deletehash": _deletehash,
            "uploaded_thru": req.headers['host'],
            "size": fileSizeInBytes
        }
    ]);

    var TEMPORARY_MESSAGE = null;

    leaderboardsCollection.updateOne({ "uploader": _user.displayName }, { $inc: { "uploads": 1, "totalFileSize": fileSizeInBytes} }, { upsert: true });

    if (hostUri == null) hostUri = "uwu.so";    
    
    return { "data": { "link": `https://${hostUri}/` + _user['displayName'] + "/" + _fakeuploadname + (TEMPORARY_MESSAGE ? ` (${TEMPORARY_MESSAGE})` : ''), "deletehash": _deletehash } };
});

fastify.get('/secret/uploads', async (req, reply) => {
    var uploads = await uploadsCollection.find({}).toArray();
    uploads = uploads.map(x => { return { "uploader_hash ": x.uploader, "filename_hash": crypto.createHash('sha256').update(x.filename, 'utf8').digest('hex') }; });
    return uploads;
});

fastify.get('/me', async (req, reply) => {
    if (!("key" in req.cookies))
    {
        reply.view("private/me-login.ejs");
        return;
    }

    var _key = req.cookies.key;
    var usersWithAKey = await userCollection.find({ 'key': _key }).toArray();
    if (usersWithAKey.length < 1)
    {
        reply.view("private/me-login.ejs");
        return;
    }

    reply.view("/private/me-logged.ejs",
    {
        username: usersWithAKey[0].displayName,
        key: usersWithAKey[0].key,
        canInvite: usersWithAKey[0].can_invite,
        isAdmin: usersWithAKey[0].administrator,
        paint: usersWithAKey[0].paint,
        theme: req.cookies.theme ? req.cookies.theme : "light"
    });
});

async function IncreaseTodayViewStat(uploader)
{
    await individualViewStatsCollection.updateOne({ "uploader": uploader }, { $inc: { "views": 1 } }, { upsert: true });
    await viewStatsCollection.updateOne({ "date": new Date().toLocaleDateString("ru") }, { $inc: { "views": 1 } }, { upsert: true });
}

async function IsAdmin(username)
{
    var user = await userCollection.find({ "displayName": username }).toArray();
    if (user.length < 1)
        return false;
    return user[0].administrator;
}

async function CanInvite(username)
{
    var user = await userCollection.find({ "displayName": username }).toArray();
    if (user.length < 1)
        return false;
    return user[0].can_invite;
}

fastify.get('/:uploader/:index', HandleFileRequest);

async function HandleFileRequest(req, reply) {
    if (req.params.uploader == undefined || req.params.index == undefined)
        return { "error": "No such file exists!" };

    var keyResults = await uploadsCollection.find({ "uploader": crypto.createHash('sha256').update(req.params.uploader, 'utf8').digest('hex'), "filename": req.params.index }).toArray();

    if (keyResults.length < 1)
        return { "error": "No such file exists!" };
    
    await IncreaseTodayViewStat(req.params.uploader);
    
    // filename
    fileName = "";
    if (keyResults[0].original_filename)
        fileName = keyResults[0].original_filename;
    else if (keyResults[0].file_ext)
        fileName = keyResults[0].filename + "." + keyResults[0].file_ext;
    else fileName = keyResults[0].filename;

    if (keyResults[0].mimetype.split("/")[0] == "application")
        reply.header('content-disposition',
        `attachment; filename="${fileName}"`);
    const filestream = await fs.readFileSync(path.join('privateuploads', keyResults[0].actual_filename));
    
    // add a view to the file
    await uploadsCollection.updateOne({ "uploader": req.params.uploader, "filename": req.params.index }, { $inc: { "views": 1 } });
    reply.type(keyResults[0].mimetype).send(filestream);

}

fastify.get('/acceptinvite', async (req, reply) => {
    if (req.query.key == undefined)
        return { "bruh": true };
    var keyResults = await invitesCollection.find({ "key": req.query.key }).toArray();
    if (keyResults.length < 1)
        return { "bruh": true };    

    var _uK = uuidv4();
    await userCollection.insertMany([
        {
            "key": _uK,
            "displayName": keyResults[0].displayName,
            "can_invite": keyResults[0].can_invite,
            "invited_by": keyResults[0].invited_by
        }
    ]);

    await invitesCollection.deleteMany({ "key": req.query.key }, () => { });

    reply.redirect("/setup?key="+_uK);
});

fastify.post('/api/checkKey', async (req, reply) => {
    if (req.body.key == undefined)
        return { "success": false };
    var keyResults = await userCollection.find({ "key": req.body.key }).toArray();
    if (keyResults.length < 1)
        return { "success": false };    

    return { "success": true };
})

fastify.post('/api/delete-all-uploads', async (req, reply) => {
    if (req.body.key == undefined)
        return { "success": false };
    var keyResults = await userCollection.find({ "key": req.body.key }).toArray();
    if (keyResults.length < 1)
        return { "success": false };    

    // get all the actual files and delete them
    var _uploads = await uploadsCollection.find({ "uploader": keyResults[0].displayName }).toArray();
    for (var i = 0; i < _uploads.length; i++)
        fs.unlinkSync(path.join('privateuploads', _uploads[i].actual_filename));
    await uploadsCollection.deleteMany({ "uploader": keyResults[0].displayName }, () => { });

    return { "success": true };
});

fastify.get('/api/leaderboard', async (req, reply) => {
    var _lb = await leaderboardsCollection.find({}).sort({ totalFileSize: -1 }).toArray();
    return { "data": _lb };
});

fastify.get('/api/views-global', async (req, reply) => {
    var _views = await viewStatsCollection.find({}).toArray();

    // sort by date
    _views.sort(function (a, b) {
        return new Date(a.date) - new Date(b.date);
    });

    return { "data": _views };
});

fastify.post('/api/get-individual-uploads', async (req, reply) => {

    if (req.body.key == undefined)
        return { "success": false };
    var keyResults = await userCollection.find({ "key": req.body.key }).toArray();
    if (keyResults.length < 1)
        return { "success": false };    

    var _uploads = await uploadsCollection.find({ "uploader": crypto.createHash('sha256').update(keyResults[0].displayName, 'utf8').digest('hex') }).toArray();

    return { "success": true, "data": _uploads };

});

fastify.post('/api/delete-upload', async (req, reply) => {
    if (req.body.key == undefined || req.body.filename == undefined)
        return { "success": false };
    var keyResults = await userCollection.find({ "key": req.body.key }).toArray();
    if (keyResults.length < 1)
        return { "success": false };    

    var _uploads = await uploadsCollection.find({ "uploader": keyResults[0].displayName, "filename": req.body.filename }).toArray();
    if (_uploads.length < 1)
        return { "success": false };

    await fs.unlinkSync(path.join('privateuploads', _uploads[0].actual_filename));
    await uploadsCollection.deleteMany({ "uploader": keyResults[0].displayName, "filename": req.body.filename }, () => { });
    return { "success": true };
})

fastify.get('/api/views-individual', async (req, reply) => {
    var _views = await individualViewStatsCollection.find({}).toArray();
    return { "data": _views };
});

fastify.get('/api/invitestats', async (req, reply) =>
{
    var _users = await userCollection.find({}).toArray();
    var invitedBy = {};
    for (var i = 0; i < _users.length; i++)
    {
        var _user = _users[i];
        if (_user.invited_by == undefined)
            _user.invited_by = "unknown";
        if (invitedBy[_user.invited_by] == undefined)
            invitedBy[_user.invited_by] = 0;
        invitedBy[_user.invited_by]++;
    }
    return invitedBy;
})

fastify.get('/api/perdate', async (req, reply) => {
    // look up files in privateuploads folder and get the date modified
    var _files = fs.readdirSync('privateuploads');
    var _perDate = {};
    for (var i = 0; i < _files.length; i++)
    {
        var _file = _files[i];
        var _fileDate = fs.statSync(path.join('privateuploads', _file)).mtime;
        var _fileDateStr = _fileDate.getFullYear() + "-" + (_fileDate.getMonth() + 1) + "-" + _fileDate.getDate();
        if (_perDate[_fileDateStr] == undefined)
            _perDate[_fileDateStr] = 0;
        _perDate[_fileDateStr]++;
    }

    // compare and sort dates in ascending order using Date object
    var _perDateSorted = {};
    Object.keys(_perDate).sort(function (a, b) { return new Date(a) - new Date(b) }).forEach(function (key) {
        _perDateSorted[key] = _perDate[key];
    });

    return { "data": _perDateSorted };
});

fastify.get('/api/uploadedthrough', async (req, reply) => {

    var _ut = await uploadsCollection.find().toArray();
    
    var _new = {};
    for (var i = 0; i < _ut.length; i++)
    {
        if (_new[_ut[i].uploaded_thru] == undefined)
            _new[_ut[i].uploaded_thru] = 0;
        _new[_ut[i].uploaded_thru]++;
    }
    return _new;
});


fastify.get('/api/uploadcounts', async (req, reply) => {
    var _uc = await uploadsCollection.find().toArray();
    var perUser = {};
    var fakePerUser = {};
    for (var i = 0; i < _uc.length; i++)
    {
        if (fakePerUser[_uc[i].uploader] == undefined)
            fakePerUser[_uc[i].uploader] = 0;
        fakePerUser[_uc[i].uploader]++;
    }
    
    var _usc = await userCollection.find().toArray();
    for (var i = 0; i < _usc.length; i++)
    {
        var sha256u = crypto.createHash('sha256').update(_usc[i].displayName, 'utf8').digest('hex');
        if (fakePerUser[sha256u] == undefined)
            perUser[_usc[i].displayName] = 0;
        else
            perUser[_usc[i].displayName] = fakePerUser[sha256u];
    }

    return { "data": perUser };
});

fastify.post('/api/admin/get-users', async (req, reply) => {
    if (req.body.key == undefined)
        return { "success": false };
    var keyResults = await userCollection.find({ "key": req.body.key }).toArray();
    if (keyResults.length < 1)
        return { "success": false };
    if (keyResults[0].administrator == undefined || keyResults[0].administrator == false)
        return { "success": false };

    var _users = await userCollection.find({}).toArray();
    for (var i = 0; i < _users.length; i++)
    {
        _users[i].key = "";
    }
    return { "success": true, "data": _users };
});

fastify.post('/api/admin/toggle-admin', async (req, reply) => {
    if (req.body.key == undefined || req.body.username == undefined)
        return { "success": false };
    if (req.body.username == "mishashto")
        return { "success": false };
    var keyResults = await userCollection.find({ "key": req.body.key }).toArray();
    if (keyResults.length < 1)
        return { "success": false };
    if (keyResults[0].administrator == undefined || keyResults[0].administrator == false)
        return { "success": false };

    var _users = await userCollection.find({ "displayName": req.body.username }).toArray();
    if (_users.length < 1)
        return { "success": false };
    var _user = _users[0];
    if (_user.protected)
        return { "success": false };
    if (_user.administrator == undefined)
        _user.administrator = false;
    _user.administrator = !_user.administrator;
    await userCollection.updateOne({
        "displayName": req.body.username
    }, {
        $set: {
            "administrator": _user.administrator
        }
    });
    return { "success": true, "administrator": _user.administrator };
});

fastify.post('/api/admin/get-key', async (req, reply) => {
    if (req.body.key == undefined || req.body.username == undefined)
        return { "success": false };
    if (req.body.username == "mishashto")
        return { "success": false };
    var keyResults = await userCollection.find({ "key": req.body.key }).toArray();
    if (keyResults.length < 1)
        return { "success": false };
    if (keyResults[0].administrator == undefined || keyResults[0].administrator == false)
        return { "success": false };

    var _users = await userCollection.find({ "displayName": req.body.username }).toArray();
    if (_users.length < 1)
        return { "success": false };
    var _user = _users[0];
    if (_user.protected)
        return { "success": false };
    return { "success": true, "key": _user.key };
});

fastify.post('/api/admin/toggle-inviter', async (req, reply) => {
    if (req.body.key == undefined || req.body.username == undefined)
        return { "success": false };
    if (req.body.username == "mishashto")
        return { "success": false };
    var keyResults = await userCollection.find({ "key": req.body.key }).toArray();
    if (keyResults.length < 1)
        return { "success": false };
    if (keyResults[0].administrator == undefined || keyResults[0].administrator == false)
        return { "success": false };

    var _users = await userCollection.find({ "displayName": req.body.username }).toArray();
    if (_users.length < 1)
        return { "success": false };
    var _user = _users[0];
    if (_user.protected)
        return { "success": false };
    if (_user.can_invite == undefined)
        _user.can_invite = false;
    _user.can_invite = !_user.can_invite;
    await userCollection.updateOne({
        "displayName": req.body.username
    }, {
        $set: {
            "can_invite": _user.can_invite
        }
    });
    return { "success": true, "can_invite": _user.can_invite };
});

fastify.post('/api/admin/revoke', async (req, reply) => {
    if (req.body.key == undefined || req.body.username == undefined) {
        return { "success": false };
    }
    if (req.body.username == "mishashto") {
        return { "success": false };
    }
    var keyResults = await userCollection.find({ "key": req.body.key }).toArray();
    if (keyResults.length < 1) {
        return { "success": false };
    }
    if (keyResults[0].administrator == undefined || keyResults[0].administrator == false) {
        return { "success": false };
    }

    var _users = await userCollection.find({ "displayName": req.body.username }).toArray();
    if (_users.length < 1) {
        return { "success": false };
    }
    var _user = _users[0];
    if (_user.protected) {
        return { "success": false };
    }
    await userCollection.deleteOne({
        "displayName": req.body.username
    });

    return { "success": true };
});

fastify.post('/api/admin/get-invites', async (req, reply) => {
    if (req.body.key == undefined ) {
        return { "success": false };
    }

    var keyResults = await userCollection.find({ "key": req.body.key }).toArray();
    if (keyResults.length < 1) {
        return { "success": false };
    }
    if (keyResults[0].administrator == undefined || keyResults[0].administrator == false) {
        return { "success": false };
    }

    var _invites = await invitesCollection.find({}).toArray();
    return { "success": true, "invites": _invites };
});

fastify.post('/api/admin/revoke-invite', async (req, reply) => {
    if (req.body.key == undefined || req.body.invite == undefined ) {
        return { "success": false };
    }

    var keyResults = await userCollection.find({ "key": req.body.key }).toArray();
    if (keyResults.length < 1) {
        return { "success": false };
    }
    if (keyResults[0].administrator == undefined || keyResults[0].administrator == false) {
        return { "success": false };
    }

    // check if invite exists
    var _invites = await invitesCollection.find({ "key": req.body.invite }).toArray();
    if (_invites.length < 1) {
        return { "success": false };
    }

    var _invite = _invites[0];
    await invitesCollection.deleteOne({
        "key": req.body.invite
    });
    return { "success": true };
});

fastify.get('/shame', async (req, reply) => {
    reply.view('views/lb.eta');
});

fastify.get('/api/download-sharex', async (req, reply) => {
    
    // check for the key
    if (req.query.key == undefined)
    {
        reply.code(401); return {"error": "No key provided."};
    }

    // check if the key is valid
    var fetchedUsers = await userCollection.find({ "key": req.query.key }).toArray();
    if (fetchedUsers.length < 1)
        fetchedUsers = [{ displayName: "unknown" }];
    
    // get the user
    const _user = fetchedUsers[0];

    reply.header('Content-Disposition',
        `attachment; filename=${_user.displayName}.sxcu`);
    return {
        "Version": "13.7.0",
        "Name": req.headers['host'],
        "DestinationType": "ImageUploader, TextUploader, FileUploader",
        "RequestMethod": "POST",
        "RequestURL": `https://${req.headers['host']}/uploadImage`,
        "Headers": {
            "Authorization": req.query.key
        },
        "Body": "MultipartFormData",
        "FileFormName": "image",
        "URL": "$json:data.link$"
    };
});

fastify.get('/invite/:inviteCode', async (req, reply) => {

    if (req.params.inviteCode == undefined || req.params.inviteCode == "")
        return { "bruh": true };

    var keyResults = await invitesCollection.find({ "key": req.params.inviteCode }).toArray();

    if (keyResults.length < 1)
        return { "bruh": true };    

    reply.view("private/invite.ejs", {
        "inviteData": keyResults[0]
    });
});

const RESERVED_NAMES = [
    "createInvite",
    "acceptInvite",
    "invite",
    "uploadImage",
    "setup",
    "faq"
];

fastify.post('/api/createInvite', async (req, reply) => {
    if (req.body.key == undefined || req.body.invitee_name == undefined)
        return { "success": false };
    var keyResults = await userCollection.find({ "key": req.body.key }).toArray();
    if (keyResults.length < 1)
        return { "success": false };    

    var _user = keyResults[0];

    if (RESERVED_NAMES.includes(req.body.name))
        return { "success": false };

    var _existingInvites = await invitesCollection.find({ "displayName": req.body.invitee_name }).toArray();
    if (_existingInvites.length > 0)
        return { "success": false };

    var _inviteKey = makeid(12);

    await invitesCollection.insertMany([
        {
            "key": _inviteKey,
            "displayName": req.body.invitee_name,
            "can_invite": false,
            "invited_by": _user.displayName
        }
    ]);

    return { "success": true, "invite_key": _inviteKey };
});

fastify.listen({
    host: '0.0.0.0',
    port: process.env.HTTP_PORT
}).catch((e) => { console.log(e); });
