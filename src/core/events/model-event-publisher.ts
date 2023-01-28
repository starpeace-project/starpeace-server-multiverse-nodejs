import _ from 'lodash';
import EventEmitter from 'events';
import { Publisher } from 'zeromq';

const ASYNC_CLIENT_TO_SERVER_PORT = 19167;

export default class ModelEventPublisher {
  running: boolean = false;
  events: EventEmitter;

  publisherSocket: Publisher;

  constructor () {
    this.running = false;
    this.events = new EventEmitter();

    this.publisherSocket = new Publisher();
  }

  start (): void {
    try {
      this.publisherSocket.connect(`tcp://127.0.0.1:${ASYNC_CLIENT_TO_SERVER_PORT}`);
      console.log(`[Model Event Publisher] Publisher started on port ${ASYNC_CLIENT_TO_SERVER_PORT}`);

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
    console.log('[Model Event Publisher] Stopping...');
    this.publisherSocket.close();
    console.log('[Model Event Publisher] Stopped');
  }

  async connectSocket (socketId: string, accountId: string): Promise<void> {
    if (!this.running) return;
    await this.publisherSocket.send(['SOCKET:CONNECT', JSON.stringify({ accountId: accountId, socketId: socketId })]);
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
