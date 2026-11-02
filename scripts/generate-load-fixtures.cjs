const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

async function generate() {
    const directory = path.resolve(__dirname, '../loadtest/fixtures');
    await fs.mkdir(directory, { recursive: true });
    for (const [name, width, height] of [['small', 128, 128], ['medium', 400, 400], ['large', 800, 600], ['huge', 1600, 1200]]) {
        const pixels = crypto.randomBytes(width * height * 3);
        await sharp(pixels, { raw: { width, height, channels: 3 } }).png().toFile(path.join(directory, name + '.png'));
    }
    console.log('Generated valid PNG load-test fixtures.');
}

generate().catch(error => { console.error(error); process.exitCode = 1; });
