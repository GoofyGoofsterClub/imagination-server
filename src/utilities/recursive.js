export default function GetRoutesResursively(path)
{
    let paths = [];

    let files = fs.readdirSync(path);
    for(const file of files)
    {
        if(fs.lstatSync(`${path}/${file}`).isDirectory())
        {
            paths.push(...GetRoutesResursively(`${path}/${file}`));
        }
        else if(file.endsWith(".js"))
        {
            paths.push(`${path}/${file}`);
        }
    }

    return paths;
}