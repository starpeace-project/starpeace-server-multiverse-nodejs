import ModelEventClient from '../core/events/model-event-client';
import Utils from '../utils/utils';

import Building from './building';

export function asBuildingDao (client: ModelEventClient, planetId: string): BuildingDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,
    forTownId (townId: string) { return client.listTownBuildings(planetId, townId); },
    set: Utils.PROMISE_NOOP_ANY
  }
}

export default interface BuildingDao {
  close (): Promise<void>;
  forTownId (townId: string): Promise<Building[]>;
  set (building: Building): Promise<Building>;
}
