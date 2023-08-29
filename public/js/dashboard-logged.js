CheckLogin();

var UserInfo = {};
var AllUsers = [];

var PossibleActions = {
    "CopyKey": "Copy Key",
    "Delete": "Revoke access",
    //"1984": "Orwell"
}

async function CheckLogin()
{
    let key = localStorage.getItem("key");
    if (key == null)
    {
        ChangePage("dashboard");
        return;
    }
    let response = await fetch("/api/private/session/check?key=" + key);
    let data = await response.json();
    if (!data.success)
    {
        ChangePage("dashboard");
        return;
    }

    let userInfo = await GetUserInfo();
    if (userInfo.isBanned)
    {
        ChangePage("banned");
        return;
    }

    document.getElementById("__dashboard_logged_displayname").innerText = userInfo.displayName;

    if (userInfo.administrator)
    {
        document.getElementById("__dashboard_logged_users_block").style.display = "block";
        document.getElementById("__dashboard_logged_users_block_unavailable").style.display = "none";
        document.getElementById("__dashboard_logged_invite_block").style.display = "block";
        document.getElementById("__dashboard_logged_invite_block_unavailable").style.display = "none";
    }
    if (userInfo.can_invite)
    {
        document.getElementById("__dashboard_logged_invite_block").style.display = "block";
        document.getElementById("__dashboard_logged_invite_block_unavailable").style.display = "none";
    }

    document.getElementById("__dashboard_logged_invite_button").onclick = async function()
    {
        let key = localStorage.getItem("key");
        let username = document.querySelector("#__dashboard_logged_invite_displayname").value;
        if (username == undefined || username == null || username == "")
        {
            document.getElementById("__dashboard_loggen_invite_result").innerText = "Please enter a valid username.";
            document.getElementById("__dashboard_loggen_invite_result").style.display = "block";
            document.getElementById("__dashboard_loggen_invite_result").classList.add("error-text");
            return;
        }

        let response = await fetch("/api/private/invites/new?key=" + key + "&target=" + username);
        let data = await response.json();
        if (!data.success)
        {
            document.getElementById("__dashboard_loggen_invite_result").innerText = data.error;
            document.getElementById("__dashboard_loggen_invite_result").style.display = "block";
            document.getElementById("__dashboard_loggen_invite_result").classList.add("error-text");
            return;
        }
        
        document.getElementById("__dashboard_loggen_invite_result").innerText = "Invite link: https://" + window.location.host + "/invite/" + data.data.inviteCode;
        document.getElementById("__dashboard_loggen_invite_result").style.display = "block";
        document.getElementById("__dashboard_loggen_invite_result").classList.remove("error-text");

    }

    GetUploads();

    if(userInfo.administrator)
    {
        GetUsers();
    }
}

async function GetUserInfo()
{
    let key = localStorage.getItem("key");
    let response = await fetch("/api/private/session/info?key=" + key);
    let data = await response.json();
    UserInfo = data.data;
    return data.data;
}

