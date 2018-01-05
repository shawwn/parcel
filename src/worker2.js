// const processStartTime = Date.now() - process.uptime() * 1000;
//
// module.exports = {
//   getPid: () => process.pid,
//   getStartTime: () => processStartTime
// };
// console.log('startup');
//
// module.exports = function myTask() {
//   console.log('hi');
//   return 'hello from separate process!';
// };

require('v8-compile-cache');
const Parser = require('./Parser');

let self = {};
//
// module.exports.init = function(options) {
//   parser = new Parser(options || {});
//   Object.assign(process.env, options.env || {});
// };
//
// module.exports = async function(path, pkg, options) {
//   parser = parser || new Parser(options
//   try {
//     var asset = parser.getAsset(path, pkg, options);
//     await asset.process();
//
//     return {
//       dependencies: Array.from(asset.dependencies.values()),
//       generated: asset.generated,
//       hash: asset.hash
//     };
//   } catch (err) {
//     let returned = err;
//
//     if (asset) {
//       returned = asset.generateErrorMessage(returned);
//     }
//
//     returned.fileName = path;
//     return returned;
//   }
// };

module.exports = function echoDirect(msg = '') {
  return msg;
};

Object.assign(module.exports, {
  init(options) {
    console.log(['init GOOD ' + process.pid]);
    self.parser = new Parser(options || {});
    Object.assign(process.env, options.env || {});
  },

  async run(parserOptions, path, pkg, options) {
    // console.log(['run', path, pkg]);
    try {
      if (!self.parser) {
        console.log(['init BAD ' + process.pid]);
        Object.assign(process.env, parserOptions.env || {});
        self.parser = new Parser(parserOptions || {});
      }
      var asset = self.parser.getAsset(path, pkg, options);
      await asset.process();

      return {
        dependencies: Array.from(asset.dependencies.values()),
        generated: asset.generated,
        hash: asset.hash
      };
    } catch (err) {
      // console.log(['run ERR', err]);
      let returned = err;

      if (asset) {
        returned = asset.generateErrorMessage(returned);
      }

      returned.fileName = path;
      throw returned;
    }
  },

  echoAsync(msg = '', timeout = 10) {
    return new Promise(resolve => setTimeout(resolve, timeout)).then(() => msg);
  },

  echoMethod(msg = '') {
    return this.echoSync(msg);
  }
});
