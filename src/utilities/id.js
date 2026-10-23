import crypto from "crypto";

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

const UPLOAD_ID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const UPLOAD_ID_LENGTH = 10;
const UPLOAD_ID_HALF_BITS = BigInt(29);
const UPLOAD_ID_HALF_MASK = (BigInt(1) << UPLOAD_ID_HALF_BITS) - BigInt(1);
const UPLOAD_ID_ROUNDS = 4;

function uploadIdRound(key, round, value)
{
    return crypto.createHmac("sha256", key).update(`${round}:${value}`).digest().readBigUInt64BE(0) & UPLOAD_ID_HALF_MASK;
}

export function EncodeUploadID(id, key)
{
    if (BigInt(id) < BigInt(0) || BigInt(id) >> (UPLOAD_ID_HALF_BITS * BigInt(2)) !== BigInt(0))
        throw new RangeError(`Upload id ${id} is outside of the encodable range.`);

    let left = BigInt(id) >> UPLOAD_ID_HALF_BITS;
    let right = BigInt(id) & UPLOAD_ID_HALF_MASK;

    for (let round = 0; round < UPLOAD_ID_ROUNDS; round++)
        [left, right] = [right, left ^ uploadIdRound(key, round, right)];

    let value = (left << UPLOAD_ID_HALF_BITS) | right;
    let name = "";
    const base = BigInt(UPLOAD_ID_ALPHABET.length);

    for (let i = 0; i < UPLOAD_ID_LENGTH; i++)
    {
        name = UPLOAD_ID_ALPHABET[Number(value % base)] + name;
        value /= base;
    }

    return name;
}
