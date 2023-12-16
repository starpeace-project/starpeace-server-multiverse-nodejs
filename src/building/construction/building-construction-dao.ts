import ModelEventClient from '../../core/events/model-event-client.js';
import Utils from '../../utils/utils.js';

import BuildingConstruction from './building-construction.js';

export function asBuildingConstructionDao (client: ModelEventClient, planetId: string): BuildingConstructionDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,
    all (): Promise<BuildingConstruction[]> {
      return client.listBuildingConstructions(planetId);
    },
    get (id: string): Promise<BuildingConstruction | undefined> {
      return client.getBuildingConstruction(planetId, id);
    },
    set: Utils.PROMISE_NOOP_ANY,
    remove: Utils.PROMISE_NOOP_ANY
  }
}

export default interface BuildingConstructionDao {
  close (): Promise<void>;
  all (): Promise<BuildingConstruction[]>;
  get (id: string): Promise<BuildingConstruction | undefined>;
  set (construction: BuildingConstruction): Promise<BuildingConstruction>;
  remove (id: string): Promise<string>;
}
