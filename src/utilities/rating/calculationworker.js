import calculateRating from 'utilities/rating/calculate';
import CheckRating from 'utilities/rating/conditions';

export default async function CalculateRatingWorker(db, output)
{
    output.Log("Starting rating calculation worker...");
    let users = await db.getDocuments("users");

    for (let user of users)
    {
        if(!user.uploads)
            user.uploads = 0;
        if(!user.views)
            user.views = 0;
        if(!user.lastUpload)
            user.lastUpload = Date.now();
        
        let rating = await calculateRating(user.uploads, user.views, (Date.now() - user.lastUpload) / 86400000);
        await db.updateDocument("users", {
            "displayName": user.displayName
        }, { "$set": {
<<<<<<< HEAD
            "rating": rating,
            "views": user.views,
            "uploads": user.uploads,
            "lastUpload": user.lastUpload
=======
            "rating": rating
>>>>>>> f427f41d4c1c9d02a3247070b9b54dbf1c28b31c
        } });
        output.Log(`Calculated rating for ${user.displayName}: ${rating}`);
        await CheckRating(db, user.displayName);
    }
    output.Log("Rating calculation worker finished.");
    setTimeout(() => CalculateRatingWorker(db, output), 600000);
}

