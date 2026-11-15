import fs from "fs";

export default function GetRoutesRecursively(path)
{
    let paths = [];

    try
    {
        let files = fs.readdirSync(path);
        for(const file of files)
        {
            if(fs.lstatSync(`${path}/${file}`).isDirectory())
            {
                const subPaths = GetRoutesRecursively(`${path}/${file}`);
                for (const subPath of subPaths) paths.push(subPath);
            }
            else if(file.endsWith(".js"))
            {
                paths.push(`${path}/${file}`);
            }
        }
    }
    catch (error) {
        console.error(`[err][recursive] Could not read route directory "${path}": ${error.message}`);
    }

    return paths;
}