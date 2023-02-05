import _ from 'lodash';
import EventEmitter from 'events';
import winston from 'winston';
import { Publisher } from 'zeromq';

const ASYNC_CLIENT_TO_SERVER_PORT = 19167;

export default class ModelEventPublisher {
  logger: winston.Logger;
  running: boolean = false;
  events: EventEmitter;

  publisherSocket: Publisher;

  constructor (logger: winston.Logger) {
    this.logger = logger;
    this.running = false;
    this.events = new EventEmitter();

    this.publisherSocket = new Publisher();
  }

  start (): void {
    try {
      this.publisherSocket.connect(`tcp://127.0.0.1:${ASYNC_CLIENT_TO_SERVER_PORT}`);
      this.logger.info(`Model Event Publisher started on port ${ASYNC_CLIENT_TO_SERVER_PORT}`);

      this.running = true;
    }
    catch (err) {
      if (this.running) {
        throw err;
      }
    }
  }

  stop () {
    this.running = false;
    this.logger.info('Stopping Model Event Publisher...');
    this.publisherSocket.close();
    this.logger.info('Stopped Model Event Publisher');
  }

  async connectSocket (socketId: string, tycoonId: string): Promise<void> {
    if (!this.running) return;
    await this.publisherSocket.send(['SOCKET:CONNECT', JSON.stringify({ tycoonId: tycoonId, socketId: socketId })]);
  }
  async disconnectSocket (socketId: string): Promise<void> {
    if (!this.running) return;
    await this.publisherSocket.send(['SOCKET:DISCONNECT', JSON.stringify({ socketId: socketId })]);
  }

  async touchVisa (visaId: string) {
    if (!this.running) return;
    await this.publisherSocket.send(['VISA:TOUCH', JSON.stringify({ visaId: visaId })]);
  }

  async updateViewTarget (visaId: string, viewX: number, viewY: number) {
    if (!this.running) return;
    await this.publisherSocket.send(['VISA:VIEW', JSON.stringify({ visaId: visaId, viewX: viewX, viewY: viewY })]);
  }

}
