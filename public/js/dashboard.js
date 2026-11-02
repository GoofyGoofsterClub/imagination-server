window.PageInitializers.dashboard = async function () {
document.getElementById("__dashboard_login_token").onkeyup = function(event) {
    if (event.keyCode === 13) {
        document.getElementById("__dashboard_login_button").click();
    }
}

document.getElementById("__dashboard_login_button").onclick = function() {
    LockInput();
    let key = document.getElementById("__dashboard_login_token").value;
    if (key == "")
    {
        setDashboardResult("ERROR: You must enter a key to login.");
        UnlockInput();
        return;
    }
    FetchJSON("/api/private/session/info", { headers: { Authorization: key } }).then(async function(data) {
        if (data.success)
        {
            localStorage.setItem("key", key);
            window.dashboardSession = { key, data: data.data };
            ChangePage("dashboard-logged");
        }
        else
        {
            setDashboardResult("ERROR: " + data.error);
            UnlockInput();
        }
    }).catch(error => {
        setDashboardResult(error.status === 429 ? 'Too many attempts. Please wait and retry.' : error.message);
        UnlockInput();
    });

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
