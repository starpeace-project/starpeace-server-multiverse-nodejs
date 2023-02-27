import ModelEventClient from '../core/events/model-event-client';
import Utils from '../utils/utils';

import Town from '../planet/town';


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