async function GetUsers()
{
    let key = localStorage.getItem("key");
    let response = await fetch("/api/private/admin/sessions?key=" + key);

    let data = await response.json();
    if (!data.success)
        return;

    AllUsers = data.data;
    let table = document.getElementById("__dashboard_logged_users_table");
    while (table.rows.length > 1)
    {
        table.deleteRow(1);
    }

    for (let i = 0; i < data.data.length; i++)
    {
        let row = table.insertRow();
        let cell = row.insertCell();
        cell.innerText = data.data[i].displayName;
        cell = row.insertCell();

        cell.style = "max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";

        // admin
        let b = document.createElement("button");
        b.setAttribute("data-user", data.data[i].displayName);
        b.setAttribute("data-value", data.data[i].administrator);
        b.classList.add("input-button");
        b.innerText = data.data[i].administrator ? "✔" : "✖";

        b.onclick = async function()
        {
            this.disabled = true;
            let key = localStorage.getItem("key");
            let user = this.getAttribute("data-user");
            let value = this.getAttribute("data-value") == "true" ? false : true;

            let response = await fetch("/api/private/admin/sessions/modify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "key": key,
                    "target": user,
                    "field": "administrator",
                    "value": Boolean(value)
                })
            });

            let data = await response.json();
            if (!data.success)
            {
                document.getElementById("__dashboard_logged_users_table_error_" + i).innerText = data.error;
                document.getElementById("__dashboard_logged_users_table_error_" + i).style.display = "block";
                document.getElementById("__dashboard_logged_users_table_error_" + i).classList.add("error-text");
                this.disabled = false;
                return;
            }

            this.setAttribute("data-value", value);
            this.innerText = value ? "✔" : "✖";
            this.disabled = false;
        }

        cell.appendChild(b);

        cell = row.insertCell();
        cell.style = "max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";

        // invite
        b = document.createElement("button");
        b.setAttribute("data-user", data.data[i].displayName);
        b.setAttribute("data-value", data.data[i].can_invite);
        b.classList.add("input-button");
        b.innerText = data.data[i].can_invite ? "✔" : "✖";

        b.onclick = async function()
        {
            this.disabled = true;
            let key = localStorage.getItem("key");
            let user = this.getAttribute("data-user");
            let value = this.getAttribute("data-value") == "true" ? false : true;
            
            let response = await fetch("/api/private/admin/sessions/modify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "key": key,
                    "target": user,
                    "field": "can_invite",
                    "value": Boolean(value)
                })
            });

            let data = await response.json();
            if (!data.success)
            {
                document.getElementById("__dashboard_logged_users_table_error_" + i).innerText = data.error;
                document.getElementById("__dashboard_logged_users_table_error_" + i).classList.add("error-text");
                document.getElementById("__dashboard_logged_users_table_error_" + i).style.display = "block";
                this.disabled = false;
                return;
            }

            this.setAttribute("data-value", value);
            this.innerText = value ? "✔" : "✖";
            this.disabled = false;
        }

        cell.appendChild(b);

        // banned
        cell = row.insertCell();
        cell.style = "max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";

        b = document.createElement("button");
        b.setAttribute("data-user", data.data[i].displayName);
        b.setAttribute("data-value", data.data[i].isBanned);

        b.onclick = async function()
        {
            this.disabled = true;
            let key = localStorage.getItem("key");
            let user = this.getAttribute("data-user");
            let value = this.getAttribute("data-value") == "true" ? false : true;

            let response = await fetch("/api/private/admin/sessions/modify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "key": key,
                    "target": user,
                    "field": "isBanned",
                    "value": Boolean(value)
                })
            });

            let data = await response.json();
            if (!data.success)
            {
                document.getElementById("__dashboard_logged_users_table_error_" + i).innerText = data.error;
                document.getElementById("__dashboard_logged_users_table_error_" + i).style.display = "block";
                document.getElementById("__dashboard_logged_users_table_error_" + i).classList.add("error-text");
                this.disabled = false;
                return;
            }

            this.setAttribute("data-value", value);
            this.innerText = value ? "✔" : "✖";
            this.disabled = false;
        }

        b.classList.add("input-button");
        b.innerText = data.data[i].isBanned ? "✔" : "✖";
        cell.appendChild(b);

        cell = row.insertCell();

        let dropdown = document.createElement("select");
        dropdown.classList.add("input-button");
        dropdown.id = "__dashboard_logged_users_table_dropdown_" + i;
        dropdown.innerHTML = `
            <option value="none" selected disabled>None</option>`;

        for (let action in PossibleActions)
        {
            let option = document.createElement("option");
            option.value = action;
            option.innerText = PossibleActions[action];
            dropdown.appendChild(option);
        }

        cell.appendChild(dropdown);

        cell = row.insertCell();
        let button = document.createElement("button");
        button.innerText = "Confirm";
        button.classList.add("input-button");
        button.classList.add("button-green");
        button.onclick = async function()
        {}
        cell.appendChild(button);
        // add p with error text to the same cell but below
        let p = document.createElement("p");
        p.id = "__dashboard_logged_users_table_error_" + i;
        p.classList.add("small-text");
        p.style = "display: none";
        cell.appendChild(p);
    }
}

