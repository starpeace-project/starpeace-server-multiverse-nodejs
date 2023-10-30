import ModelEventClient from '../core/events/model-event-client';
import Utils from '../utils/utils';

import Building from './building';
import BuildingLabor from './building-labor';
import BuildingProduct from './building-product';

export function asBuildingDao (client: ModelEventClient, planetId: string): BuildingDao {
  return {
    close: Utils.PROMISE_NOOP_VOID,
    forTownId (townId: string) {
      return client.listTownBuildings(planetId, townId);
    },
    set: Utils.PROMISE_NOOP_ANY,

    laborsForBuildingId (buildingId: string) {
      return client.listBuildingLabors(planetId, buildingId);
    },
    getLabor (id: string) {
      return client.getBuildingLabor(planetId, id);
    },
    setLabor: Utils.PROMISE_NOOP_ANY,

    productsForBuildingId (buildingId: string) {
      return client.listBuildingProducts(planetId, buildingId);
    },
    getProduct (id: string) {
      return client.getBuildingProduct(planetId, id);
    },
    setProduct: Utils.PROMISE_NOOP_ANY,
  }
}

export default interface BuildingDao {
  close (): Promise<void>;
  forTownId (townId: string): Promise<Building[]>;
  set (building: Building): Promise<Building>;

  laborsForBuildingId(buildingId: string): Promise<BuildingLabor[]>;
  getLabor (id: string): Promise<BuildingLabor | undefined>;
  setLabor (buildingLabor: BuildingLabor): Promise<BuildingLabor>;

  productsForBuildingId(buildingId: string): Promise<BuildingProduct[]>;
  getProduct (id: string): Promise<BuildingProduct | undefined>;
  setProduct (buildingProduct: BuildingProduct): Promise<BuildingProduct>;
}
