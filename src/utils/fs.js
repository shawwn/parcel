const promisify = require('./promisify');
const mkdirp = require('mkdirp');
const FS = require('fs');

const asString = ret => (ret instanceof Buffer ? ret.toString() : ret);

const promisifyString = fn => {
  return function(...args) {
    return new Promise(function(resolve, reject) {
      fn(...args, function(err, ...res) {
        if (err) return reject(err);

        res[0] = asString(res[0]);
        if (res.length === 1) return resolve(res[0]);

        resolve(res);
      });
    });
  };
};

const wrap = fn => {
  return function(...args) {
    return fn(...args);
  };
};

const returnString = fn => {
  return function(...args) {
    return asString(fn(...args));
  };
};

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
