const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const out = path.join(publicDir, 'assets');
const manifest = {};

async function emit(key, content, extension) {
    const parsed = path.parse(key);
    const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
    const name = `${parsed.name}.${hash}${extension || parsed.ext}`;
    await fs.writeFile(path.join(out, name), content);
    manifest[key] = `/public/assets/${name}`;
}

async function files(dir) {
    const result = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        if (entry.name === 'assets' || entry.name === 'asset-manifest.json') continue;
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) result.push(...await files(file));
        else result.push(file);
    }
    return result;
}

function rewrite(text) {
    // Longest first so prefixes (e.g. sagiri.png) cannot shadow longer paths.
    for (const key of Object.keys(manifest).sort((a, b) => b.length - a.length))
        text = text.split(key).join(manifest[key]);
    return text;
}

async function build() {
    await fs.mkdir(out, { recursive: true });
    const fontRoot = path.dirname(require.resolve('@fontsource-variable/raleway/package.json'));
    let fonts = await fs.readFile(path.join(fontRoot, 'wght.css'), 'utf8');
    fonts = fonts.replace(/url\(\.\/files\/([^)]*)\)/g, (_, name) => `url(/public/fonts/${name})`);
    for (const match of fonts.matchAll(/url\(([^)]+)\)/g)) {
        const key = match[1];
        await emit(key, await fs.readFile(path.join(fontRoot, 'files', path.basename(key))));
    }
    await fs.copyFile(path.join(fontRoot, 'LICENSE'), path.join(out, 'Raleway-LICENSE.txt'));

    const all = await files(publicDir);
    // Images and JSON first, CSS/JS next, HTML fragments last (their dependencies are now known).
    for (const file of all.filter(f => !/\.(css|js|html)$/.test(f))) {
        const key = `/public/${path.relative(publicDir, file).split(path.sep).join('/')}`;
        const content = await fs.readFile(file);
        if (file.endsWith('.png') && content.length > 80000) {
            await emit(key, await sharp(content).webp({ quality: 85 }).toBuffer(), '.webp');
            if (path.basename(file) === 'sagiri.png') {
                await emit('/public/img/sagiri-450.webp', await sharp(content).resize({ width: 450 }).webp({ quality: 85 }).toBuffer());
            }
        } else await emit(key, content);
    }
    for (const file of all.filter(f => /\.(css|js)$/.test(f))) {
        const key = `/public/${path.relative(publicDir, file).split(path.sep).join('/')}`;
        let content = await fs.readFile(file, 'utf8');
        if (key === '/public/css/new.css') content = fonts + '\n' + content;
        await emit(key, rewrite(content));
    }
    for (const file of all.filter(f => f.endsWith('.html'))) {
        if (file.endsWith('.js')) {
            content = babel.transformSync(content, {
                babelrc: false, configFile: false, compact: true,
                shouldPrintComment: value => /@license|^!|copyright/i.test(value),
                plugins: [() => ({ visitor: {
                    FunctionDeclaration(ast) {
                        if (['GetUsersLegacy', 'GetUploadsLegacy'].includes(ast.node.id?.name)
                            && !ast.scope.parent.getBinding(ast.node.id.name)?.referenced) ast.remove();
                    }
                } })]
            }).code;
        }
        const key = `/public/${path.relative(publicDir, file).split(path.sep).join('/')}`;
        await emit(key, rewrite(await fs.readFile(file, 'utf8')));
    }
    const views = path.join(root, 'lib', 'views');
    await fs.mkdir(views, { recursive: true });
    for (const name of await fs.readdir(path.join(root, 'private'))) {
        if (name.endsWith('.ejs')) await fs.writeFile(path.join(views, name), rewrite(await fs.readFile(path.join(root, 'private', name), 'utf8')));
    }
    await fs.writeFile(path.join(publicDir, 'asset-manifest.json'), JSON.stringify(manifest));
    console.log(`Built ${Object.keys(manifest).length} fingerprinted assets and production templates.`);
}

build().catch(error => { console.error(error); process.exitCode = 1; });
