CheckLogin();

document.getElementById("__dashboard_login_button").onclick = function() {
    LockInput();
    let key = document.getElementById("__dashboard_login_token").value;
    if (key == "")
    {
        setDashboardResult("ERROR: You must enter a key to login.");
        UnlockInput();
        return;
    }
    fetch("/api/private/session/check?key=" + key).then(async function(response) {
        let data = await response.json();
        if (data.success)
        {
            localStorage.setItem("key", key);
            ChangePage("dashboard-logged");
        }
        else
        {
            setDashboardResult("ERROR: Invalid key.");
            UnlockInput();
        }
    });

}

async function CheckLogin()
{
    LockInput();
    let key = localStorage.getItem("key");
    if (key == null)
    {
        UnlockInput();
        return;
    }
    let response = await fetch("/api/private/session/check?key=" + key);
    let data = await response.json();
    if (data.success)
    {
        ChangePage("dashboard-logged");
    }
    else
    {
        UnlockInput();
        localStorage.removeItem("key");
    }
}

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