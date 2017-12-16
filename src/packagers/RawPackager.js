const dbg = require('debug')('parcel:RawPackager');
const Packager = require('./Packager');
const fs = require('../utils/fs');
const path = require('path');

class RawPackager extends Packager {
  // Override so we don't create a file for this bundle.
  // Each asset will be emitted as a separate file instead.
  setup() {
    dbg('setup');
  }

  async addAsset(asset) {
    // Use the bundle name if this is the entry asset, otherwise generate one.
    let name = this.bundle.name;
    dbg('addAsset', [name, asset]);
    if (asset !== this.bundle.entryAsset) {
      name = path.join(
        path.dirname(this.bundle.name),
        asset.generateBundleName()
      );
    }

    let contents =
      asset.generated[asset.type] || (await fs.readFile(asset.name));
    await fs.writeFile(name, contents);
  }

  end() {
    dbg('end');
  }
}

module.exports = RawPackager;
