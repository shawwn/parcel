const dbg = require('debug')('parcel:VueAsset');
const JSAsset = require('./JSAsset');
const config = require('../utils/config');
const localRequire = require('../utils/localRequire');
const compiler = require('shawwn-vue-compiler');
const fs = require('fs');

class VueAsset extends JSAsset {
  // constructor(name, pkg, options) {
  //   super(name, pkg, options);
  //   this.type = 'js';
  //   this.isAstDirty = false;
  // }

  collectDependencies() {
    dbg('collectDependencies');
    this.addDependency(
      'shawwn-vue-component-compiler/src/runtime/normalize-component'
    );
    return super.collectDependencies();
  }

  async parse(code) {
    dbg('parse', code);
    let vueconfig = await config.load(this.name, ['vue.config.json']);
    this.vue = compiler(code, this.name);
    dbg('parse:vue', code);
    this.contents = this.vue.code;
    this.vue.deps.forEach((v, k, map) => {
      //this.addURLDependency(k, process.cwd());
      const contents = v.code.code || v.code;
      dbg('parse:vue:write', [k, contents]);
      fs.writeFileSync(k, contents);
      this.addDependency(k, {contents: contents});
    });
    return await super.parse(this.contents);
    // this.vue.deps.forEach((v, k, map) => {
    //   //this.addURLDependency(k, process.cwd());
    //   dbg('parse:vue:write', [k, v.code.code || v.code])
    //   fs.writeFileSync(k, v.code.code || v.code);
    // });
    // return await super.parse(this.contents);
  }

  async resolve(dep) {
    dbg('resolve', dep);
  }
}

module.exports = VueAsset;
