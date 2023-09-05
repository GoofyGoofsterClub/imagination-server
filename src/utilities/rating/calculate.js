export default function calculateRating(uploads, views, daysSinceUpload)
{
    try
    {
        let rating = parseFloat((views / uploads)+(uploads*0.00035)-((views / uploads)*2*(daysSinceUpload/120))) ?? 0;
        if (isNaN(rating) || rating == Infinity || rating == -Infinity || rating == views)
            return 0;
        return rating;
    } catch
    {
        return 0;
    }
}