const dbg = require('debug')('parcel:VueAsset');
const JSAsset = require('./JSAsset');
const config = require('../utils/config');
const localRequire = require('../utils/localRequire');
const compiler = require('../transforms/vue');
const fs = require('fs');

class VueAsset extends JSAsset {
  collectDependencies() {
    dbg('collectDependencies');
    return super.collectDependencies();
  }

  async parse(code) {
    dbg('parse', code);
    let vueconfig = await config.load(this.name, ['vue.config.json']);
    this.vue = compiler(code, this.name);
    dbg('parse:vue', code);
    this.contents = this.vue.code;
    this.vue.deps.forEach((v, k, map) => {
      const contents = v.code;
      dbg('parse:vue:write', [k, contents]);
      this.addDependency(k, {contents: contents});
    });
    return await super.parse(this.contents);
  }

  async resolve(dep) {
    dbg('resolve', dep);
  }
}

module.exports = VueAsset;
