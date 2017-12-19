require('v8-compile-cache');
const Parser = require('./Parser');
const babel = require('./transforms/babel');
const dnode = require('dnode');
const promisify = require('./utils/promisify');

let self = {};

function emit(event, ...args) {
  process.send({event, args});
}

exports.init = function(options, callback) {
  // console.log(['init', options.rpcport]);
  self.d = dnode.connect(options.rpcport);
  self.d.on('remote', function(remote) {
    // console.log(['remote', options.rpcport]);
    self.remote = remote;
    self.readFile = promisify(self.remote.readFile);

    self.parser = new Parser(options || {});
    callback();
  });
  self.d.on('error', e => {
    if (e.code === 'ENOENT') {
      callback();
    } else {
      console.error(e);
      callback(e);
    }
  });
};

exports.run = async function(path, pkg, options, callback) {
  try {
    // await self.readFile("package.json");
    var asset = self.parser.getAsset(path, pkg, options);
    await asset.process();

    callback(null, {
      dependencies: Array.from(asset.dependencies.values()),
      generated: asset.generated,
      hash: asset.hash
    });
  } catch (err) {
    if (asset) {
      err = asset.generateErrorMessage(err);
    }

    err.fileName = path;
    callback(err);
  }
};
