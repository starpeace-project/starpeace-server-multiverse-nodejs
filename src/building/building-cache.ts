import Building from '../building/building';
import BuildingDao from '../building/building-dao';
import TownCache from '../planet/town-cache';
import Utils from '../utils/utils';

export default class BuildingCache {
  dao: BuildingDao;
  townCache: TownCache;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byId: Record<string, Building>;

  idsByChunkId: Record<string, Set<string>>;
  idsByCompanyId: Record<string, Set<string>>;
  idsByTownId: Record<string, Set<string>>;

  constructor (dao: BuildingDao, townCache: TownCache) {
    this.dao = dao;
    this.townCache = townCache;
    this.byId = {};
    this.idsByChunkId = {};
    this.idsByCompanyId = {};
    this.idsByTownId = {};
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (const town of this.townCache.all()) {
        for (let building of await this.dao.forTownId(town.id)) {
          this.loadBuilding(building);
        }
      }
      this.loaded = true;
    });
  }

  loadBuilding (building: Building): Building {
    this.byId[building.id] = building;

    if (!this.idsByChunkId[building.chunkId]) this.idsByChunkId[building.chunkId] = new Set();
    this.idsByChunkId[building.chunkId].add(building.id)

    if (!this.idsByCompanyId[building.companyId]) this.idsByCompanyId[building.companyId] = new Set();
    this.idsByCompanyId[building.companyId].add(building.id)

    if (!this.idsByTownId[building.townId]) this.idsByTownId[building.townId] = new Set();
    this.idsByTownId[building.townId].add(building.id)

    return building;
  }

  all (): Array<Building> { return Object.values(this.byId); }

  forId (buildingId: string): Building | null { return this.byId[buildingId]; }
  forChunk (chunkX: number, chunkY: number): Array<Building> {
    return Array.from(this.idsByChunkId[`${chunkX}x${chunkY}`] ?? []).map((id: string) => this.forId(id)).filter(b => !!b) as Building[];
  }
  forCompanyId (companyId: string): Array<Building> {
    return Array.from(this.idsByCompanyId[companyId] ?? []).map((id: string) => this.forId(id)).filter(b => !!b) as Building[];
  }
  forTownId (townId: string): Array<Building> {
    return Array.from(this.idsByTownId[townId] ?? []).map((id: string) => this.forId(id)).filter(b => !!b) as Building[];
  }

  update (buildingOrBuildings: Building | Array<Building>): void {
    if (Array.isArray(buildingOrBuildings)) {
      for (const building of buildingOrBuildings) {
        this.update(building);
      }
    }
    else {
      this.loadBuilding(buildingOrBuildings);
      this.dirtyIds.add(buildingOrBuildings.id);
    }
  }

}
