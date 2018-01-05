const {EventEmitter} = require('events');
const os = require('os');
const Farm = require('worker-farm/lib/farm');
const promisify = require('./utils/promisify');
const WorkerNodes = require('worker-nodes');
const Path = require('path');
// const myWorker = new WorkerNodes(Path.resolve(Path.join(__dirname, './worker2.js')));

process.execArgv = process.execArgv.filter(x => !x.startsWith('--inspect-brk'));

let shared = null;

class WorkerFarm {
  constructor() {
    let opts = {
      autoStart: false,
      lazyStart: true,
      minWorkers: 1,
      maxWorkers: getNumWorkers(),
      maxConcurrentWorkers: getNumWorkers(),
      workerStopTimeout: 5000000
    };

    // super(opts, require.resolve('./worker'));

    this.localWorker = this.promisifyWorker(require('./worker'));
    // this.remoteWorker = this.promisifyWorker(this.setup(['init', 'run']));
    this.remoteWorker = new WorkerNodes(
      Path.resolve(Path.join(__dirname, './worker2.js')),
      opts
    );

    this.started = false;
  }

  async init(options) {
    // this.started = false;
    this.options = options;
    this.localWorker.init(options);
    this.initRemoteWorkers(options);
    // await this.remoteWorker.call.init(options);
    // this.started = true;
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

    if (!this.promises || this.promises.length <= 0) {
      this.promises = [];
      for (let i = 0; i < getNumWorkers(); i++) {
        this.promises.push(this.remoteWorker.call.init(options));
      }
    }

    await Promise.all(this.promises);
    this.promises = [];
    this.started = true;
    // this.emit('started');
  }

  receive(data) {
    if (data.event) {
      this.emit(data.event, ...data.args);
    } else {
      super.receive(data);
    }
  }

  async run(...args) {
    // try {
    //   process.execArgv = process.execArgv.filter(x => !x.startsWith('--inspect-brk'));
    //   console.log(await myWorker.call());
    // } catch (err) {
    //   console.error(err.message);
    //   console.log(err.stack);
    // }

    // Child process workers are slow to start (~600ms).
    // While we're waiting, just run on the main thread.
    // This significantly speeds up startup time.
    if (!this.started) {
      console.log('local');
      return this.localWorker.run(...args);
    } else {
      console.log('remote');
      return this.remoteWorker.call.run(this.options, ...args);
    }
  }

  end() {
    // super.end();
    console.log(['terminate']);
    this.remoteWorker.terminate();
    shared = null;
  }

  static async getShared(options) {
    if (!shared) {
      shared = new WorkerFarm();
    }
    await shared.init(options);

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
