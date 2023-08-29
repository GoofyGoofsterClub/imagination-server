export function GeneratePrivateID()
{
    let id = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 32; i++)
        id += possible.charAt(Math.floor(Math.random() * possible.length));

    return id;
}

export function GeneratePublicID()
{
    let id = ".~";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 16; i++)
        id += possible.charAt(Math.floor(Math.random() * possible.length));

    return id;
}