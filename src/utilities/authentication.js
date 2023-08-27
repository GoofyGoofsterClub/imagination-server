export default async function Authenticate(db, key)
{
    let existance = await db.checkDocumentExists("users", {
        "key": key
    });

    if (!existance)
        return false;

    let user = await db.getDocument("users", {
        "key": key
    });

    console.log(user);

    return user;
}