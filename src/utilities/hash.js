import crypto from 'crypto';
import fs from 'fs';

/**
 * @param {string} data
 * @returns {string}
 * @description Hashes a string using SHA256.
*/
export default function hash(data) {
    return hashBuffer(Buffer.from(data ?? '', 'utf8'));
}

/**
 * @param {string} path
 * @returns {Promise<string>}
 * @description Hashes a file using SHA256.
*/
export async function hashFile(path) {
    return hashStream(fs.createReadStream(path));
}

/**
 * @param {fs.ReadStream} stream
 * @returns {Promise<string>}
 * @description Hashes a stream using SHA256.
*/
export async function hashStream(stream) {
    let hash = crypto.createHash('sha256');
    for await (const chunk of stream) hash.update(chunk);
    return hash.digest('hex');
}

export function hashBuffer(buffer) {
    let hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex');
}