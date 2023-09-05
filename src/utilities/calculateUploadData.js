import hash from "utilities/hash";

export default async function calculateUploadCount(db, user)
{
    user = hash(user);

    let uploads = await db.getDocuments("uploads", {
        "uploader": user
    });

    return uploads.length;
}

export async function calculateUploadViews(db, user)
{
    user = hash(user);

    let uploads = await db.getDocuments("uploads", {
        "uploader": user
    });

    let views = 0;

    for (let upload of uploads)
        views += upload.views ?? 0;

    return views;
}