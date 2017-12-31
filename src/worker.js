require('v8-compile-cache');
const Parser = require('./Parser');
const babel = require('./transforms/babel');
const dnode = require('dnode');
const promisify = require('./utils/promisify');
const FileSystem = require('./utils/fs');
const fs = new FileSystem();

let self = {};

function emit(event, ...args) {
  process.send({event, args});
}

function initRPC(port) {
  if (!self.d) {
    // console.log(['init', options.rpcport]);
    self.d = dnode.connect(port);
    self.d.on('remote', function(remote) {
      // console.log(['remote', options.rpcport]);
      self.remote = remote;
      self.readFile = promisify(self.remote.readFile);
      // callback();
    });
    self.d.on('error', e => {
      if (e.code === 'ENOENT') {
        // callback();
      } else {
        console.error(e);
        // callback(e);
      }
    });
  }
}

exports.init = function(options, callback) {
  self.parser = new Parser(
    {
      in: fs,
      out: fs,
      cache: fs
    },
    options || {}
  );
  initRPC(options.rpcport);
  callback();
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
