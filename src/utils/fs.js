const promisify = require('./promisify');
const mkdirp = require('mkdirp');
const FS = require('fs');

module.exports = function(useFS) {
  let fs = useFS || FS;
  let exports = {};
  exports.fs = fs;
  exports.existsSync = function(...args) {
    return fs.existsSync(...args);
  };
  exports.readFileSync = function(...args) {
    return fs.readFileSync(...args);
  };
  exports.writeFileSync = function(...args) {
    return fs.writeFileSync(...args);
  };
  exports.statSync = function(...args) {
    return fs.statSync(...args);
  };
  exports.existsSync = function(...args) {
    return fs.existsSync(...args);
  };
  exports.readdirSync = function(...args) {
    return fs.readdirSync(...args);
  };
  exports.unlinkSync = function(...args) {
    return fs.unlinkSync(...args);
  };
  exports.createReadStream = function(...args) {
    return fs.createReadStream(...args);
  };
  exports.createWriteStream = function(...args) {
    return fs.createWriteStream(...args);
  };
  exports.readFile = promisify(function(...args) {
    return fs.readFile(...args);
  });
  exports.writeFile = promisify(function(...args) {
    return fs.writeFile(...args);
  });
  exports.stat = promisify(function(...args) {
    return fs.stat(...args);
  });
  exports.readdir = promisify(function(...args) {
    return fs.readdir(...args);
  });
  exports.unlink = promisify(function(...args) {
    return fs.unlink(...args);
  });
  exports.mkdirp = function(filename) {
    return new Promise(resolve => {
      (fs.mkdirp || mkdirp)(filename, resolve);
    });
  };
  exports.exists = function(filename) {
    return new Promise(resolve => {
      fs.exists(filename, resolve);
    });
  };
  return exports;
};
