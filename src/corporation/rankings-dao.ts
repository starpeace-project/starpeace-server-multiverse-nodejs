import ModelEventClient from '../core/events/model-event-client';
import Utils from '../utils/utils';

import Rankings from '../corporation/rankings';

export function asRankingsDao (client: ModelEventClient, planetId: string): RankingsDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,
    all (): Promise<Rankings[]> { return client.allRankings(planetId); }
  }
}

export default interface RankingsDao {
  close (): Promise<void>;

  all (): Promise<Rankings[]>;
}
