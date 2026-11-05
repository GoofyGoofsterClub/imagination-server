const { test } = require('node:test');
const assert = require('node:assert/strict');
const downloadFilename = require('../lib/utilities/downloadfilename').default;

test('archive MIME aliases produce usable download extensions', () => {
    for (const [mimetype, extension] of [
        ['application/zip', 'zip'], ['application/x-zip-compressed', 'zip'],
        ['application/vnd.rar', 'rar'], ['application/x-rar-compressed', 'rar'],
        ['application/rar', 'rar'], ['application/x-rar', 'rar'],
        ['application/x-7z-compressed', '7z'], ['application/7z', '7z'], ['application/x-7z', '7z'],
        ['Application/X-Zip-Compressed; charset=binary', 'zip']
    ]) {
        assert.equal(downloadFilename({ filename: 'archiveID', mimetype }), `archiveID.${extension}`);
    }
});

test('MIME archive aliases do not override saved or existing filename extensions', () => {
    assert.equal(downloadFilename({ filename: 'archiveID', file_extension: '.7z', mimetype: 'application/x-zip-compressed' }), 'archiveID.7z');
    assert.equal(downloadFilename({ filename: 'archive.rar', mimetype: 'application/x-zip-compressed' }), 'archive.rar');
});
