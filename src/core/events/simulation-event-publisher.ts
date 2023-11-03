import winston from 'winston';
import { Publisher } from 'zeromq';

import SimulationFrame from '../../engine/simulation-frame.js';

const SUBSCRIBE_PORT = 19170;

export default class SimulationEventPublisher {
  logger: winston.Logger;
  planetIndex: number;
  publisherSocket: Publisher;
  bound: boolean;

  constructor (logger: winston.Logger, planetIndex: number) {
    this.logger = logger;
    this.planetIndex = planetIndex;
    this.publisherSocket = new Publisher();
    this.bound = false;
  }

  async start (): Promise<void> {
    await this.publisherSocket.bind(`tcp://127.0.0.1:${SUBSCRIBE_PORT + this.planetIndex}`);
    this.logger.info(`Started Simulation Event Publisher on port ${SUBSCRIBE_PORT + this.planetIndex}`);
    this.bound = true;
  }

  stop (): void {
    this.logger.info('Stopping Simulation Event Publisher...');
    this.bound = false;
    this.publisherSocket.close();
    this.logger.info('Stopped Simulation Event Publisher');
  }

  async sendEvent (frame: SimulationFrame): Promise<void> {
    if (this.bound) {
      await this.publisherSocket.send(['SIMULATION', JSON.stringify(frame.toJson())]);
    }
  }
}
