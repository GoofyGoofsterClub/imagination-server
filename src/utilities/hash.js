import crypto from 'crypto';
import fs from 'fs';

/**
 * @param {string} data
 * @returns {string}
 * @description Hashes a string using SHA256.
*/
export default function hash(data) {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * @param {string} path
 * @returns {Promise<string>}
 * @description Hashes a file using SHA256.
*/
export async function hashFile(path)
{
    let hash = crypto.createHash('sha256');
    let buffer = Buffer.alloc(1024 * 1024);
    let fd = await fs.promises.open(path, 'r');
    await fd.read(buffer, 0, 1024 * 1024, 0);
    await fd.close();
    hash.update(buffer);
    return hash.digest('hex');
}