const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const babel = require('@babel/core');

test('module resolver supports patched glob exports and wildcard roots', () => {
    const result = babel.transformSync('import Cache from "cache";', {
        filename: path.resolve(__dirname, '../src/routes/fixture.js'),
        babelrc: false,
        configFile: false,
        plugins: [[require.resolve('babel-plugin-module-resolver'), {
            cwd: path.resolve(__dirname, '..'), root: ['./src/*']
        }]]
    });
    assert.match(result.code, /from ["']\.\.\/utilities\/cache["']/);
});
