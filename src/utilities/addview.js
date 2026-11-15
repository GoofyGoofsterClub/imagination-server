export default async function addView(db, file, username)
{
    try
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
        await Promise.all([
            db.updateDocument("uploads", {
                "filename": file
            }, { "$inc": {
                "views": 1
            } }),
            db.updateDocument("users", {
                "displayName": username
            }, { "$inc": {
                "views": 1
            } })
        ]);
    }
    catch (error) {
        throw new Error(`Failed to record a view of ${file} for ${username}: ${error.message}`);
    }
}