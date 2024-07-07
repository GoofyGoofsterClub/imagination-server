

window.onload = async () => {
    const ERROR_ELEMENT = document.querySelector("#initialsetup-error-text");
    const INITIALSETUP_FIELDS = {
        "ROOT_USERNAME": document.querySelector("#initialsetup-username"),
        "WEB_TITLE": document.querySelector("#initialsetup-title"),
    }
    const SUBMIT_BUTTON = document.querySelector("button.input-button");

    const AFTER_ROOT_BLOCK = document.querySelector("#initialsetup-rootblock");
    const AFTER_ROOT_USERNAME = document.querySelector("#initialsetup-rootusername");
    const AFTER_ROOT_USERKEY = document.querySelector("#initialsetup-rootuserkey");


    // Actual processing

    SUBMIT_BUTTON.onclick = async () => {
        let validation = Object.values(INITIALSETUP_FIELDS).filter(x => !x.value); // Get all inputs that have their values as empty
        if (validation.length > 0) // If there is at least one empty input box prevent from processing the request.
        {
            ERROR_ELEMENT.innerText = "You must fill in all fields.";
            SUBMIT_BUTTON.disabled = true;
            setTimeout(() => { SUBMIT_BUTTON.disabled = false; }, 1000); // To prevent button spam.
            return;
        }

        // All fields are filled in 

        let initialSetupAPIRequest = await fetch('/api/initial', {
            method: "POST",
            body: JSON.stringify({
                "rootUsername": INITIALSETUP_FIELDS.ROOT_USERNAME.value,
                "webTitle": INITIALSETUP_FIELDS.WEB_TITLE.value
            })
        });

        let initialSetupAPIRequestJSON = await initialSetupAPIRequest.json();

        if (initialSetupAPIRequest.status != 200) // There was en error with saving settings
        {
            ERROR_ELEMENT.innerText = `ERROR: ${initialSetupAPIRequestJSON.error}`;
            return;
        }

        // Everything went smoothly, need to display the key.

        Object.values(INITIALSETUP_FIELDS).map(x => x.disabled = true); // Disable all the fields, so no input changed or created, not like it will affect anything.
        SUBMIT_BUTTON.disabled = true; // Same for the button.
        document.querySelector("body > .content").style.opacity = 0.3; // Make the key box more visible

        AFTER_ROOT_USERNAME.innerText = INITIALSETUP_FIELDS.ROOT_USERNAME.value;
        AFTER_ROOT_USERKEY.value = initialSetupAPIRequestJSON.key;
        AFTER_ROOT_BLOCK.style.display = 'block';
    };
};