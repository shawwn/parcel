const defaults = require('lodash.defaultsdeep');
const hash = require('hash-sum');

const DISPOSED = 'disposed';
const INJECT_STYLE_FN = 'injectStyle';
const CSS_MODULES = 'cssModules';
// const NAME = require('../package.json').name
const NAME = 'parce';

function _s(any) {
  return JSON.stringify(any);
}

// eslint-disable-next-line camelcase
function __vue_type__(type, id, esModule, addPrefix = true) {
  let output = addPrefix ? `\n/* ${type} */\n` : '';
  if (id) {
    if (esModule) {
      output += `import __vue_${type}__ from ${_s(id)}\n`;
    } else {
      output += `var __vue_${type}__ = require(${_s(id)})\n`;
    }
  } else {
    output += `var __vue_${type}__ = null\n`;
  }
  return output;
}

module.exports = function assemble(source, filename, config) {
  config = defaults({}, config, {
    esModule: true,
    shortFilePath: filename,
    require: {
      vueHotReloadAPI: 'vue-hot-reload-api'
      // normalizeComponent: NAME+'/src/runtime/normalize-component'
    },
    scopeId: null,
    moduleIdentifier: null,
    isHot: false,
    isServer: false,
    isProduction: true,
    isInjectable: false,
    hasStyleInjectFn: false,
    onWarn: message => console.warn(message)
  });

  let output = '';
  const {script, render, styles, customBlocks} = source;
  const needsHotReload = !config.isProduction && config.isHot;
  const hasScoped = styles.some(style => style.descriptor.scoped);

  if (config.isInjectable) config.esModule = false;

  if (needsHotReload) output += `var ${DISPOSED} = false\n`;

  let cssModules;
  if (styles.length) {
    let styleInjectionCode = '';

    if (needsHotReload) styleInjectionCode += `if (${DISPOSED}) return\n`;

    styles.forEach((style, i) => {
      const IMPORT_NAME = `__vue_style_${i}__`;
      const IMPORT_STRING = _s(style.id);
      const moduleName =
        style.descriptor.module === true ? '$style' : style.descriptor.module;
      const needsStyleInjection = config.hasStyleInjectFn;
      const needsNamedImport =
        needsStyleInjection || typeof moduleName === 'string';
      const runInjection = needsStyleInjection
        ? `${IMPORT_NAME} && ${IMPORT_NAME}.__inject__ && ${IMPORT_NAME}.__inject__(ssrContext)\n`
        : '';

      if (needsNamedImport) {
        output += config.esModule
          ? `import ${IMPORT_NAME} from ${IMPORT_STRING}\n`
          : `const ${IMPORT_NAME} = require(${IMPORT_STRING})\n`;
      } else {
        output += config.esModule
          ? `import ${IMPORT_STRING}\n`
          : `require(${IMPORT_STRING})\n`;
      }

      if (moduleName) {
        if (!cssModules) {
          cssModules = {};
          if (needsHotReload) {
            output += `var ${CSS_MODULES} = {}\n`;
          }
        }
        if (moduleName in cssModules) {
          config.onWarn({
            message: 'CSS module name "' + moduleName + '" is not unique!'
          });
          styleInjectionCode += runInjection;
        } else {
          cssModules[moduleName] = true;
          const MODULE_KEY = _s(moduleName);

          if (!needsHotReload) {
            styleInjectionCode +=
              runInjection + `this[${MODULE_KEY}] = ${IMPORT_NAME}\n`;
          } else {
            styleInjectionCode +=
              runInjection +
              `${CSS_MODULES}[${MODULE_KEY}] = ${IMPORT_NAME}\n` +
              `Object.defineProperty(this, ${MODULE_KEY}, { get: function () { return ${CSS_MODULES}[${MODULE_KEY}] }})\n`;

            output +=
              `module.hot && module.hot.accept([${_s(
                style.hotPath || style.id
              )}], function () {\n` +
              // 1. check if style has been injected
              `  var oldLocals = ${CSS_MODULES}[${MODULE_KEY}]\n` +
              `  if (!oldLocals) return\n` +
              // 2. re-import (side effect: updates the <style>)
              `  var newLocals = require(${IMPORT_STRING})\n` +
              // 3. compare new and old locals to see if selectors changed
              `  if (JSON.stringify(newLocals) === JSON.stringify(oldLocals)) return\n` +
              // 4. locals changed. Update and force re-render.
              `  ${CSS_MODULES}[${MODULE_KEY}] = newLocals\n` +
              `  require(${_s(config.require.vueHotReloadAPI)}).rerender(${_s(
                config.moduleId
              )})\n` +
              `})\n`;
          }
        }
      } else {
        styleInjectionCode += runInjection;
      }
    });
    output +=
      `function ${INJECT_STYLE_FN} (ssrContext) {\n` +
      pad(styleInjectionCode) +
      `}\n`;
  }

  // we require the component normalizer function, and call it like so:
  // normalizeComponent(
  //   scriptExports,
  //   compiledTemplate,
  //   injectStyles,
  //   scopeId,
  //   moduleIdentifier (server only)
  // )
  // output += config.esModule
  //   ? `import normalizeComponent from ${_s(config.require.normalizeComponent)}\n`
  //   : `var normalizeComponent = require(${_s(config.require.normalizeComponent)})\n`
  output += `
/* globals __VUE_SSR_CONTEXT__ */

// this module is a runtime utility for cleaner component module output.

function normalizeComponent (
  rawScriptExports,
  compiledTemplate,
  injectStyles,
  scopeId,
  moduleIdentifier /* server only */
) {
  var esModule
  var scriptExports = rawScriptExports = rawScriptExports || {}

  // ES6 modules interop
  var type = typeof rawScriptExports.default
  if (type === 'object' || type === 'function') {
    esModule = rawScriptExports
    scriptExports = rawScriptExports.default
  }

  // Vue.extend constructor export interop
  var options = typeof scriptExports === 'function'
    ? scriptExports.options
    : scriptExports

  // render functions
  if (compiledTemplate) {
    options.render = compiledTemplate.render
    options.staticRenderFns = compiledTemplate.staticRenderFns
  }

  // scopedId
  if (scopeId) {
    options._scopeId = scopeId
  }

  var hook
  if (moduleIdentifier) { // server build
    hook = function (context) {
      // 2.3 injection
      context =
        context || // cached call
        (this.$vnode && this.$vnode.ssrContext) || // stateful
        (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext) // functional
      // 2.2 with runInNewContext: true
      if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
        context = __VUE_SSR_CONTEXT__
      }
      // inject component styles
      if (injectStyles) {
        injectStyles.call(this, context)
      }
      // register component module identifier for async chunk inferrence
      if (context && context._registeredComponents) {
        context._registeredComponents.add(moduleIdentifier)
      }
    }
    // used by ssr in case component is cached and beforeCreate
    // never gets called
    options._ssrRegister = hook
  } else if (injectStyles) {
    hook = injectStyles
  }

  if (hook) {
    var functional = options.functional
    var existing = functional
      ? options.render
      : options.beforeCreate
    if (!functional) {
      // inject component registration as beforeCreate hook
      options.beforeCreate = existing
        ? [].concat(existing, hook)
        : [hook]
    } else {
      // register for functioal component in vue file
      options.render = function renderWithStyleInjection (h, context) {
        hook.call(context)
        return existing(h, context)
      }
    }
  }

  return {
    esModule: esModule,
    exports: scriptExports,
    options: options
  }
}
  `;
  // <script>
  output += __vue_type__('script', script.id, config.esModule);
  if (config.isInjectable) {
    output += `if (__vue_script__) { __vue_script__ = __vue_script__(injections) }\n`;
  }

  // <template>
  output += __vue_type__('template', render.id, config.esModule);

  // style
  output += '\n/* styles */\n';
  output +=
    'var __vue_styles__ = ' + (styles.length ? 'injectStyle' : 'null') + '\n';

  // scopeId
  output += '\n/* scopeId */\n';
  output +=
    'var __vue_scopeId__ = ' + (hasScoped ? _s(config.scopeId) : 'null') + '\n';

  // moduleIdentifier (server only)
  output += '\n/* moduleIdentifier (server only) */\n';
  output +=
    'var __vue_module_identifier__ = ' +
    (config.isServer ? _s(config.moduleIdentifier) : 'null') +
    '\n';

  // close normalizeComponent call
  output +=
    '\nvar Component = normalizeComponent(\n' +
    '  __vue_script__,\n' +
    '  __vue_template__,\n' +
    '  __vue_styles__,\n' +
    '  __vue_scopeId__,\n' +
    '  __vue_module_identifier__\n' +
    ')\n';

  // development-only code
  if (!config.isProduction) {
    // add filename in dev
    output += `Component.options.__file = ${_s(config.shortFilePath)}\n`;
    // check named exports
    output +=
      `if (Component.esModule && Object.keys(Component.esModule).some(function (key) {\n` +
      `  return key !== "default" && key.substr(0, 2) !== "__"\n` +
      `})) {\n` +
      `  console.error("named exports are not supported in *.vue files.")\n` +
      `}\n`;
    // check functional components used with templates
    if (render.id) {
      output +=
        'if (Component.options.functional) {\n' +
        '  console.error("' +
        '[vue-component-compiler] ' +
        filename +
        ': functional components are not ' +
        'supported with templates, they should use render functions.' +
        '")\n}\n';
    }
  }

  if (customBlocks.length) {
    let addedPrefix = false;
    customBlocks.forEach((customBlock, i) => {
      const TYPE = `customBlock_${customBlock.descriptor.type}_${i}`;
      const BLOCK = `__vue_${TYPE}__`;
      if (!addedPrefix) output += `\n/* Custom Blocks */\n`;
      output += __vue_type__(TYPE, customBlock.id, config.esModule, false);
      output += `if (typeof ${BLOCK} === 'function') { ${BLOCK}(Component) }\n`;
      addedPrefix = true;
    });
  }

  if (!config.isInjectable) {
    if (needsHotReload) {
      output +=
        `\n/* hot reload */\n` +
        `if (module.hot) { (function () {\n` +
        `  var hotAPI = require(${_s(config.require.vueHotReloadAPI)})\n` +
        `  hotAPI.install(require('vue'), false)\n` +
        `  if (!hotAPI.compatible) return\n` +
        `  module.hot.accept()\n` +
        `  if (!module.hot.data) {\n` +
        // initial insert
        `    hotAPI.createRecord(${_s(config.moduleId)}, Component.options)\n` +
        `  } else {\n`;
      // update
      if (cssModules) {
        output +=
          `    if (module.hot.data.cssModules && Object.keys(module.hot.data.cssModules) !== Object.keys(cssModules)) {\n` +
          `      delete Component.options._Ctor\n` +
          `    }\n`;
      }

      output +=
        `    hotAPI.reload(${_s(config.moduleId)}, Component.options)\n` +
        `  }\n`;

      // dispose
      output +=
        `  module.hot.dispose(function (data) {\n` +
        (cssModules ? `    data.cssModules = cssModules\n` : '') +
        `    disposed = true\n` +
        `  })\n`;

      output += `})()}\n`;
    }

    if (config.esModule) {
      output += `\nexport default Component.options\n`;
    } else {
      output += `\nmodule.exports = Component.exports\n`;
    }
  } else {
    output =
      `\n/* dependency injection */\n` +
      `module.exports = function (injections) {\n${pad(output)}\n` +
      `  return Component.exports\n` +
      `}\n`;
  }

  return output;
};

function pad(content) {
  return (
    content
      .trim()
      .split('\n')
      .map(line => '  ' + line)
      .join('\n') + '\n'
  );
}
