const os = require('os');
const FS = require('fs');
const Farm = require('worker-farm/lib/farm');
const promisify = require('./utils/promisify');

let shared = null;
let self = {rpc: null, rpcport: `/tmp/parcel-${process.pid}.sock`};

const {EventEmitter} = require('events');
const net = require('net');
const dnode = require('dnode');

function wrap(fn, xform = x => x) {
  return function(...args) {
    const cb = args.pop();
    return fn(...args, (e, ret) => (e ? cb(e, ret) : cb(e, xform(ret))));
  };
}

function nextEvent(emitter, event) {
  return new Promise(resolve => {
    emitter.once(event, resolve);
  });
}

function cleanupPort(fs) {
  try {
    FS.unlinkSync(self.rpcport);
  } catch (e) {}
}

class WorkerFarm extends Farm {
  constructor(options, fs) {
    let opts = {
      autoStart: true,
      maxConcurrentWorkers: getNumWorkers()
    };

    super(opts, require.resolve('./worker'));

    this.fs = fs || FS;
    this.localWorker = this.promisifyWorker(require('./worker'));
    this.remoteWorker = this.promisifyWorker(this.setup(['init', 'run']));

    this.started = false;
    this.listening = false;
    if (self.rpc) {
      self.rpc.close();
      delete self.rpc;
    }

    if (!self.rpc) {
      cleanupPort(this.fs.in);
      self.rpc = dnode({
        readFile: (...args) => {
          const cb = args.pop();
          this.fs.in
            .readFile(...args)
            .then(x => cb(null, x.toString()), err => cb(err));
        }
      }).listen(self.rpcport);
      self.rpc.on('listening', () => {
        this.listening = true;
        this.emit('listening');
      });
      self.rpc.on('remote', (remote, d) => {
        d = d;
      });
      self.rpc.on('local', (ref, d) => {
        d = d;
      });
    }
    this.init(options);
  }

  init(options) {
    options = Object.assign({rpcport: self.rpcport}, options); //{inputFileSystem: false, outputFileSystem: false, cacheFileSystem: false});
    this.localWorker.init(options);
    this.initRemoteWorkers(options);
  }

  promisifyWorker(worker) {
    let res = {};

    for (let key in worker) {
      res[key] = promisify(worker[key].bind(worker));
    }

    return res;
  }

  async initRemoteWorkers(options) {
    this.started = false;

    let promises = [];
    for (let i = 0; i < this.activeChildren; i++) {
      promises.push(this.remoteWorker.init(options));
    }

    await Promise.all(promises);
    this.started = true;
  }

  receive(data) {
    if (data.event) {
      this.emit(data.event, ...data.args);
    } else {
      super.receive(data);
    }
  }

  async run(...args) {
    // Child process workers are slow to start (~600ms).
    // While we're waiting, just run on the main thread.
    // This significantly speeds up startup time.
    if (!this.started) {
      return this.localWorker.run(...args);
    } else {
      return this.remoteWorker.run(...args);
    }
  }

  end() {
    super.end();
    shared = null;
  }

  static getShared(options, fs) {
    if (!shared) {
      shared = new WorkerFarm(options, fs);
    } else {
      shared.init(options);
    }

    return shared;
  }
}

for (let key in EventEmitter.prototype) {
  WorkerFarm.prototype[key] = EventEmitter.prototype[key];
}

function getNumWorkers() {
  let cores;
  try {
    cores = require('physical-cpu-count');
  } catch (err) {
    cores = os.cpus().length;
  }
  return cores || 1;
}

function exitHandler(options, err) {
  if (err) {
    console.log(err.stack);
  }
  if (options.clean) {
    // clean exit
  }
  if (self.rpc) {
    for (let id in self.rpc.sessions) {
      self.rpc.sessions[id].end();
    }
  }
  if (shared) {
    shared.end();
  }
  cleanupPort(FS);
  if (options.exit) {
    process.exit();
  }
}

// normal exit
process.on('exit', exitHandler.bind(null, {clean: true}));

// ctrl-c
process.on('SIGINT', exitHandler.bind(null, {exit: true}));

// "kill pid" (e.g. nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit: true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit: true}));

// uncaught exceptions
// process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

module.exports = WorkerFarm;
