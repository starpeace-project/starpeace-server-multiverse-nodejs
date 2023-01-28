import { Subscriber } from 'zeromq';

import SimulationEvent from './simulation-event';

const SUBSCRIBE_PORT = 19170;

export default class SimulationEventSubscriber {
  subscriber: Subscriber;

  constructor () {
    this.subscriber = new Subscriber();
  }

  async start (eventCallback: (event: SimulationEvent) => Promise<void>): Promise<void> {
    this.subscriber.connect(`tcp://127.0.0.1:${SUBSCRIBE_PORT}`);
    this.subscriber.subscribe('SIMULATION');

    console.log(`[Simulation Event Subscriber] Started on port ${SUBSCRIBE_PORT}`);
    for await (const [topic, message] of this.subscriber) {
      if (topic.toString() !== 'SIMULATION') continue;
      await eventCallback(SimulationEvent.fromJson(JSON.parse(message.toString())));
    }
  }

  stop (): void {
    console.log('[Simulation Event Subscriber] Stopping...');
    this.subscriber.close();
    console.log('[Simulation Event Subscriber] Stopped');
  }

}
