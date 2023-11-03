import ModelEventClient from '../core/events/model-event-client.js';
import Utils from '../utils/utils.js';

import Town from '../planet/town.js';


export function asTownDao (client: ModelEventClient, planetId: string): TownDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,
    all () { return client.allTowns(planetId); },
    set: Utils.PROMISE_NOOP_ANY
  }
}

export default interface TownDao {
  close (): Promise<void>;
  all (): Promise<Town[]>;
  set (town: Town): Promise<Town>;
}
