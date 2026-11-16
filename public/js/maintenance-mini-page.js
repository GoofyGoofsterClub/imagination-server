window.PageInitializers.maintenance = function () {
    // window.maintenanceReason is provided by the page bootstrap (private/index.ejs / maintenance.ejs).
    const tag = document.getElementById("maintenance-tag");
    if (tag)
        tag.innerText = window.maintenanceReason || 'Please try again later.';
};
