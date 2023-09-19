window.onload = async () =>
{

    let profileInfo = await fetch('/api/public/session/get?target=' + USERNAME);
    profileInfo = await profileInfo.json();

    if (!profileInfo.success)
    {
        document.querySelector("#_profile_not_found").style.display = "block";
        document.querySelector("#_profile_error_text").innerText = profileInfo.error;
        return;
    }

    profileInfo = profileInfo.data;

    console.log(`%cProfile of ${profileInfo.displayName}:
        %cRating: %c${profileInfo.rating}
        %cUploads: %c${profileInfo.uploads}
        %cViews: %c${profileInfo.views}
        %cInvited by: %c${profileInfo.invitedBy ?? "💀"}
        %cBadges: %c${profileInfo.badges.length > 0 ? profileInfo.badges.join(", ") : "mf got no badges 😭"}


        `,
        "color: #fa3ce3",
        "color: #f33333; font-weight: bold", "color: #ffffff",
        "color: #f33333; font-weight: bold", "color: #ffffff",
        "color: #f33333; font-weight: bold", "color: #ffffff",
        "color: #f33333; font-weight: bold", "color: #ffffff",
        "color: #f33333; font-weight: bold", "color: #ffffff",
        "color: #f33333; font-weight: bold", "color: #ffffff",
        "color: #f33333; font-weight: bold", "color: #ffffff",
        "color: #f33333; font-weight: bold", "color: #ffffff",
        "color: #f33333; font-weight: bold", "color: #ffffff");

    document.querySelector("#profile-user-name").innerText = profileInfo.displayName;
    document.querySelector("#profile-user-name").style = profileInfo.paint ?? '';
    document.querySelector("#profile-block-rating > .profile-info-block-value").innerText = profileInfo.rating.toFixed(3);
    document.querySelector("#profile-block-uploads > .profile-info-block-value").innerText = profileInfo.uploads.toLocaleString();
    document.querySelector("#profile-block-views > .profile-info-block-value").innerText = profileInfo.views.toLocaleString();

    if (profileInfo.invitedBy)
    {
        document.querySelector("#profile-invited-by").innerText = profileInfo.invitedBy;
        document.querySelector("#profile-invited-by").href = "/profile/" + profileInfo.invitedBy;
    }
    else
    {
        document.querySelector(".profile-username-holder > .small-text").style.display = "none";
    }

    let ranks2 = [...Ranks].reverse();
    var rank = null;
    for (var i = 0; i < ranks2.length; i++)
    {
        if (profileInfo.rating >= ranks2[i].rating)
            rank = ranks2[i];
    }

    document.querySelector("#profile-picture").src = "/public/img/rating/" + rank.image;

    // Badges
    let badges = profileInfo.badges;
    if (profileInfo.administrator)
        badges.unshift({
            "name": "Administrator",
            "image": "1.png"
        });

    console.log(badges);
    if (badges.length > 0)
    {
        for (var i = 0; i < badges.length; i++)
        {
            let badge = badges[i];
            let badgeElement = document.createElement("div");
            badgeElement.style.setProperty("--badge-icon", "url('/public/img/badges/" + badge.image + "')");
            badgeElement.title = badge.name;
            badgeElement.className = "profile-badge";
            document.querySelector(".profile-badges-blocks").appendChild(badgeElement);
        }
    }

    // Done!
    document.querySelector(".profile").style.display = "block";
};