async function logOutLoggedIn()
{
    localStorage.removeItem("key");
    ChangePage("dashboard");
}

async function DownloadSharex()
{
    document.getElementById("__dashboard_logged_sharex_button").disabled = true;
    // localhost:8080/api/public/session/sharex?key=
    let key = localStorage.getItem("key");
    let response = await fetch("/api/public/session/sharex?key=" + key);
    if (response.status != 200)
    {
        alert("An error occurred while downloading the ShareX config. Please try again later.");
        document.getElementById("__dashboard_logged_sharex_button").disabled = false;
        return;
    }

    // download the file
    let data = await response.blob();
    let url = window.URL.createObjectURL(data);
    let a = document.createElement('a');
    a.href = url;
    a.download = "sharex.sxcu";
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() =>
    {
        document.getElementById("__dashboard_logged_sharex_button").disabled = false;
    }, 3000);
}

async function GetUploads()
{
    let key = localStorage.getItem("key");
    let response = await fetch("/api/private/session/uploads?key=" + key);
    let data = await response.json();
    if (!data.success)
    {
        document.getElementById("__dashboard_logged_uploads_table_info").innerText = "An error occurred while fetching your uploads.";
        document.getElementById("__dashboard_logged_uploads_table_info").classList.add("error-text");
        return;
    }

    if (data.data.length == 0)
    {
        document.getElementById("__dashboard_logged_uploads_table_info").innerText = "You have no uploads.";
        return;
    }

    data.data.sort((a, b) => (a.timestamp > b.timestamp) ? -1 : 1);

    document.getElementById("__dashboard_logged_uploads_count").innerText = data.data.length;

    let table = document.getElementById("__dashboard_logged_uploads_table");
    while (table.rows.length > 1)
        table.deleteRow(1);

    for (let i = 0; i < data.data.length; i++)
    {
        let row = table.insertRow();
        row.id = "__dashboard_logged_uploads_table_row_" + i;
        let cell = row.insertCell();
        cell.innerHTML = `<a href="https://${window.location.host}/${UserInfo.displayName}/${data.data[i].filename}"><span class="code">[${data.data[i].filename}]</span></a>`;
        cell = row.insertCell();
        cell.innerText = data.data[i] == undefined ? "Unknown" : new Date(data.data[i].timestamp).toLocaleString();
        cell = row.insertCell();
        cell.innerText = data.data[i].uploaded_thru == undefined ? "Unknown" : data.data[i].uploaded_thru;
        cell = row.insertCell();
        let button = document.createElement("button");
        button.innerText = "Delete";
        button.classList.add("input-button");
        button.classList.add("button-red");
        button.onclick = async function()
        {
            DeleteFile(i, data.data[i].filename);
        }
        cell.appendChild(button);

        var _p = document.createElement("p");
        _p.innerText = "";
        _p.id = "__dashboard_logged_uploads_table_error_" + i;
        _p.classList.add("small-text");
        _p.classList.add("error-text");
        cell.appendChild(_p);
    }
}

async function DeleteFile(index, filename, deletehash)
{
    let key = localStorage.getItem("key");
    let response = await fetch("/api/private/uploads/delete?key=" + key + "&filename=" + filename + "&deletehash=" + deletehash);
    let data = await response.json();
    if (!data.success)
    {
        document.getElementById("__dashboard_logged_uploads_table_error_" + index).innerText = data.error;
        document.getElementById("__dashboard_logged_uploads_table_error_" + index).style.display = "block";
        return;
    }

    document.querySelector("#__dashboard_logged_uploads_table_row_" + index).remove();
}