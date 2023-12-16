import _ from 'lodash';
import cluster, { Worker } from 'cluster';
import { fork } from 'child_process';
import os from 'os';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';

import GalaxyManager from '../core/galaxy-manager.js';
import Logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Processes {
  simulation?: any;
  model?: any;
  workerById: any;
}

export default class ProcessManager {
  logger: winston.Logger;
  running: boolean = false;
  processes: Processes = {
    simulation: null,
    model: null,
    workerById: {}
  };

  galaxyManager: GalaxyManager;

  constructor () {
    this.logger = Logger.createProcessLoggerManager();
    Logger.banner(this.logger);
    this.galaxyManager = GalaxyManager.create(this.logger);

    setInterval(() => Logger.logMemory(this.logger), 1000 * 900);
  }

  start (): void {
    const cpuCount = os.cpus().length;
    const planetCount = this.galaxyManager.planets.length;
    const workerCount = Math.max(1, cpuCount - 1 - planetCount);

    this.running = true;
    for (let index = 0; index < planetCount; index++) {
      this.initializeSimulation(this.galaxyManager.planets[index].id, index);
    }
    this.initializeModelServer();
    this.initializeHttpWorkers(workerCount);

    this.logger.info(`Total Cores: ${cpuCount}`);
    this.logger.info("Model Server: 1");
    this.logger.info(`Simulation: ${planetCount}`);
    this.logger.info(`HTTP Worker: ${workerCount}`);
  }

  stop (): void {
    if (this.running) {
      this.logger.info('Shutting down server...');
      this.running = false;
      this.shutdownPollingLoop();
    }
  }

  shutdownPollingLoop (): void {
    if (!this.running) {
      if (!this.processes.simulation && !this.processes.model && !_.compact(_.values(this.processes.workerById)).length) {
        this.logger.info('All processes stopped, exitting');
        process.exit();
      }
      else {
        const simulationStatus = 'simulation ' + (this.processes.simulation ? 'running' : 'stopped');
        const modelStatus = 'model ' + (this.processes.model ? 'running' : 'stopped');
        const workerStatus = _.compact(_.values(this.processes.workerById)).length + ' HTTP workers running';
        this.logger.info('Waiting for processes to end... (' + simulationStatus + ', ' + modelStatus + ', ' + workerStatus + ')');
        setTimeout(() => this.shutdownPollingLoop(), 1000);
      }
    }
  }

  initializeSimulation (planetId: string, planetIndex: number): void {
    this.processes.simulation = fork(path.join(__dirname, '../process/process-simulation.js'), [planetId, planetIndex.toString()]);
    this.processes.simulation.on('exit', (code: any) => {
      if (this.running) {
        this.logger.info(` Simulation engine for ${planetId} exitted with status ${code}, will restart`);
        this.initializeSimulation(planetId, planetIndex);
      }
      else {
        this.processes.simulation = null;
      }
    });
  }

  initializeModelServer (): void {
    this.processes.model = fork(path.join(__dirname, '../process/process-model-server.js'));
    this.processes.model.on('exit', (code: any) => {
      if (this.running) {
        this.logger.info(`Model server exitted with status ${code}, will restart`);
        this.initializeModelServer();
      }
      else {
        this.processes.model = null;
      }
    });
  }

  initializeHttpWorkers (workerCount: number): void {
    for (let i = 0; i < workerCount; i++) {
      // required to use cluster forking, for express to delegate single port to children processes
      const worker = cluster.fork();
      this.processes.workerById[worker.id] = worker;
    }

    cluster.on('exit', (worker: Worker, code: number) => {
      this.processes.workerById[worker.id] = null;
      if (this.running) {
        this.logger.info(`Worker ${worker.id} stopped with code ${code}, will restart`);
        const newWorker = cluster.fork();
        this.processes.workerById[newWorker.id] = newWorker;
      }
    });
  }

}
