CheckLogin();

var UserInfo = {};
var AllUsers = [];

var PossibleActions = {
    "Delete": "Revoke access",
}

function selectText(nodeId) {
    const node = document.getElementById(nodeId);

    if (document.body.createTextRange) {
        const range = document.body.createTextRange();
        range.moveToElementText(node);
        range.select();
    } else if (window.getSelection) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        console.warn("Could not select text in node: Unsupported browser.");
    }
}

async function CheckLogin() {
    let key = localStorage.getItem("key");
    if (key == null) {
        ChangePage("dashboard");
        return;
    }
    let response = await fetch("/api/private/session/check?key=" + key);
    let data = await response.json();
    if (!data.success) {
        ChangePage("dashboard");
        return;
    }

    let userInfo = await GetUserInfo();
    if (userInfo.isBanned) {
        ChangePage("banned");
        return;
    }

    document.getElementById("__dashboard_logged_displayname").innerText = userInfo.displayName;

    if (userInfo.administrator) {
        document.getElementById("__dashboard_logged_users_block").style.display = "block";
        document.getElementById("__dashboard_logged_users_block_unavailable").style.display = "none";
        document.getElementById("__dashboard_logged_invite_block").style.display = "block";
        document.getElementById("__dashboard_logged_invite_block_unavailable").style.display = "none";
    }
    if (userInfo.can_invite) {
        document.getElementById("__dashboard_logged_invite_block").style.display = "block";
        document.getElementById("__dashboard_logged_invite_block_unavailable").style.display = "none";
    }

    if (userInfo.superuser) {
        document.querySelector("#__dashboard_logged_dangerzone").style.display = "block";
    }

    document.getElementById("__dashboard_logged_web_upload_button").onclick = async function () {
        await document.getElementById("__dashboard_logged_web_upload_hidden_selector").click();
    }
    document.getElementById("__dashboard_logged_web_upload_hidden_selector").onchange = async function () {
        let file = document.getElementById("__dashboard_logged_web_upload_hidden_selector").files[0];
        if (file == undefined || file == null) {
            document.getElementById("__dashboard_logged_web_upload_error").innerText = "Please select a file.";
            document.getElementById("__dashboard_logged_web_upload_error").style.display = "block";
            document.getElementById("__dashboard_logged_web_upload_error").classList.add("error-text");
            return;
        }
        let key = localStorage.getItem("key");
        document.getElementById("__dashboard_logged_web_upload_progress").style.width = "0%";
        let formData = new FormData();
        formData.append("file", file);

        // upload and update progress bar on the way
        let response = new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/private/uploads/new");
            xhr.setRequestHeader("Authorization", key);
            xhr.upload.onprogress = function (e) {
                if (e.lengthComputable) {
                    let percent = Math.round((e.loaded / e.total) * 100);
                    document.getElementById("__dashboard_logged_web_upload_progress").style.width = percent + "%";
                }
            }
            xhr.onload = function () {
                resolve(xhr.response);
            }
            xhr.onerror = function () {
                reject(xhr.statusText);
            }
            xhr.send(formData);
        });

        let data = await response;
        data = JSON.parse(data);

        if (!data.success) {
            document.getElementById("__dashboard_logged_web_upload_error").innerText = data.error;
            document.getElementById("__dashboard_logged_web_upload_error").style.display = "block";
            document.getElementById("__dashboard_logged_web_upload_error").classList.add("error-text");
            return;
        }
        document.getElementById("__dashboard_logged_web_upload_error").innerHTML = `Uploaded successfully: <a id="link-selector0" href="${data.data.link}">${data.data.link}</a>`;
        document.getElementById("__dashboard_logged_web_upload_error").style.display = "block";
        document.getElementById("__dashboard_logged_web_upload_error").classList.remove("error-text");
        selectText('link-selector0');
    }

    document.getElementById("__dashboard_logged_delete_all").onclick = async function () {
        let key = localStorage.getItem("key");
        let response = await fetch("/api/private/uploads/delete?key=" + key + "&filename=*");
        let data = await response.json();
        if (!data.success) {
            return;
        }

        GetUploads();
    }

    document.getElementById("__dashboard_logged_usernamechange_button").onclick = async function () {
        document.getElementById("__dashboard_logged_usernamechange_button").disabled = true;
        document.getElementById("__dashboard_logged_usernamechange_displayname").disabled = true;

        let key = localStorage.getItem("key");
        let new_name = document.querySelector("#__dashboard_logged_usernamechange_displayname").value;
        if (!new_name) {
            document.getElementById("__dashboard_logged_usernamechange_button").disabled = false;
            document.getElementById("__dashboard_logged_usernamechange_displayname").disabled = false;
            return;
        }

        let response = await fetch(`/api/private/session/changeusername?key=${key}&new_name=${new_name}`);
        let data = await response.json();
        if (!data.success) {
            document.querySelector("#__dashboard_logged_web_usernamechange_error").innerText = data.error ?? 'Unknown error occured';
            document.getElementById("__dashboard_logged_web_usernamechange_error").classList.add("error-text");
            document.getElementById("__dashboard_logged_usernamechange_button").disabled = false;
            document.getElementById("__dashboard_logged_usernamechange_displayname").disabled = false;
            return;
        }

        document.querySelector("#__dashboard_logged_web_usernamechange_error").innerText = 'Successfully changed display name! Please reload the page.';
        document.getElementById("__dashboard_logged_web_usernamechange_error").classList.remove("error-text");
    }

    document.querySelector("#__dashboard_logged_invite_displayname").onkeyup = function (e) {
        if (e.keyCode == 13) {
            document.getElementById("__dashboard_logged_invite_button").click();
        }
    }

    document.getElementById("__dashboard_logged_invite_button").onclick = async function () {
        let key = localStorage.getItem("key");
        let username = document.querySelector("#__dashboard_logged_invite_displayname").value;
        if (username == undefined || username == null || username == "") {
            document.getElementById("__dashboard_loggen_invite_result").innerText = "Please enter a valid username.";
            document.getElementById("__dashboard_loggen_invite_result").style.display = "block";
            document.getElementById("__dashboard_loggen_invite_result").classList.add("error-text");
            return;
        }

        let response = await fetch("/api/private/invites/new?key=" + key + "&target=" + username);
        let data = await response.json();
        if (!data.success) {
            document.getElementById("__dashboard_loggen_invite_result").innerText = data.error;
            document.getElementById("__dashboard_loggen_invite_result").style.display = "block";
            document.getElementById("__dashboard_loggen_invite_result").classList.add("error-text");
            return;
        }

        document.getElementById("__dashboard_loggen_invite_result").innerText = "Invite link: https://" + window.location.host + "/invite/" + data.data.inviteCode;
        document.getElementById("__dashboard_loggen_invite_result").style.display = "block";
        document.getElementById("__dashboard_loggen_invite_result").classList.remove("error-text");
    }

    let dangerZonePressed = false;

    document.getElementById("__dashboard_logged_access_danger_zone").onclick = async function () {
        if (!dangerZonePressed) {
            document.getElementById("__dashboard_logged_access_danger_zone").disabled = true;
            document.getElementById("__dashboard_logged_access_danger_zone").innerText = "Are you sure?";
            dangerZonePressed = true;
            setTimeout(() => { document.getElementById("__dashboard_logged_access_danger_zone").disabled = false; }, 3000);
            return;
        }

        ChangePage("dangerzone");
    }


    document.getElementById("__dashboard_logged_delete_account_button_DO_NOT_CLICK").onclick = async function () {
        document.getElementById("__dashboard_logged_delete_account_button_DO_NOT_CLICK").disabled = true;
        let confirmationUsername = document.getElementById("__dashboard_logged_delete_account_input").value;
        let _resp = await fetch('/api/private/session/delete?key=' + key + '&confirmation=' + confirmationUsername);
        _resp = await _resp.json();

        if (!_resp.success) {
            document.getElementById("__dashboard_logged_delete_account_error_text").innerText = _resp.error;
            document.getElementById("__dashboard_logged_delete_account_button_DO_NOT_CLICK").disabled = false;
            return;
        }

        location.reload();
    }

    setupDashboardFilters();
    GetUploads();

    if (userInfo.administrator) {
        GetUsers();
    }
}

