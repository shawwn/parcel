const os = require('os');
const WorkerNodes = require('worker-nodes');
const path = require('path');

class WorkerFarm {
  constructor(options) {
    this.options = options;
  }

  async run(...args) {
    if (!this.localWorker) {
      this.localWorker = require('./worker');
    }
    if (!this.workerNodes) {
      let workerOptions = {
        autoStart: true,
        lazyStart: true,
        maxWorkers: getNumWorkers(),
        minWorkers: 1,
        workerStopTimeout: 9999999
      };
      this.workerNodes = new WorkerNodes(
        path.resolve(path.join(__dirname, 'worker.js')),
        workerOptions
      );
    }
    // Child process workers are slow to start (~600ms).
    // While we're waiting, just run on the main thread.
    // This significantly speeds up startup time.
    let workers = this.workerNodes.workersQueue.filter(worker => worker.isOperational()).length;
    if (workers <= 0) {
      console.log('local');
      return await this.localWorker(this.options, ...args);
    } else {
      console.log('remote ' + workers);
      return await this.workerNodes.call(this.options, ...args);
    }
  }

  async init(options) {
    await this.end();
    this.options = options;
    if (this.localWorker) {
      this.localWorker.init(options);
    }
  }

  async end() {
    if (this.workerNodes) {
      await this.workerNodes.terminate();
      this.workerNodes = null;
    }
  }
}

function getNumWorkers() {
  let cores;
  try {
    cores = require('physical-cpu-count');
  } catch (err) {
    cores = os.cpus().length;
  }
  return cores > 1 ? cores - 1 : 1 || 1;
}

module.exports = WorkerFarm;
