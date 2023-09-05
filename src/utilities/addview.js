export default async function addView(db, file, username)
{
    let _file = await db.getDocument("uploads", {
        "filename": file
    });

    if (!_file)
        return false;

    let _user = await db.getDocument("users", {
        "displayName": username
    });

    if (!_user)
        return false;
    await db.updateDocument("uploads", {
        "filename": file
    }, { "$inc": {
        "views": 1
    } });

    await db.updateDocument("users", {
        "displayName": username
    }, { "$inc": {
        "views": 1
    } });
}