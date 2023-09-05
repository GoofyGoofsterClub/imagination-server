export default async function addUpload(db, username)
{
    let _user = await db.getDocument("users", {
        "displayName": username
    });

    if (!_user)
        return false;

    await db.updateDocument("users", {
        "displayName": username
    }, { "$inc": {
        "uploads": 1
    }, "$set": {
        "lastUploadTimestamp": Date.now()
     }
    });
}