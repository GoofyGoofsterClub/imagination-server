document.addEventListener("mouseover", function(e)
{
    if (e.target.hasAttribute("data-tooltip-id"))
        return;
    if (e.target.hasAttribute("data-tooltip"))
    {
        let tooltip = document.createElement("div");
        tooltip.id = uuidv4();
        tooltip.classList.add("tooltip");
        
        let rect = e.target.getBoundingClientRect();
        tooltip.style.top = rect.top + window.scrollY - (rect.height) + "px";
        tooltip.style.left = rect.left + window.scrollX - (rect.width) + "px";

        tooltip.innerText = e.target.getAttribute("data-tooltip");
        e.target.setAttribute("data-tooltip-id", tooltip.id);
        document.body.appendChild(tooltip);
    }
});

document.addEventListener("mouseout", function(e)
{
    if (!e.target.hasAttribute("data-tooltip-id"))
        return;
    let tooltip = document.getElementById(e.target.getAttribute("data-tooltip-id"));
    if (tooltip)
        tooltip.remove();
    e.target.removeAttribute("data-tooltip-id");
});

function uuidv4()
{
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c)
    {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);

        return v.toString(16);
    });
}