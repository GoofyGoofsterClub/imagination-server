export const RatingConditions =
{
    "WarningMessage": 0,
    "LimitInvites": -3,
    "LimitAccess": -10
}

export default async function CheckRating(db, user)
{
    let rating = await db.getDocument("users", {
        "displayName": user
    });

    rating = rating.rating;

    for (let condition in RatingConditions)
    {
        if (rating <= RatingConditions[condition])
        {
            switch (condition)
            {
                case "WarningMessage":
                case "LimitInvites":
                    break;
                case "LimitAccess":
                    await db.updateDocument("users", {
                        "displayName": user
                    }, { "$set": {
                        "isBanned": true
                    } });
                    return false;
                default:
                    break;
            }
        }
    }

    if (rating > 10000)
    {
        await db.updateDocument("users", {
                "displayName": user
            }, { "$set": {
                "rating": 0,
                "views": 0,
                "uploads": 0,
                "isBanned": true
            } });
        return false;
    }
    return true;
}