import ModelEventClient from '../../core/events/model-event-client.js';
import Utils from '../../utils/utils.js';

import BuildingSettings from './building-settings.js';


export function asBuildingSettingsDao (client: ModelEventClient, planetId: string): BuildingSettingsDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,

    all (): Promise<BuildingSettings[]> {
      return client.listBuildingSettings(planetId);
    },
    get (buildingId: string): Promise<BuildingSettings | undefined> {
      return client.getBuildingSettings(planetId, buildingId);
    },
    set: Utils.PROMISE_NOOP_ANY,
    remove: Utils.PROMISE_NOOP_ANY
  }
}

export default interface BuildingSettingsDao {
  close (): Promise<void>;

  all (): Promise<BuildingSettings[]>;
  get (buildingId: string): Promise<BuildingSettings | undefined>;
  set (settings: BuildingSettings): Promise<BuildingSettings>;
  remove (buildingId: string): Promise<string>;
}
