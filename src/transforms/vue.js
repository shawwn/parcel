const compiler = require('./vue-component-compiler');

// utility for generating a uid for each component file
// used in scoped CSS rewriting
var hash = require('hash-sum');
var cache = Object.create(null);

const genId = function genId(file) {
  return cache[file] || (cache[file] = hash(file));
};

module.exports = function compile(code, name, opts, cb) {
  const id = genId(name);
  const scopeId = `data-v-${id}`;
  // const id = 'xxx';
  const descriptors = compiler.parse(
    code,
    name,
    opts || {needMap: false, esModule: true}
  );
  const template = compiler.compileTemplate(
    {code: descriptors.template.content},
    name,
    {
      scopeId,
      options: {scopeId},
      isHot: true,
      esModule: true,
      isProduction: false
    }
  );

  let source = {
    styles: [
      // { id: cssid, descriptor: descriptors.styles[0] },
    ],
    render: {id: name + '__type=template.js', descriptor: descriptors.template},
    customBlocks: [
      // { id: '?type=custom&index=0', descriptor: descriptors.customBlocks[0] }
    ]
  };
  if (descriptors.script) {
    source.script = {
      id: name + '__type=script.js',
      descriptor: descriptors.script
    };
  } else {
    source.script = {id: name + '__type=script.js'};
  }
  let deps = new Map();
  deps.set(name + '__type=template.js', {
    code: template.code,
    descriptor: descriptors.template
  });
  deps.set(name + '__type=script.js', {
    code: descriptors.script ? descriptors.script.content : ' ',
    descriptor: descriptors.script
  });

  for (let i = 0; i < descriptors.styles.length; i++) {
    const cssid = `${name}__type=style&index=${i}.${
      typeof descriptors.styles[i].lang === 'string'
        ? descriptors.styles[i].lang
        : 'css'
    }`;
    source.styles.push({id: cssid, descriptor: descriptors.styles[i]});
    const style = descriptors.styles[i].lang
      ? {code: descriptors.styles[i].content}
      : compiler.compileStyle(
          {
            code: descriptors.styles[i].content,
            descriptor: Object.assign(
              {},
              descriptors.styles[i].attrs,
              descriptors.styles[i]
            )
          },
          name,
          {
            scopeId,
            isHot: true,
            esModule: true,
            isProduction: false,
            needMap: false,
            async: false
          }
        );
    deps.set(cssid, Object.assign({descriptor: descriptors.styles[i]}, style));
  }

  const result = {
    code: compiler.assemble(source, name, {
      scopeId,
      isServer: false,
      hasStyleInjectFn: true,
      isHot: true,
      esModule: true,
      isProduction: false,
      moduleId: scopeId
    })
  };
  result.deps = deps;
  return result;
};

module.exports.compiler = compiler;
