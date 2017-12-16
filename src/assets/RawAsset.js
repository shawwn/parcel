const Asset = require('../Asset');
const path = require('path');
const url = require('url');

class RawAsset extends Asset {
  // constructor(name, pkg, options) {
  //   super(name, pkg, options);
  //   const ext = path.extname(this.name);
  //   if (ext && ext.length > 0) {
  //     this.ext = ext;
  //     this.type = 'js';
  //     this.isAstDirty = false;
  //   }
  // }
  // Don't load raw assets. They will be copied by the RawPackager directly.
  load() {}

  // generate() {
  //   return {
  //     js: `module.exports=${JSON.stringify(
  //       path.join(this.options.publicURL, this.generateBundleName())
  //     )};`
  //   };
  // }

  generate() {
    const pathToAsset = JSON.stringify(
      // url.resolve(this.options.publicURL, this.generateBundleName())
      path.join(this.options.publicURL, this.generateBundleName())
    );
    return {
      js: `module.exports=${pathToAsset};`
    };
  }
}

module.exports = RawAsset;
