window.PageInitializers.maintenance = function () {
    document.getElementById("maintenance-tag").innerText = window.maintenanceReason || 'Please try again later.';
};
