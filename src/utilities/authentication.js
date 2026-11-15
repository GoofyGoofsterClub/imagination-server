export default async function Authenticate(db, key)
{
    let user = await db.getDocument("users", {
        "key": key
    });

    if (user === null)
        return false;

    return user;
}