import ModelEventClient from '../core/events/model-event-client.js';
import Utils from '../utils/utils.js';

import Building from './building.js';

export function asBuildingDao (client: ModelEventClient, planetId: string): BuildingDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,
    forTownId (townId: string) {
      return client.listTownBuildings(planetId, townId);
    },
    set: Utils.PROMISE_NOOP_ANY,
    remove: Utils.PROMISE_NOOP_ANY
  }
}

export default interface BuildingDao {
  close (): Promise<void>;
  forTownId (townId: string): Promise<Building[]>;
  set (building: Building): Promise<Building>;
  remove (id: string): Promise<string>;
}
