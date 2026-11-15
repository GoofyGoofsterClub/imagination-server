export default async function Authenticate(db, key)
{
    try
    {
        let user = await db.getDocument("users", {
            "key": key
        });

        if (user === null)
            return false;

        return user;
    }
    catch (error) {
        console.error(`[err][authentication] Authentication service unavailable: ${error.message}`);
        return false;
    }
}