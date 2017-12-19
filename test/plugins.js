const assert = require('assert');
const {bundling, run, assertBundleTree} = require('./utils');

describe('plugins', function() {
  it('should load plugins and apply custom asset type', async function() {
    let {b, fs} = await bundling(__dirname + '/integration/plugins/index.js');

    assertBundleTree(b, {
      name: 'index.js',
      assets: ['index.js', 'test.txt'],
      childBundles: []
    });

    let output = run(b);
    assert.equal(output, 'hello world');
  });

  it('should load package.json from parent tree', async function() {
    let {b, fs} = await bundling(
      __dirname + '/integration/plugins/sub-folder/index.js'
    );

    assertBundleTree(b, {
      name: 'index.js',
      assets: ['index.js', 'test.txt'],
      childBundles: []
    });

    let output = run(b);
    assert.equal(output, 'hello world');
  });
});
