import clamp from "utilities/clamp";

export default function calculateRating(uploads, views, daysSinceUpload)
{
    try
    {
        let rating = clamp((uploads / views).toFixed(3) * 10, 0.0, 10.0);


        if (isNaN(rating) || rating == Infinity || rating == -Infinity || rating == views)
            return 0;
        return rating;
    } catch
    {
        return 0;
    }
}