async function GetUserInfo() {
    let key = localStorage.getItem("key");
    let response = await fetch("/api/private/session/info?key=" + key);
    let data = await response.json();
    UserInfo = data.data;
    return data.data;
}

async function GetUsersLegacy() {
    let key = localStorage.getItem("key");
    let response = await fetch("/api/private/admin/sessions?key=" + key);

    let data = await response.json();
    if (!data.success)
        return;

    AllUsers = data.data;
    let table = document.getElementById("__dashboard_logged_users_table");
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }

    for (let i = 0; i < data.data.length; i++) {
        let row = table.insertRow();
        row.id = "__dashboard_logged_users_table_row_" + i;
        let cell = row.insertCell();
        let image = document.createElement("img");

        image.setAttribute("data-tooltip", `Click to open profile`);
        image.src = "/public/img/badges/1.png";
        image.onclick = () => { location.href = `/profile/${data.data[i].username}`; }
        image.style = "max-width: 48px; max-height: 48px; vertical-align: middle; margin-right: 12px; border-radius: 999px;";
        if (data.data[i].banned)
            image.style.filter = "grayscale(100%)";
        cell.appendChild(image);

        let userName = document.createElement("span");
        userName.innerText = data.data[i].username;
        userName.style = "vertical-align: middle;";
        cell.appendChild(userName);

        cell = row.insertCell();

        cell.style = "max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";

        // admin
        let b = document.createElement("button");
        b.setAttribute("data-user", data.data[i].username);
        b.setAttribute("data-value", data.data[i].administrator);
        b.classList.add("input-button");
        // b.innerText = data.data[i].administrator ? "✔" : "✖";
        b.innerText = "?";
        b.disabled = true;

        b.onclick = async function () {
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
            if (!data.success) {
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
        b.setAttribute("data-user", data.data[i].username);
        b.setAttribute("data-value", data.data[i].can_invite);
        b.classList.add("input-button");
        // b.innerText = data.data[i].can_invite ? "✔" : "✖";
        b.innerText = "?";
        b.disabled = true;

        b.onclick = async function () {
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
            if (!data.success) {
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
        b.setAttribute("data-user", data.data[i].username);
        b.setAttribute("data-value", data.data[i].banned);

        b.onclick = async function () {
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
                        "field": "banned",
                        "value": Boolean(value)
                    })
                });

            let data = await response.json();
            if (!data.success) {
                document.getElementById("__dashboard_logged_users_table_error_" + i).innerText = data.error;
                document.getElementById("__dashboard_logged_users_table_error_" + i).style.display = "block";
                document.getElementById("__dashboard_logged_users_table_error_" + i).classList.add("error-text");
                this.disabled = false;
                return;
            }

            this.setAttribute("data-value", value);
            this.innerText = value ? "✔" : "✖";
            document.querySelector("#__dashboard_logged_users_table_row_" + i + " > td > img").style.filter = value ? "grayscale(100%)" : "none";
            this.disabled = false;
        }

        b.classList.add("input-button");
        b.innerText = data.data[i].banned ? "✔" : "✖";
        cell.appendChild(b);

        cell = row.insertCell();

        let dropdown = document.createElement("select");
        dropdown.classList.add("input-button");
        dropdown.id = "__dashboard_logged_users_table_dropdown_" + i;
        dropdown.innerHTML = `
            <option value="none" selected disabled>None</option>`;

        for (let action in PossibleActions) {
            let option = document.createElement("option");
            option.value = action;
            option.innerText = PossibleActions[action];
            dropdown.appendChild(option);
        }

        cell.appendChild(dropdown);

        cell = row.insertCell();
        let button = document.createElement("button");
        button.setAttribute("data-user", data.data[i].username);
        button.innerText = "Confirm";
        button.classList.add("input-button");
        button.classList.add("button-green");
        button.onclick = async function () {
            this.disabled = true;
            let key = localStorage.getItem("key");
            let user = this.getAttribute("data-user");
            let action = document.getElementById("__dashboard_logged_users_table_dropdown_" + i).value;

            switch (action) {
                case "CopyKey":
                    let response = await fetch("/api/private/admin/sessions/get?key=" + key + "&target=" + user + "&field=key");
                    let data = await response.json();
                    if (!data.success) {
                        document.getElementById("__dashboard_logged_users_table_error_" + i).innerText = data.error;
                        document.getElementById("__dashboard_logged_users_table_error_" + i).style.display = "block";
                        document.getElementById("__dashboard_logged_users_table_error_" + i).classList.add("error-text");
                        this.disabled = false;
                        return;
                    }

                    navigator.clipboard.writeText(data.data);

                    document.getElementById("__dashboard_logged_users_table_error_" + i).innerText = "Copied key to clipboard.";
                    document.getElementById("__dashboard_logged_users_table_error_" + i).style.display = "block";
                    document.getElementById("__dashboard_logged_users_table_error_" + i).classList.remove("error-text");

                    this.disabled = false;
                    break;
                case "Delete":
                    let response2 = await fetch("/api/private/admin/sessions/remove?key=" + key + "&target=" + user);
                    let data2 = await response2.json();
                    if (!data2.success) {
                        document.getElementById("__dashboard_logged_users_table_error_" + i).innerText = data2.error;
                        document.getElementById("__dashboard_logged_users_table_error_" + i).style.display = "block";
                        document.getElementById("__dashboard_logged_users_table_error_" + i).classList.add("error-text");
                        this.disabled = false;
                        return;
                    }

                    document.getElementById("__dashboard_logged_users_table_row_" + i).remove();
                    this.disabled = false;
                    break;
                case "1984":
                    this.disabled = false;
                    break;
                case "none":
                    document.getElementById("__dashboard_logged_users_table_error_" + i).innerText = "Please select an action.";
                    document.getElementById("__dashboard_logged_users_table_error_" + i).style.display = "block";
                    document.getElementById("__dashboard_logged_users_table_error_" + i).classList.add("error-text");
                    this.disabled = false;
                    break;
                default:
                    document.getElementById("__dashboard_logged_users_table_error_" + i).innerText = "Invalid action.";
                    document.getElementById("__dashboard_logged_users_table_error_" + i).style.display = "block";
                    document.getElementById("__dashboard_logged_users_table_error_" + i).classList.add("error-text");
                    this.disabled = false;
                    break;
            }

        }
        cell.appendChild(button);
        // add p with error text to the same cell but below
        let p = document.createElement("p");
        p.id = "__dashboard_logged_users_table_error_" + i;
        p.classList.add("small-text");
        p.style = "display: none";
        cell.appendChild(p);
    }
}

