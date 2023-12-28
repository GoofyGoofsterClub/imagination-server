export default function calculateRating(uploads, views, daysSinceUpload)
{
    try
    {
        let rating = (views / uploads).toFixed(3) * 10;
        if (isNaN(rating) || rating == Infinity || rating == -Infinity || rating == views)
            return 0;
        return rating;
    } catch
    {
        return 0;
    }
}