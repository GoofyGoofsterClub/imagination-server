window.onload = async function()
{
    // Get API documentation

    const api = await fetch('/public/api.json');
    const apiJson = await api.json();

    // Create new element for each endpoint

    // Get the #__docs_date_update element to update the date
    const dateUpdate = document.getElementById('__docs_date_update');
    // Set the innerText to the date from apiJson.generationTimestamp
    dateUpdate.innerText = new Date(apiJson.generationTimestamp).toLocaleString();

    // Get the container
    const endpoints = document.getElementById('__docs_endpoints');

    // Loop through each endpoint
    for (var i = 0; i < apiJson.routes.length; i++)
    {
        let endpoint = apiJson.routes[i];

        // Create new endpoint element
        const endpointElement = document.createElement('div');
        endpointElement.classList.add('endpoint');
        endpointElement.classList.add('dashboard-block');

        // Create new endpoint title element
        const endpointElementMethod = document.createElement('p');
        endpointElementMethod.innerHTML = `<span class="tag tag-blue">${endpoint.method}</span> <a class="code" href="/${endpoint.path}">${endpoint.path}</a>`;
        endpointElementMethod.innerHTML += endpoint.params.needsauth ? ' <span class="tag tag-yellow">Authorization Required</span>' : '';
        endpointElementMethod.innerHTML += endpoint.params.adminonly ? ' <span class="tag tag-red">Permission Required</span>' : '';
        endpointElement.appendChild(endpointElementMethod);

        // Create new endpoint description element
        const endpointElementDescription = document.createElement('p');
        endpointElementDescription.classList.add('small-text');
        endpointElementDescription.innerHTML = endpoint.description;
        endpointElement.appendChild(endpointElementDescription);

        // Create new endpoint params holder element
        const endpointElementParams = document.createElement('div');
        endpointElementParams.classList.add('endpoint-params');

        // Loop through each endpoint param
        for (var j = 0; j < endpoint.params.params.length; j++)
        {
            let param = endpoint.params.params[j];

            // Create new endpoint param element
            const endpointElementParam = document.createElement('span');
            endpointElementParam.innerHTML = `<span class="tag">${param.type}</span> <span class="code">${param.name}</span>`;
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
        endpointElementReturnsCode.innerHTML = endpoint.params.returns;
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
        endpointElementReturnExampleCodePre.innerHTML = endpoint.params.returnexample;
        endpointElementReturnExampleCode.appendChild(endpointElementReturnExampleCodePre);
        endpointElement.appendChild(endpointElementReturnExampleCode);

        // Append the endpoint element to the container
        endpoints.appendChild(endpointElement);
    }
}