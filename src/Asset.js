const dbg = require('debug')('parcel:Asset');
const path = require('path');
const fs = require('./utils/fs');
const objectHash = require('./utils/objectHash');
const md5 = require('./utils/md5');
const isURL = require('./utils/is-url');

let ASSET_ID = 1;

/**
 * An Asset represents a file in the dependency tree. Assets can have multiple
 * parents that depend on it, and can be added to multiple output bundles.
 * The base Asset class doesn't do much by itself, but sets up an interface
 * for subclasses to implement.
 */
class Asset {
  constructor(name, pkg, options) {
    dbg('constructor', [name, (pkg || {}).name, options]);
    this.id = ASSET_ID++;
    this.name = name;
    this.basename = path.basename(this.name);
    this.package = pkg || {};
    this.options = options;
    this.encoding = 'utf8';
    this.type = path.extname(this.name).slice(1);

    this.processed = false;
    this.contents = null;
    this.ast = null;
    this.generated = null;
    this.hash = null;
    this.parentDeps = new Set();
    this.dependencies = new Map();
    this.depAssets = new Map();
    this.parentBundle = null;
    this.bundles = new Set();
  }

  async loadIfNeeded() {
    dbg('loadIfNeeded');
    if (this.contents == null) {
      this.contents = await this.load();
    }
  }

  async parseIfNeeded() {
    dbg('parseIfNeeded');
    await this.loadIfNeeded();
    if (!this.ast) {
      this.ast = await this.parse(this.contents);
    }
  }

  async getDependencies() {
    dbg('getDependencies');
    await this.loadIfNeeded();

    if (this.mightHaveDependencies()) {
      await this.parseIfNeeded();
      this.collectDependencies();
    }
  }

  addDependency(name, opts) {
    dbg('addDependency', [name, this.name, opts]);
    this.dependencies.set(
      name,
      Object.assign(this.dependencies.get(name) || {}, {name}, opts)
    );
  }

  fixPath(file) {
    file = path.normalize(file);
    if (file.startsWith(process.cwd())) {
      file = file.replace(process.cwd(), '/');
    }
    file = path.normalize(file);
    if (path.isAbsolute(file)) {
      file = path.join(process.cwd(), file);
    }
    file = path.normalize(file);
    return file;
  }

  addURLDependency(url, from = this.name, opts) {
    dbg('addURLDependency', [url, from, opts]);
    if (!url || isURL(url)) {
      return url;
    }

    if (typeof from === 'object') {
      opts = from;
      from = this.name;
    }
    let name = this.fixPath(this.name);
    url = this.fixPath(url);
    from = this.fixPath(from);

    // if (path.isAbsolute(url)) {
    //   url = url.replace('/', process.cwd());
    //   //url = url.substring(1);
    // }
    let resolved = path
      .resolve(path.dirname(from), url)
      .replace(/[\?#].*$/, '');
    let rel = './' + path.relative(path.dirname(name), resolved);
    console.log({url: url, from: from, resolved: resolved, rel: rel});
    this.addDependency(
      //path.isAbsolute(rel) ? rel : ('./' + rel),
      rel,
      Object.assign({dynamic: true}, opts)
    );
    return this.options.parser
      .getAsset(resolved, this.package, this.options)
      .generateBundleName();
  }

  mightHaveDependencies() {
    return true;
  }

  async load() {
    dbg('load', [this.name, this.encoding]);
    return await fs.readFile(this.name, this.encoding);
  }

  parse() {
    dbg('parse', [this.name]);
    // do nothing by default
  }

  collectDependencies() {
    // do nothing by default
    dbg('collectDependencies', [this.name]);
  }

  async pretransform() {
    dbg('pretransform', [this.name]);
  }

  async transform() {
    // do nothing by default
    dbg('transform', [this.name]);
  }

  generate() {
    dbg('generate', [this.name]);
    return {
      [this.type]: this.contents
    };
  }

  async process() {
    if (!this.generated) {
      dbg('process', [this.name]);
      await this.loadIfNeeded();
      await this.pretransform();
      await this.getDependencies();
      await this.transform();
      this.generated = this.generate();
      this.hash = this.generateHash();
    }

    return this.generated;
  }

  generateHash() {
    const hash = objectHash(this.generated);
    dbg('generateHash', [this.name, hash]);
    return hash;
  }

  invalidate() {
    dbg('invalidate', [this.name]);
    this.processed = false;
    this.contents = null;
    this.ast = null;
    this.generated = null;
    this.hash = null;
    this.dependencies.clear();
    this.depAssets.clear();
  }

  invalidateBundle() {
    dbg('invalidateBundle', [this.name]);
    this.parentBundle = null;
    this.bundles.clear();
    this.parentDeps.clear();
  }

  generateBundleName(isMainAsset) {
    dbg('generateBundleName', [this.name, isMainAsset]);
    // Resolve the main file of the package.json
    let main =
      this.package && this.package.main
        ? path.resolve(path.dirname(this.package.pkgfile), this.package.main)
        : null;
    let ext = '.' + this.type;

    // If this asset is main file of the package, use the package name
    if (this.name === main) {
      return this.package.name + ext;
    }

    // If this is the entry point of the root bundle, use the original filename
    if (isMainAsset) {
      return path.basename(this.name, path.extname(this.name)) + ext;
    }

    // Otherwise generate a unique name
    return md5(this.name) + ext;
  }

  generateErrorMessage(err) {
    dbg('generateErrorMessage', [this.name, err]);
    return err;
  }

  async resolve(dep) {
    dbg('resolve', [this.name, dep.name]);
  }
}

module.exports = Asset;
