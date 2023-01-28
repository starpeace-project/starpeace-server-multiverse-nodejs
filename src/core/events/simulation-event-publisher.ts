import { Publisher } from 'zeromq';

import Planet from '../../planet/planet';

const SUBSCRIBE_PORT = 19170;

export default class SimulationEventPublisher {
  planetIndex: number;
  publisherSocket: Publisher;
  bound: boolean;

  constructor (planetIndex: number) {
    this.planetIndex = planetIndex;
    this.publisherSocket = new Publisher();
    this.bound = false;
  }

  async start (): Promise<void> {
    await this.publisherSocket.bind(`tcp://127.0.0.1:${SUBSCRIBE_PORT + this.planetIndex}`);
    console.log(`[Simulation Event Publisher] Started on port ${SUBSCRIBE_PORT + this.planetIndex}`);
    this.bound = true;
  }

  stop (): void {
    console.log('[Simulation Event Publisher] Stopping...');
    this.bound = false;
    this.publisherSocket.close();
    console.log('[Simulation Event Publisher] Stopped');
  }

  async sendEvent (planetId: string, planet: Planet): Promise<void> {
    if (this.bound) {
      await this.publisherSocket.send(['SIMULATION', JSON.stringify({
        planetId: planetId,
        planet: planet.toJson()
      })]);
    }
  }
}
