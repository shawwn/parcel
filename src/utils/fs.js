const promisify = require('./promisify');
const mkdirp = require('mkdirp');
const FS = require('fs');
const {EventEmitter} = require('events');

class FileSystem extends EventEmitter {
  constructor(fs) {
    super();
    this.fs = fs || FS;
    // this._exists = promisify(this.fs.exists.bind(this.fs));
    if (!this.fs.readFile) {
      fs = fs;
    }
    this._readFile = promisify(this.fs.readFile.bind(this.fs));
    this._writeFile = promisify(this.fs.writeFile.bind(this.fs));
    this._stat = promisify(this.fs.stat.bind(this.fs));
    this._readdir = promisify(this.fs.readdir.bind(this.fs));
    this._unlink = promisify(this.fs.unlink.bind(this.fs));
  }

  existsSync(...args) {
    return this.fs.existsSync(...args);
  }
  async exists(filename) {
    // return await this._exists(...args);
    return new Promise(resolve => {
      this.fs.exists(filename, resolve);
    });
  }
  //   exports.exists = function(filename) {
  //     return new Promise(resolve => {
  //       fs.exists(filename, resolve);
  //     });
  //   };

  readFileSync(...args) {
    return this.fs.readFileSync(...args);
  }
  async readFile(...args) {
    return await this._readFile(...args);
  }

  writeFileSync(...args) {
    return this.fs.writeFileSync(...args);
  }
  async writeFile(...args) {
    return await this._writeFile(...args);
  }

  statSync(...args) {
    return this.fs.statSync(...args);
  }
  async stat(...args) {
    return await this._stat(...args);
  }

  readdirSync(...args) {
    return this.fs.readdirSync(...args);
  }
  async readdir(...args) {
    return await this._readdir(...args);
  }

  unlinkSync(...args) {
    return this.fs.unlinkSync(...args);
  }
  async unlink(...args) {
    return await this._unlink(...args);
  }

  createReadStream(...args) {
    return this.fs.createReadStream(...args);
  }
  createWriteStream(...args) {
    return this.fs.createWriteStream(...args);
  }

  async mkdirp(filename) {
    return new Promise(resolve => {
      (this.fs.mkdirp || mkdirp)(filename, resolve);
    });
  }
}

// module.exports = function(useFS) {
//   let fs = useFS || FS;
//   let exports = {};
//   exports.fs = fs;
//   exports.existsSync = function(...args) {
//     return fs.existsSync(...args);
//   };
//   exports.readFileSync = function(...args) {
//     return fs.readFileSync(...args);
//   };
//   exports.writeFileSync = function(...args) {
//     return fs.writeFileSync(...args);
//   };
//   exports.statSync = function(...args) {
//     return fs.statSync(...args);
//   };
//   exports.existsSync = function(...args) {
//     return fs.existsSync(...args);
//   };
//   exports.readdirSync = function(...args) {
//     return fs.readdirSync(...args);
//   };
//   exports.unlinkSync = function(...args) {
//     return fs.unlinkSync(...args);
//   };
//   exports.createReadStream = function(...args) {
//     return fs.createReadStream(...args);
//   };
//   exports.createWriteStream = function(...args) {
//     return fs.createWriteStream(...args);
//   };
//   exports.readFile = promisify(function(...args) {
//     return fs.readFile(...args);
//   });
//   exports.writeFile = promisify(function(...args) {
//     return fs.writeFile(...args);
//   });
//   exports.stat = promisify(function(...args) {
//     return fs.stat(...args);
//   });
//   exports.readdir = promisify(function(...args) {
//     return fs.readdir(...args);
//   });
//   exports.unlink = promisify(function(...args) {
//     return fs.unlink(...args);
//   });
//   exports.mkdirp = function(filename) {
//     return new Promise(resolve => {
//       (fs.mkdirp || mkdirp)(filename, resolve);
//     });
//   };
//   exports.exists = function(filename) {
//     return new Promise(resolve => {
//       fs.exists(filename, resolve);
//     });
//   };
//   return exports;
// };

module.exports = FileSystem;
