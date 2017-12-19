const path = require('path');
const md5 = require('./utils/md5');
const objectHash = require('./utils/objectHash');
const pkg = require('../package.json');
const json5 = require('json5');

// These keys can affect the output, so if they differ, the cache should not match
const OPTION_KEYS = ['publicURL', 'minify', 'hmr'];

class FSCache {
  constructor(options, parser) {
    this.options = options;
    this.parser = parser;
    this.dir = path.resolve(options.cacheDir || '.cache');
    this.dirExists = false;
    this.invalidated = new Set();
    this.optionsHash = objectHash(
      OPTION_KEYS.reduce((p, k) => ((p[k] = options[k]), p), {
        version: pkg.version
      })
    );
  }

  get fs() {
    return this.parser.cacheFS;
  }

  async ensureDirExists() {
    await this.fs.mkdirp(this.dir);
    this.dirExists = true;
  }

  getCacheFile(filename) {
    let hash = md5(this.optionsHash + filename);
    return path.join(this.dir, hash + '.json');
  }

  async write(filename, data) {
    try {
      await this.ensureDirExists();
      await this.fs.writeFile(
        this.getCacheFile(filename),
        JSON.stringify(data)
      );
      this.invalidated.delete(filename);
    } catch (err) {
      console.error('Error writing to cache', err);
    }
  }

  async read(filename) {
    if (this.invalidated.has(filename)) {
      return null;
    }

    let cacheFile = this.getCacheFile(filename);

    try {
      let stats = await this.fs.stat(filename);
      let cacheStats = await this.fs.stat(cacheFile);

      if (stats.mtime > cacheStats.mtime) {
        return null;
      }

      let data = await this.fs.readFile(cacheFile);
      return json5.parse(data);
    } catch (err) {
      return null;
    }
  }

  invalidate(filename) {
    this.invalidated.add(filename);
  }

  async delete(filename) {
    try {
      await this.fs.unlink(this.getCacheFile(filename));
      this.invalidated.delete(filename);
    } catch (err) {}
  }
}

module.exports = FSCache;
