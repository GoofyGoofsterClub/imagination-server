const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src', 'api');


function getFiles(dir, files_) {
    let __dirname_regex = new RegExp(__dirname.replace(/\\/g, '\\\\'), 'g');

    files_ = files_ || [];
    const files = fs.readdirSync(dir);
    for (const i in files) {
        const name = path.join(dir, files[i]);
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files_);
        } else {
            files_.push(name.replace(__dirname_regex, ''));
        }
    }
    return files_.map((file) => file.split(path.sep).join('/').replace(/^\/src\//, ''));
}

const files = getFiles(srcPath);

let apiResult = [];

for (let i = 0; i < files.length; i++)
{
    console.log(`${i+1}/${files.length} :: ${files[i]}`);
    
    const file = files[i];
    const fileContents = fs.readFileSync(path.join(__dirname, 'src', file), 'utf8');
    
    let methodRe = /super\("(\w+)"\)/g;
    let method = fileContents.match(methodRe);
    if (method === null)
        continue;
    method = method[0].replace(methodRe, '$1');
    const regex = /\/\*--includedoc([\s\S]*?)\*\//g;
    const matches = fileContents.match(regex);

    if (matches === null)
    {
        apiResult.push({
            "path": file.replace(/\.js$/, ''),
            "method": method,
            "description": "There is not a lot we know about this API route.",
            "params": {}
        });
        continue;
    }

    const doc = matches[0].replace(/\/\*--includedoc/g, '').replace(/\*\//g, '').trim();
    const docParamRegex = /@(\w+)\s+(.*?)\n/g;
    const docParams = doc.match(docParamRegex) || [];

    let docParamsObject = {};

    for (let j = 0; j < docParams.length; j++)
    {
        const docParam = docParams[j];
        const docParamKey = docParam.replace(docParamRegex, '$1');
        const docParamValue = docParam.replace(docParamRegex, '$2');

        docParamsObject[docParamKey] = docParamValue;
    }

    const docDescription = doc.replace(docParamRegex, '');

    if (docParamsObject.private === 'true')
        continue;


    const apiPath = file.replace(/\.js$/, '');

    if ('params' in docParamsObject)
    {
        const params = docParamsObject.params;
        // use this regex to replace all params with their actual values \(([^)]+)\) (\w+)

        const paramsRegex = /\(([^)]+)\) (\w+)/g;

        const paramsGroups = params.match(paramsRegex);

        if (paramsGroups === null)
            docParamsObject.params = {};
        else
        {
            let _params = [];

            let paramRe = /\(([^)]+)\) (\w+)/g;
            for (let j = 0; j < paramsGroups.length; j++)
            {
                const param = paramsGroups[j];
                const paramType = param.replace(paramRe, '$1');
                const paramName = param.replace(paramRe, '$2');

                _params.push({
                    "type": paramType,
                    "name": paramName
                });
            }

            docParamsObject.params = _params;
        }
    }

    for (const param in docParamsObject)
        if (param !== 'params' && param !== 'returnexample')
            try
            {
                docParamsObject[param] = JSON.parse(docParamsObject[param]);
            } catch {}

    // Emit the example under a camelCase key, matching the other two-word keys of the document.
    if ('returnexample' in docParamsObject)
    {
        docParamsObject.returnExample = docParamsObject.returnexample;
        delete docParamsObject.returnexample;
    }

    apiResult.push({
        "path": apiPath,
        "method": method,
        "description": docDescription,
        "params": docParamsObject
    });
}

console.log("Generated API documentation for " + apiResult.length + " routes.");
console.log("Saving into /public/api.json...");

apiResult = {
    "generationTimestamp": new Date().toISOString(),
    "routes": apiResult
}

fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'public', 'api.json'), JSON.stringify(apiResult, null, 4));

console.log("Done!");