window.onload = async () =>
{
    await loadlb();
    setInterval(loadlb, 60000);
}

async function loadlb()
{
    var _lb = await fetch('/api/leaderboard');
    var _lbJson = await _lb.json();
    _lbJson = _lbJson['data'];
    var _lbHtml = "";
    for (var i = 0; i < _lbJson.length; i++)
    {
        var firstPlace = false;
        var bigPlacement = false;
        var secondBg = false;
        if (i == 0) firstPlace = true;
        else if (i > 0 && i < 3) bigPlacement = true;

        if ((i + 1) % 2 == 1)
            secondBg = true;
        
        if (firstPlace)
            badgeColor = "#eb9b34";
        else if (bigPlacement)
            badgeColor = "#eb7a34";
        else
            badgeColor = "transparent";
        _lbHtml += `<li class="${firstPlace ? 'first-place ' : ''}${bigPlacement ? 'big-placement ' : ''}${secondBg ? 'second ' : ''} ${i == 0 ? 'rounded-top' : ''} ${i == _lbJson.length - 1 ? 'rounded-bottom' : ''} lb-entry"><span class="placing" style="--background: ${badgeColor};">#${i + 1}</span><span class="username">${_lbJson[i].uploader}</span><span class="points">${formatBytes(_lbJson[i].totalFileSize)}</span></li>`;
    }
    document.getElementById("leaderboard").innerHTML = _lbHtml;
    
    setTimeout(async () => {
        var _l = document.getElementsByClassName("lb-entry");

        for (var i = 0; i < _l.length; i++) {
            _l[i].style.opacity = 1;
            await sleep(100);
        }
    }, 1000);
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}