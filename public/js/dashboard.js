const API_ENDPOINTS = {
    sessionInfo: '/api/private/session/info',
};

window.PageInitializers.dashboard = async function () {
document.getElementById("__dashboard_login_token").onkeyup = function(event) {
    if (event.keyCode === 13) {
        document.getElementById("__dashboard_login_button").click();
    }
}

document.getElementById("__dashboard_login_button").onclick = async function() {
    LockInput();
    const key = document.getElementById("__dashboard_login_token").value.trim();
    if (key === "")
    {
        setDashboardResult("ERROR: You must enter a key to login.");
        UnlockInput();
        return;
    }
    try {
        const data = await FetchJSON(API_ENDPOINTS.sessionInfo, { headers: { Authorization: key } });
        if (data.success)
        {
            localStorage.setItem("key", key);
            window.dashboardSession = { key, data: data.data };
            ChangePage("dashboard-logged");
        }
        else
        {
            setDashboardResult("ERROR: " + (data.error || "Login failed. Please try again."));
            UnlockInput();
        }
    } catch (error) {
        setDashboardResult(error.status === 429 ? 'Too many attempts. Please wait and retry.'
            : (error.status ? error.message : 'Network error. Please check your connection and retry.'));
        UnlockInput();
    }

}
};

function LockInput()
{
    document.getElementById("__dashboard_login_token").disabled = true;
    document.getElementById("__dashboard_login_button").disabled = true;
}

function UnlockInput()
{
    document.getElementById("__dashboard_login_token").disabled = false;
    document.getElementById("__dashboard_login_button").disabled = false;
}

function setDashboardResult(result_text)
{
    document.getElementById("__dashboard_login_result").innerText = result_text;   
}
