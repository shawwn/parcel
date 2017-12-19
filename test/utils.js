const Bundler = require('../');
const rimraf = require('rimraf');
const assert = require('assert');
const vm = require('vm');
const path = require('path');
const WebSocket = require('ws');
const MemoryFS = require('memory-fs');
const FS = require('fs');

beforeEach(function(done) {
  const finalize = () => {
    rimraf.sync(path.join(__dirname, 'dist'));
    done();
  };

  // Test run in a single process, creating and deleting the same file(s)
  // Windows needs a delay for the file handles to be released before deleting
  // is possible. Without a delay, rimraf fails on `beforeEach` for `/dist`
  if (process.platform === 'win32') {
    sleep(50).then(finalize);
  } else {
    finalize();
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function bundler(file, opts, memoryFS = true) {
  const mfs = memoryFS ? new MemoryFS() : null;
  opts = Object.assign(
    {
      outDir: path.join(__dirname, 'dist'),
      outputFileSystem: mfs,
      watch: false,
      cache: false,
      killWorkers: false,
      hmr: false,
      logLevel: 1
    },
    opts
  );
  if (mfs) {
    mfs.mkdirpSync(opts.outDir);
  }
  return new Bundler(file, opts);
}

function bundle(file, opts) {
  return bundler(file, opts).bundle();
}

async function bundling(file, opts) {
  const b = await bundle(file, opts);
  return {b, fs: b.bundler.outFS};
}

function run(bundle, globals) {
  const {inFS, outFS} = bundle.bundler;
  // for testing dynamic imports
  const fakeDocument = {
    createElement(tag) {
      return {tag};
    },

    getElementsByTagName() {
      return [
        {
          appendChild(el) {
            setTimeout(function() {
              if (el.tag === 'script') {
                vm.runInContext(
                  outFS.readFileSync(path.join(__dirname, 'dist', el.src)),
                  ctx
                );
              }

              el.onload();
            }, 0);
          }
        }
      ];
    }
  };

  var ctx = Object.assign(
    {
      document: fakeDocument,
      WebSocket,
      console
    },
    globals
  );

  vm.createContext(ctx);
  const src = outFS.readFileSync(bundle.name);
  vm.runInContext(src, ctx);
  return ctx.require(bundle.entryAsset.id);
}

function assertBundleTree(bundle, tree) {
  const fs = bundle.bundler.parser.outFS;
  if (tree.name) {
    assert.equal(path.basename(bundle.name), tree.name);
  }

  if (tree.type) {
    assert.equal(bundle.type, tree.type);
  }

  if (tree.assets) {
    assert.deepEqual(
      Array.from(bundle.assets)
        .map(a => a.basename)
        .sort(),
      tree.assets.sort()
    );
  }

  if (tree.childBundles) {
    let children = Array.from(bundle.childBundles).sort(
      (a, b) =>
        Array.from(a.assets).sort()[0].basename <
        Array.from(b.assets).sort()[0].basename
          ? -1
          : 1
    );
    assert.equal(bundle.childBundles.size, tree.childBundles.length);
    tree.childBundles.forEach((b, i) => assertBundleTree(children[i], b));
  }

  if (/js|css/.test(bundle.type)) {
    assert(fs.existsSync(bundle.name));
  }
}

exports.sleep = sleep;
exports.bundler = bundler;
exports.bundle = bundle;
exports.bundling = bundling;
exports.run = run;
exports.assertBundleTree = assertBundleTree;
