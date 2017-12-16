const assert = require('assert');
const fs = require('fs');
const {bundle, run, assertBundleTree} = require('./utils');

describe('typescript', function() {
  it('should produce a ts bundle using ES6 imports', async function() {
    console.log('here');
    assert.equal(2, 2);
    let b = await bundle(__dirname + '/integration/vue/basic.vue');

    let output = run(b);
    // assert.equal(typeof output.count, 'function');
    // assert.equal(output.count(), 3);
    //
    // assert.equal(b.assets.size, 2);
    // assert.equal(b.childBundles.size, 0);
  });
});
