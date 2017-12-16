const Asset = require('../Asset');
const path = require('path');

class RawAsset extends Asset {
  // Don't load raw assets. They will be copied by the RawPackager directly.
  load() {}

  generate() {
    return {
      js: `module.exports=${JSON.stringify(
        path.join(this.options.publicURL, this.generateBundleName())
      )};`
    };
  }
}

module.exports = RawAsset;
