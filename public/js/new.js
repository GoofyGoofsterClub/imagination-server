var keystrokes = "";

document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName == "INPUT" || document.activeElement.tagName == "TEXTAREA")
        return;

    if (e.key.length == 1) {
        keystrokes += e.key;
    }

    if (keystrokes.length > 10)
        keystrokes = keystrokes.substring(1);

    if (keystrokes.includes("arab"))
    {
        document.querySelector('.anime-girl').src = "/public/img/censored-sagiri.png";
        keystrokes = "";
    }
    if (keystrokes.includes("tv"))
    {
        document.querySelector('.anime-girl').src = "/public/img/censored-sagiri2.png";
    }
    if (keystrokes.includes("scp"))
    {
        document.querySelector('.anime-girl').src = "/public/img/scp-sagiri.png";
    }
});

window.onload = async () => {
    // get the text after # in url
    var url = window.location.href;
    var urlSplit = url.split('#');
    var urlHash = urlSplit[urlSplit.length - 1];

    Translatable.setGlobalTranslationObject(await Translatable.getTranslationObject());
    Translatable.setAvailableLanguages(Translatable.getLanguages(globalTranslationObject));

    let languageStored = localStorage.getItem("language");

    if(languageStored && availableLanguages.includes(languageStored))
        Translatable.setLanguage(languageStored);
    else
    {
        Translatable.setLanguage(availableLanguages[0]);
        localStorage.setItem("language", availableLanguages[0]);
    }

    let languageSelector = document.querySelector("#__main_language_select");
    
    for (var l = 0; l < availableLanguages.length; l++)
    {
        let newLanguageOption = document.createElement("option");
        newLanguageOption.id = availableLanguages[l];
        newLanguageOption.innerText = Translatable.getTranslationKey(availableLanguages[l], "language-name");

        if (newLanguageOption.id == CurrentLanguage)
            newLanguageOption.selected = true;

        languageSelector.appendChild(newLanguageOption);
    }

    languageSelector.onchange = function(event)
    {
        Translatable.setLanguage(event.target.options[event.target.selectedIndex].id);
        localStorage.setItem("language", event.target.options[event.target.selectedIndex].id);
        Translatable.translateGroup(Translatable.find("body"), CurrentLanguage);
    }

    // if there is no hash, set it to home
    if (urlHash == url) urlHash = 'welcome';

    // get the element with the hash
    var target = document.querySelector(`.nav-el[data-content="${urlHash}"]`);
    if (target == null) target = document.querySelector(`.nav-el[data-content="welcome"]`);
    target.classList.add("current");

    var newData = await fetch('/public/popovers/' + target.getAttribute('data-content') + '.html');
    var newDataText = await newData.text();
    document.querySelector('body>.content').innerHTML = newDataText;

    Translatable.translateGroup(Translatable.find("body"), CurrentLanguage);

    anime({
        targets: 'body>.content',
        opacity: 1,
        translateY: 0,
        duration: 200,
        easing: 'linear'
    });

    anime({
        targets: 'body',
        opacity: 1,
        duration: 600,
        easing: 'linear'
    });
    if (urlHash != 'welcome')
    {
        anime({
            targets: '.big-showoff',
            height: 0,
            duration: 200,
            easing: 'linear',
            onComplete: () => {
                document.querySelector('.big-showoff').style.display = 'none';
            }
        });
    }
    anime({
        targets: '.anime-girl',
        keyframes: [
            {
                rotate: 20,
                scale: 0.95
            },
            {
                rotate: -20,
                scale: 1.05
            },
            {
                rotate: 0,
                scale: 1
            }
        ],
        delay: 0,
        easing: 'cubicBezier(.5, .05, .1, .3)',
        loop: true,
        duration: 10000
    });
    anime({
        targets: '.stagger-header',
        translateY: 0,
        opacity: 1,
        easing: 'linear',
        duration: 500,
        delay: anime.stagger(600)
    });
    anime({
        targets: '.nav-el',
        opacity: 1,
        easing: 'linear',
        duration: 200,
        delay: anime.stagger(100)
    });

    var navButtons = document.querySelectorAll('.nav-el[data-content]');
    for (var i = 0; i < navButtons.length; i++) {
        navButtons[i].addEventListener('click', async (e) => {
            e.preventDefault();
            var target = e.target;
            if (target.tagName == 'SPAN') target = target.parentElement;
            if (target.classList.contains('current')) return;

            document.querySelector('.nav-el.current').classList.remove('current');
            target.classList.add('current');

            await ChangePage(target.getAttribute('data-content'));
        });
    }
};

async function ChangePage(page)
{
    var newData = await fetch('/public/popovers/' + page + '.html');

    anime({
        targets: 'body>.content',
        opacity: 0,
        translateY: 100,
        duration: 200,
        easing: 'linear'
    });

    let navButton = document.querySelector(`.nav-el[data-content="${page}"]`);
    if (navButton == null) navButton = null;
    
    if (navButton != null)
    {
        document.querySelector('.nav-el.current').classList.remove('current');
        navButton.classList.add('current');
    }

    if (page == "welcome")
    {
        document.querySelector('.big-showoff').style.display = 'block';
        anime({
            targets: '.big-showoff',
            height: '600px',
            duration: 200,
            easing: 'linear'
        });
    }
    else
    {
        anime({
            targets: '.big-showoff',
            height: 0,
            duration: 200,
            easing: 'linear',
            onComplete: () => {
                document.querySelector('.big-showoff').style.display = 'none';
            }
        });
    }

    if (newData.status != 200)
    {
        SetContent("<h1>Not Found</h1><p>No such page exists. Contact the server administrator if you think this is a mistake.</p>");
    }
    else
    {
        newData = await newData.text();

        let parser = new DOMParser();
        let doc = parser.parseFromString(newData, 'text/html');

        let scripts = doc.getElementsByTagName('preload-script');
        for (var i = 0; i < scripts.length; i++) {
            let script = scripts[i];
            let src = script.getAttribute('src');
            if (document.querySelector(`script[src="${src}"]`) != null)
                document.querySelector(`script[src="${src}"]`).remove();
            let scriptElement = document.createElement('script');
            scriptElement.src = src;
            document.head.appendChild(scriptElement);

            script.remove();
        }
        document.querySelector('body>.content').innerHTML = newData;
    }
    
    var els = document.querySelectorAll('body>.content>*');
    for (var i = 0; i < els.length; i++) {
        els[i].style.opacity = 0;
        els[i].style.transform = "translateY(-30px)";
    }
    document.querySelector('body>.content').getElementsByClassName.transform = "translateY(-100px)";
    
    anime({
        targets: 'body>.content',
        opacity: 1,
        translateY: 0,
        duration: 200,
        easing: 'linear'
    });
    anime({
        targets: 'body>.content>*',
        opacity: 1,
        translateY: 0,
        duration: 100,
        easing: 'linear',
        delay: anime.stagger(120)
    });
    Translatable.translateGroup(Translatable.find("body"), CurrentLanguage);
}

function SetContent(content)
{
    document.querySelector('body>.content').innerHTML = content;
}

async function GetUploadCount(event)
{
    const _v = await fetch('/api/public/uploads/count');
    const _v_json = await _v.json();
    document.getElementById("__upload_counter").innerText = _v_json.count;
    event.remove();
}