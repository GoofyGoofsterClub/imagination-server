const { test } = require('node:test');
const assert = require('node:assert/strict');
const ViewCounter = require('../lib/utilities/viewcounter').default;

test('counter flushes are atomic, bounded and omit deleted uploaders', async () => {
    const queries = [];
    let fail = true;
    const db = { transaction: async callback => {
        await callback({ query: async (sql, params) => { queries.push(params); if (fail) throw Error('offline'); } });
    } };
    const counter = new ViewCounter(db, 100000);
    counter.add('1', '2');
    counter.add('1', '2');
    counter.add('3', null);
    assert.equal(await counter.flush(), false);
    assert.equal(counter.uploads.get('1').n, 2);
    fail = false;
    await counter.flush();
    assert.equal(counter.uploads.size, 0);
    assert.deepEqual(queries.at(-1), [['2'], [2]]);
    for (let i = 0; i < 1001; i++) counter.add(String(i), null);
    await counter.flush();
    assert.equal(counter.uploads.size, 1);
    await counter.stop();
    assert.equal(counter.uploads.size, 0);
});