function logOutLoggedIn() {
    localStorage.removeItem("key");
    ChangePage("dashboard");
}

async function DownloadSharex() {
    document.getElementById("__dashboard_logged_sharex_button").disabled = true;
    // localhost:8080/api/public/session/sharex?key=
    let key = localStorage.getItem("key");
    let response = await fetch("/api/public/session/sharex?key=" + key);
    if (response.status != 200) {
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

    setTimeout(() => {
        document.getElementById("__dashboard_logged_sharex_button").disabled = false;
    }, 3000);
}

async function GetUsers() {
    const page = window.dashboardUsersPage || 1;
    const search = document.getElementById("__dashboard_logged_users_search").value.trim();
    const key = localStorage.getItem("key");
    const response = await fetch(`/api/private/admin/sessions?key=${encodeURIComponent(key)}&page=${page}&search=${encodeURIComponent(search)}`);
    const data = await response.json();
    if (!data.success) return;

    window.dashboardUsersPage = data.page;
    const table = document.getElementById("__dashboard_logged_users_table");
    while (table.rows.length > 1) table.deleteRow(1);
    data.data.forEach((user, index) => {
        const row = table.insertRow();
        row.id = `__dashboard_logged_users_table_row_${index}`;
        const name = row.insertCell();
        const profileLink = document.createElement("a");
        profileLink.href = `/profile/${encodeURIComponent(user.username)}`;
        profileLink.textContent = user.username;
        name.appendChild(profileLink);
        const admin = row.insertCell();
        const adminButton = document.createElement("button");
        adminButton.className = "input-button";
        adminButton.innerText = user.administrator ? "✔" : "✖";
        adminButton.onclick = () => modifyUserPermission(user, "administrator", adminButton);
        admin.appendChild(adminButton);
        const invite = row.insertCell();
        const inviteButton = document.createElement("button");
        inviteButton.className = "input-button";
        inviteButton.innerText = user.can_invite ? "✔" : "✖";
        inviteButton.onclick = () => modifyUserPermission(user, "can_invite", inviteButton);
        invite.appendChild(inviteButton);
        const banned = row.insertCell();
        const bannedButton = document.createElement("button");
        bannedButton.className = "input-button";
        bannedButton.innerText = user.banned ? "✔" : "✖";
        bannedButton.onclick = () => modifyUserPermission(user, "banned", bannedButton);
        banned.appendChild(bannedButton);
        const actions = row.insertCell();
        actions.innerText = user.superuser ? "Protected" : "";
    });
    updatePagination("users", data);
}

async function modifyUserPermission(user, field, button) {
    button.disabled = true;
    const response = await fetch("/api/private/admin/sessions/modify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: localStorage.getItem("key"), target: user.username, field, value: !(field === "administrator" ? user.administrator : field === "can_invite" ? user.can_invite : user.banned) })
    });
    const data = await response.json();
    if (data.success) {
        if (field === "administrator") user.administrator = !user.administrator;
        if (field === "can_invite") user.can_invite = !user.can_invite;
        if (field === "banned") user.banned = !user.banned;
        button.innerText = (field === "administrator" ? user.administrator : field === "can_invite" ? user.can_invite : user.banned) ? "✔" : "✖";
    } else alert(data.error || "Unable to update user.");
    button.disabled = false;
}

