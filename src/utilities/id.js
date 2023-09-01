export function GeneratePrivateID(length = 32, salt = "")
{
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < length; i++)
        salt += possible.charAt(Math.floor(Math.random() * possible.length));

    return salt;
}

export function GeneratePublicID(length = 16, salt = ".~")
{
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < length; i++)
        salt += possible.charAt(Math.floor(Math.random() * possible.length));

    return salt;
}