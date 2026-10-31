function sanitizePaintStyle(value) {
    if (typeof value !== "string" || value.length < 1 || value.length > 2000)
        return "";
    const urls = [...value.matchAll(/url\(\s*([^)]*)\s*\)/gi)].map((m) => m[1].trim().replace(/^(['"])(.*)\1$/, "$2"));
    if (urls.some((u) => !/^(https?:|\/|\.\/)/i.test(u)))
        return "";
    if (/@import|@keyframes|expression\s*\(|behavior\s*:|binding\s*:|-[A-Za-z-]*binding/i.test(value))
        return "";
    return value;
}

window.onload = async () => {
    let response = await fetch('/api/public/session/get?target=' + encodeURIComponent(USERNAME));
    let profileInfo = await response.json();

    if (!profileInfo.success) {
        document.querySelector("#_profile_not_found").style.display = "block";
        document.querySelector("#_profile_error_text").innerText = profileInfo.error;
        return;
    }

    profileInfo = profileInfo.data;
    document.querySelector("#profile-user-name").innerText = profileInfo.displayName;
    document.querySelector("#profile-user-name").style = sanitizePaintStyle(profileInfo.paint);
    document.querySelector("#profile-block-uploads > .profile-info-block-value").innerText = profileInfo.uploads.toLocaleString();
    document.querySelector("#profile-block-views > .profile-info-block-value").innerText = profileInfo.views.toLocaleString();

    if (profileInfo.invitedBy) {
        document.querySelector("#profile-invited-by").innerText = profileInfo.invitedBy;
        document.querySelector("#profile-invited-by").href = "/profile/" + profileInfo.invitedBy;
    } else {
        document.querySelector(".profile-username-holder > .small-text").style.display = "none";
    }

    let badges = profileInfo.badges ?? [];
    if (profileInfo.administrator)
        badges.unshift({ name: "Administrator", image: "1.png" });
    for (const badge of badges) {
        const badgeElement = document.createElement("div");
        let image = typeof badge.image === "string" ? badge.image : "";
        if (image && !/^[A-Za-z0-9._~:/?#@!$-]+$/.test(image) || image.includes(".."))
            image = "";
        if (image.startsWith("http"))
            badgeElement.style.setProperty("--badge-icon", "url('" + image + "')");
        else
            badgeElement.style.setProperty("--badge-icon", "url('/public/img/badges/" + image + "')");
        badgeElement.title = badge.name;
        badgeElement.className = "profile-badge";
        document.querySelector(".profile-badges-blocks").appendChild(badgeElement);
    }

    if (profileInfo.isBanned) {
        document.querySelector(".profile-banned").style.display = "block";
        document.querySelector(".profile").classList.add("banned");
    }
    document.querySelector(".profile").style.display = "block";
};
