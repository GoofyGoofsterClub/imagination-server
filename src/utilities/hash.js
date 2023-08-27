import crypto from 'crypto';

export default function hash(data) {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}