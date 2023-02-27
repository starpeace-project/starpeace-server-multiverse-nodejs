import ModelEventClient from '../core/events/model-event-client';
import Utils from '../utils/utils';

import Corporation from '../corporation/corporation';

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
