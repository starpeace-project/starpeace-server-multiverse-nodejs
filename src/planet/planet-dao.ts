import ModelEventClient from '../core/events/model-event-client.js';
import Utils from '../utils/utils.js';

import Planet from './planet.js';


export function asPlanetDao (client: ModelEventClient, planetId: string): PlanetDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,
    get () { return client.planet(planetId); },
    set: Utils.PROMISE_NOOP_ANY
  }
}

export default interface PlanetDao {
  close (): Promise<void>;

  get (): Promise<Planet | null>;
  set (planet: Planet): Promise<Planet>;
}
