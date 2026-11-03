const { test } = require('node:test');
const assert = require('node:assert/strict');

test('preview utilities only retain access and cleanup for existing files', () => {
    const previews = require('../lib/utilities/previews');
    assert.deepEqual(Object.keys(previews).sort(), ['deletePreviewFiles', 'getPreview']);
});
