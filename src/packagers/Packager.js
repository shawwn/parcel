const promisify = require('../utils/promisify');

class Packager {
  constructor(bundle, bundler) {
    this.bundle = bundle;
    this.bundler = bundler;
    this.options = bundler.options;
    this.setup();
  }

  setup() {
    this.dest = this.outFS.createWriteStream(this.bundle.name);
    this.dest.write = promisify(this.dest.write.bind(this.dest));
    this.dest.end = promisify(this.dest.end.bind(this.dest));
  }

  get inFS() {
    return this.bundler.parser.inFS;
  }

  get outFS() {
    return this.bundler.parser.outFS;
  }

  async start() {}

  async addAsset(asset) {
    throw new Error('Must be implemented by subclasses');
  }

  async end() {
    await this.dest.end();
  }
}

module.exports = Packager;
