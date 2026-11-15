export default async function Authenticate(db, key)
{
    let existence = await db.checkDocumentExists("users", {
        "key": key
    });

    if (!existence)
        return false;

    let user = await db.getDocument("users", {
        "key": key
    });

    return user;
}