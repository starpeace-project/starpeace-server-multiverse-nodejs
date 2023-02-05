import winston from 'winston';
import { Subscriber } from 'zeromq';

import SimulationEvent from './simulation-event';

const SUBSCRIBE_PORT = 19170;

export default class SimulationEventSubscriber {
  logger: winston.Logger;
  subscriber: Subscriber;

  constructor (logger: winston.Logger) {
    this.logger = logger;
    this.subscriber = new Subscriber();
  }

  async start (eventCallback: (event: SimulationEvent) => Promise<void>): Promise<void> {
    this.subscriber.connect(`tcp://127.0.0.1:${SUBSCRIBE_PORT}`);
    this.subscriber.subscribe('SIMULATION');

    this.logger.info(`Started Simulation Event Subscriber on port ${SUBSCRIBE_PORT}`);
    for await (const [topic, message] of this.subscriber) {
      if (topic.toString() !== 'SIMULATION') continue;
      await eventCallback(SimulationEvent.fromJson(JSON.parse(message.toString())));
    }
  }

  stop (): void {
    this.logger.info('Stopping Simulation Event Subscriber...');
    this.subscriber.close();
    this.logger.info('Stopped Simulation Event Subscriber');
  }

}
