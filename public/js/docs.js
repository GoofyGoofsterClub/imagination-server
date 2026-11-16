window.onload = async function()
{
    // Get API documentation

    let apiJson;
    try {
        const api = await fetch('/public/api.json');
        if (!api.ok)
            throw new Error('Could not load API documentation (HTTP ' + api.status + ').');
        apiJson = await api.json();
    } catch (error) {
        const endpoints = document.getElementById('__docs_endpoints');
        if (endpoints)
        {
            const message = document.createElement('p');
            message.textContent = 'ERROR: ' + error.message + ' Please regenerate the documentation and reload the page.';
            endpoints.appendChild(message);
        }
        return;
    }

    // Escape data values before injecting them into innerHTML.
    const escapeHtml = value => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // Create new element for each endpoint

    // Get the #__docs_date_update element to update the date
    const dateUpdate = document.getElementById('__docs_date_update');
    const generationDate = apiJson.generationTimestamp ? new Date(apiJson.generationTimestamp) : null;
    if (dateUpdate && generationDate && !isNaN(generationDate.getTime()))
        dateUpdate.innerText = generationDate.toLocaleString();

    // Get the container
    const endpoints = document.getElementById('__docs_endpoints');
    if (!endpoints) return;

    // Loop through each endpoint
    for (let i = 0; i < apiJson.routes.length; i++)
    {
        let endpoint = apiJson.routes[i];

        // Create new endpoint element
        const endpointElement = document.createElement('div');
        endpointElement.classList.add('endpoint');
        endpointElement.classList.add('dashboard-block');

        // Create new endpoint title element
        const endpointElementMethod = document.createElement('p');
        endpointElementMethod.innerHTML = `<span class="tag tag-blue">${escapeHtml(endpoint.method)}</span> <a class="code" href="/${escapeHtml(endpoint.path)}">${escapeHtml(endpoint.path)}</a>`;
        endpointElementMethod.innerHTML += endpoint.params.needsauth ? ' <span class="tag tag-yellow">Authorization Required</span>' : '';
        endpointElementMethod.innerHTML += endpoint.params.adminonly ? ' <span class="tag tag-red">Permission Required</span>' : '';
        endpointElement.appendChild(endpointElementMethod);

        // Create new endpoint description element
        const endpointElementDescription = document.createElement('p');
        endpointElementDescription.classList.add('small-text');
        endpointElementDescription.innerHTML = escapeHtml(endpoint.description);
        endpointElement.appendChild(endpointElementDescription);

        // Create new endpoint params holder element
        const endpointElementParams = document.createElement('div');
        endpointElementParams.classList.add('endpoint-params');

        // Loop through each endpoint param
        for (let j = 0; j < (endpoint.params.params || []).length; j++)
        {
            const param = endpoint.params.params[j];

            // Create new endpoint param element
            const endpointElementParam = document.createElement('span');
            endpointElementParam.innerHTML = `<span class="tag">${escapeHtml(param.type)}</span> <span class="code">${escapeHtml(param.name)}</span>`;
            endpointElementParams.appendChild(endpointElementParam);
        }

        endpointElement.appendChild(endpointElementParams);
        
        // Create new endpoint returns title element
        const endpointElementReturns = document.createElement('h4');
        endpointElementReturns.innerHTML = 'Returns';
        endpointElement.appendChild(endpointElementReturns);

        // Create new endpoint return value element
        const endpointElementReturnsCode = document.createElement('span');
        endpointElementReturnsCode.classList.add('code');
        if (endpoint.params.returns != null)
            endpointElementReturnsCode.innerHTML = escapeHtml(endpoint.params.returns);
        endpointElement.appendChild(endpointElementReturnsCode);

        // Create new endpoint return example title element
        const endpointElementReturnExample = document.createElement('h4');
        endpointElementReturnExample.innerHTML = 'Return Example';
        endpointElement.appendChild(endpointElementReturnExample);

        // Create new endpoint return example container element
        const endpointElementReturnExampleCode = document.createElement('div');
        endpointElementReturnExampleCode.classList.add('dashboard-block');

        // Create new endpoint return example value element
        const endpointElementReturnExampleCodePre = document.createElement('pre');
        endpointElementReturnExampleCodePre.classList.add('code');
        if (endpoint.params.returnExample != null)
            endpointElementReturnExampleCodePre.textContent = endpoint.params.returnExample;
        endpointElementReturnExampleCode.appendChild(endpointElementReturnExampleCodePre);
        endpointElement.appendChild(endpointElementReturnExampleCode);

        // Append the endpoint element to the container
        endpoints.appendChild(endpointElement);
    }
}