async function GetUploadsLegacy() {
    let key = localStorage.getItem("key");
    let response = await fetch("/api/private/session/uploads?key=" + key);
    let data = await response.json();
    let table = document.getElementById("__dashboard_logged_uploads_table");
    while (table.rows.length > 1)
        table.deleteRow(1);
    if (!data.success) {
        document.getElementById("__dashboard_logged_uploads_table_info").innerText = "An error occurred while fetching your uploads.";
        document.getElementById("__dashboard_logged_uploads_table_info").classList.add("error-text");
        return;
    }

    if (data.data.length == 0) {
        if (document.getElementById("__dashboard_logged_uploads_table_info"))
            document.getElementById("__dashboard_logged_uploads_table_info").innerText = "You have no uploads.";
        return;
    }

    data.data.sort((a, b) => (a.timestamp > b.timestamp) ? -1 : 1);

    document.getElementById("__dashboard_logged_uploads_count").innerText = data.data.length;

    for (let i = 0; i < data.data.length; i++) {
        let row = table.insertRow();
        row.id = "__dashboard_logged_uploads_table_row_" + i;
        let cell = row.insertCell();
        cell.innerHTML = `<a href="https://${window.location.host}/${UserInfo.displayName}/${data.data[i].filename}"><span class="code">[${data.data[i].filename}]</span></a>`;
        cell = row.insertCell();
        cell.innerText = data.data[i] == undefined ? "Unknown" : new Date(parseInt(data.data[i].upload_time) * 1000).toLocaleString();
        cell = row.insertCell();
        cell.innerText = data.data[i].upload_domain ?? "Unknown";
        cell = row.insertCell();
        let button = document.createElement("button");
        button.innerText = "Delete";
        button.classList.add("input-button");
        button.classList.add("button-red");
        button.onclick = async function () {
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

function updatePagination(type, data) {
    const label = document.getElementById(`__dashboard_logged_${type}_pagination`);
    const previous = document.getElementById(`__dashboard_logged_${type}_previous`);
    const next = document.getElementById(`__dashboard_logged_${type}_next`);
    label.innerText = data.total === 0 ? "No results" : `Page ${data.page} of ${data.totalPages} (${data.total} total)`;
    previous.disabled = data.page <= 1;
    next.disabled = data.page >= data.totalPages;
    previous.onclick = () => { window[`dashboard${type[0].toUpperCase()}${type.slice(1)}Page`] = data.page - 1; type === "users" ? GetUsers() : GetUploads(); };
    next.onclick = () => { window[`dashboard${type[0].toUpperCase()}${type.slice(1)}Page`] = data.page + 1; type === "users" ? GetUsers() : GetUploads(); };
}

async function GetUploads() {
    const page = window.dashboardUploadsPage || 1;
    const params = new URLSearchParams({ key: localStorage.getItem("key"), page, search: document.getElementById("__dashboard_logged_uploads_search").value.trim() });
    const from = document.getElementById("__dashboard_logged_uploads_from").value;
    const to = document.getElementById("__dashboard_logged_uploads_to").value;
    if (from) params.set("from", Math.floor(new Date(from).getTime() / 1000));
    if (to) params.set("to", Math.floor(new Date(to).getTime() / 1000));
    const response = await fetch(`/api/private/session/uploads?${params}`);
    const data = await response.json();
    const table = document.getElementById("__dashboard_logged_uploads_table");
    while (table.rows.length > 1) table.deleteRow(1);
    if (!data.success) return;
    window.dashboardUploadsPage = data.page;
    document.getElementById("__dashboard_logged_uploads_count").innerText = data.total;
    data.data.forEach((upload, index) => {
        const row = table.insertRow();
        row.id = `__dashboard_logged_uploads_table_row_${index}`;
        row.insertCell().innerHTML = `<a href="https://${window.location.host}/${UserInfo.displayName}/${encodeURIComponent(upload.filename)}"><span class="code">[${upload.filename}]</span></a>`;
        row.insertCell().innerText = new Date(Number(upload.upload_time) * 1000).toLocaleString();
        row.insertCell().innerText = upload.upload_domain || "Unknown";
        const action = row.insertCell();
        const button = document.createElement("button");
        button.innerText = "Delete"; button.className = "input-button button-red";
        button.onclick = () => DeleteFile(index, upload.filename);
        action.appendChild(button);
    });
    updatePagination("uploads", data);
}

function setupDashboardFilters() {
    document.getElementById("__dashboard_logged_users_search_button").onclick = () => { window.dashboardUsersPage = 1; GetUsers(); };
    document.getElementById("__dashboard_logged_users_search").onkeydown = (event) => { if (event.key === "Enter") document.getElementById("__dashboard_logged_users_search_button").click(); };
    document.getElementById("__dashboard_logged_uploads_search_button").onclick = () => { window.dashboardUploadsPage = 1; GetUploads(); };
}

async function DeleteFile(index, filename, deletehash) {
    let key = localStorage.getItem("key");
    let response = await fetch("/api/private/uploads/delete?key=" + key + "&filename=" + filename + "&deletehash=" + deletehash);
    let data = await response.json();
    if (!data.success) {
        document.getElementById("__dashboard_logged_uploads_table_error_" + index).innerText = data.error;
        document.getElementById("__dashboard_logged_uploads_table_error_" + index).style.display = "block";
        return;
    }

    document.querySelector("#__dashboard_logged_uploads_table_row_" + index).remove();
}