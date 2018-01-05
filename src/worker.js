require('v8-compile-cache');
const Parser = require('./Parser');

let self = {};

function init(options) {
  console.log(`INIT: ${process.pid}`);
  Object.assign(process.env, options.env || {});
  return new Parser(options || {});
}

module.exports = async function(parserOptions, path, pkg, options) {
  if (!self.parser) {
    self.parser = init(parserOptions || {});
  }
  try {
    var asset = self.parser.getAsset(path, pkg, options || {});
    await asset.process();

    return {
      dependencies: Array.from(asset.dependencies.values()),
      generated: asset.generated,
      hash: asset.hash
    };
  } catch (err) {
    let returned = err;

    if (asset) {
      returned = asset.generateErrorMessage(returned);
    }

    returned.fileName = path;
    throw returned;
  }
};

module.exports.init = function(options) {
  self.parser = new Parser(options || {});
  Object.assign(process.env, options.env || {});
};
