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
    this.addDependency(
      'shawwn-vue-component-compiler/src/runtime/normalize-component'
    );
    return super.collectDependencies();
  }

  async parse(code) {
    // require typescript, installed locally in the app
    // let typescript = localRequire('typescript', this.name);
    // let transpilerOptions = {
    //   compilerOptions: {
    //     module: typescript.ModuleKind.CommonJS,
    //     jsx: typescript.JsxEmit.Preserve
    //   },
    //   fileName: this.basename
    // };

    let vueconfig = await config.load(this.name, ['vue.config.json']);
    //
    // // Overwrite default if config is found
    // if (tsconfig) transpilerOptions.compilerOptions = tsconfig.compilerOptions;
    // transpilerOptions.compilerOptions.noEmit = false;

    // // Transpile Module using TypeScript and parse result as ast format through babylon
    // this.contents = typescript.transpileModule(
    //   code,
    //   transpilerOptions
    // ).outputText;
    // return await super.parse(this.contents);
    this.vue = compiler(code, this.name);
    console.log(['this.vue', this.vue]);
    this.contents = this.vue.code;
    console.log(this.contents);
    this.vue.deps.forEach((v, k, map) => {
      //this.addURLDependency(k, process.cwd());
      fs.writeFileSync(k.replace('?', '\\?'), v.code.code || v.code);
    });
    return await super.parse(this.contents);
  }

  async resolve(dep) {
    console.log(['vuedep', dep, this.vue]);
  }

  // collectDependencies() {
  //   console.log('deps')
  //   return super.collectDependencies()
  //   // this.ast.walk(node => {
  //   //   if (node.attrs) {
  //   //     for (let attr in node.attrs) {
  //   //       let elements = ATTRS[attr];
  //   //       if (elements && elements.includes(node.tag)) {
  //   //         let assetPath = this.addURLDependency(node.attrs[attr]);
  //   //         if (!isURL(assetPath)) {
  //   //           assetPath = path.join(this.options.publicURL, assetPath);
  //   //         }
  //   //         node.attrs[attr] = assetPath;
  //   //         this.isAstDirty = true;
  //   //       }
  //   //     }
  //   //   }
  //   //
  //   //   return node;
  //   // });
  // }

  // async transform() {
  //   // await posthtmlTransform(this);
  //   console.log('vue transform')
  //   return await super.transform()
  // }
  //
  // generate() {
  //   let html = this.isAstDirty ? this.render(this.ast) : this.contents;
  //   return {html};
  // }
  //
  // render() {
  //   return this.contents
  // }
}

module.exports = VueAsset;
