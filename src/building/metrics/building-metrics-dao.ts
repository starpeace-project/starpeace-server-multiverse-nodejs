import ModelEventClient from '../../core/events/model-event-client.js';
import Utils from '../../utils/utils.js';

import BuildingMetrics from './building-metrics.js';

export function asBuildingMetricsDao (client: ModelEventClient, planetId: string): BuildingMetricsDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,

    all (): Promise<BuildingMetrics[]> {
      return client.listBuildingMetrics(planetId);
    },
    get (buildingId: string): Promise<BuildingMetrics | undefined> {
      return client.getBuildingMetrics(planetId, buildingId);
    },
    set: Utils.PROMISE_NOOP_ANY,
    remove: Utils.PROMISE_NOOP_ANY
  }
}

export default interface BuildingMetricsDao {
  close (): Promise<void>;

  all (): Promise<BuildingMetrics[]>;
  get (buildingId: string): Promise<BuildingMetrics | undefined>;
  set (metrics: BuildingMetrics): Promise<BuildingMetrics>;
  remove (buildingId: string): Promise<string>;
}
