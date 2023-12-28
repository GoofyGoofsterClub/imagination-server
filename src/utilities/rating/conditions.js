export const RatingConditions =
{
    "WarningMessage": 0,
    "LimitInvites": -3,
    "LimitAccess": -10
}

export default async function CheckRating(db, user)
{
    let _user = await db.getDocument("users", {
        "displayName": user
    });

    let rating = _user.rating;

    if (_user.protected)
        return true;

    for (let condition in RatingConditions)
    {
        if (rating <= RatingConditions[condition])
        {
            switch (condition)
            {
                case "WarningMessage":
                case "LimitInvites":
                    break;
                default:
                    break;
            }
        }
    }

    if (rating > 10.1 || rating < -0.1)
    {
        await db.updateDocument("users", {
                "displayName": user
            }, { "$set": {
                "rating": 0,
                "isBanned": true,
                "bannedBy": "uwu"
            } });
        return false;
    }
    return true;
}