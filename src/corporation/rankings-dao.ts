import ModelEventClient from '../core/events/model-event-client.js';
import Utils from '../utils/utils.js';

import Rankings from '../corporation/rankings.js';

export function asRankingsDao (client: ModelEventClient, planetId: string): RankingsDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,
    all (): Promise<Rankings[]> { return client.allRankings(planetId); },
    set: Utils.PROMISE_NOOP_ANY
  }
}

export default interface RankingsDao {
  close (): Promise<void>;
  all (): Promise<Rankings[]>;
  set (rankings: Rankings): Promise<Rankings>;
}
