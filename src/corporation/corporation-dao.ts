import ModelEventClient from '../core/events/model-event-client.js';
import Utils from '../utils/utils.js';

import Corporation from '../corporation/corporation.js';

export function asCorporationDao (client: ModelEventClient, planetId: string): CorporationDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,
    all () { return client.allCorporations(planetId); },
    set: Utils.PROMISE_NOOP_ANY
  }
}


export default interface CorporationDao {
  close (): Promise<void>;
  all (): Promise<Corporation[]>;
  set (corporation: Corporation): Promise<Corporation>;
}
