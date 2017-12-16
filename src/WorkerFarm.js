const dbg = require('debug')('parcel:WorkerFarm');
const {EventEmitter} = require('events');
const os = require('os');
const Farm = require('worker-farm/lib/farm');
const promisify = require('./utils/promisify');

let shared = null;

class WorkerFarm extends Farm {
  constructor(options) {
    let opts = {
      autoStart: true,
      maxConcurrentWorkers: getNumWorkers()
    };

    super(opts, require.resolve('./worker'));

    this.localWorker = this.promisifyWorker(require('./worker'));
    this.remoteWorker = this.promisifyWorker(this.setup(['init', 'run']));

    this.started = false;
    this.init(options);
  }

  init(options) {
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
    const file = args[0];
    const pkg = args[1] && args[1].name;
    const opts = args[2];
    let result;
    let remote;
    if (!this.started) {
      remote = false;
      dbg('local', [file, pkg, opts]);
      result = await this.localWorker.run(...args);
    } else {
      remote = true;
      dbg('remote', [file, pkg, opts]);
      result = await this.remoteWorker.run(...args);
    }
    dbg('result', [remote ? 'remote' : 'local', file, pkg, opts]);
    dbg('result', result);
    return result;
  }

  end() {
    super.end();
    shared = null;
  }

  static getShared(options) {
    if (!shared) {
      shared = new WorkerFarm(options);
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

module.exports = WorkerFarm;
