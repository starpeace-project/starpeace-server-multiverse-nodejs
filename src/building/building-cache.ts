import { BuildingImageDefinition } from '@starpeace/starpeace-assets-types';

import Building from '../building/building.js';
import type BuildingDao from '../building/building-dao.js';
import { BuildingConfigurations } from '../core/galaxy-manager.js';
import TownCache from '../planet/town-cache.js';
import Utils from '../utils/utils.js';

export default class BuildingCache {
  dao: BuildingDao;
  townCache: TownCache;
  planetWidth: number;
  buildingConfigurations: BuildingConfigurations;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byId: Record<string, Building> = {};

  idByPositionIndex: Record<number, string> = {}
  idsByChunkId: Record<string, Set<string>> = {};
  idsByCompanyId: Record<string, Set<string>> = {};
  idsByTownId: Record<string, Set<string>> = {};

  constructor (dao: BuildingDao, planetWidth: number, buildingConfigurations: BuildingConfigurations, townCache: TownCache) {
    this.dao = dao;
    this.planetWidth = planetWidth;
    this.buildingConfigurations = buildingConfigurations;
    this.townCache = townCache;
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  flush (): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.dirtyIds.size) {
        return resolve();
      }

      Promise.all(Array.from(this.dirtyIds).map(async (id: string) => {
        if (this.byId[id]) {
          return (await this.dao.set(this.byId[id])).id;
        }
        else {
          return this.dao.remove(id);
        }
      }))
        .then((ids: string[]) => {
          for (const id of ids) {
            this.dirtyIds.delete(id);
          }
        })
        .then(resolve)
        .catch(reject);
    });
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

    const imageDefinition: BuildingImageDefinition | null = this.buildingConfigurations.imageForDefinitionId(building.definitionId);
    if (imageDefinition) {
      for (let y = 0; y < imageDefinition.tileHeight; y++) {
        for (let x = 0; x < imageDefinition.tileWidth; x++) {
          this.idByPositionIndex[(building.mapY - y) * this.planetWidth + (building.mapX - x)] = building.id;
        }
      }
    }

    if (!this.idsByChunkId[building.chunkId]) this.idsByChunkId[building.chunkId] = new Set();
    this.idsByChunkId[building.chunkId].add(building.id);

    if (!this.idsByCompanyId[building.companyId]) this.idsByCompanyId[building.companyId] = new Set();
    this.idsByCompanyId[building.companyId].add(building.id);

    if (!this.idsByTownId[building.townId]) this.idsByTownId[building.townId] = new Set();
    this.idsByTownId[building.townId].add(building.id);

    return building;
  }

  remove (buildingId: string): void {
    if (this.byId[buildingId]) {
      const building = this.byId[buildingId];

      const imageDefinition: BuildingImageDefinition | null = this.buildingConfigurations.imageForDefinitionId(building.definitionId);
      if (imageDefinition) {
        for (let y = 0; y < imageDefinition.tileHeight; y++) {
          for (let x = 0; x < imageDefinition.tileWidth; x++) {
            if (this.idByPositionIndex[(building.mapY - y) * this.planetWidth + (building.mapX - x)] === building.id) {
              delete this.idByPositionIndex[(building.mapY - y) * this.planetWidth + (building.mapX - x)];
            }
          }
        }
      }

      this.idsByChunkId[building.chunkId]?.delete(building.id);
      this.idsByCompanyId[building.companyId]?.delete(building.id);
      this.idsByTownId[building.townId]?.delete(building.id);

      delete this.byId[buildingId];
      this.dirtyIds.add(buildingId);
    }
  }

  all (): Array<Building> {
    return Object.values(this.byId);
  }

  forId (buildingId: string): Building | undefined {
    return this.byId[buildingId];
  }
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

  isPositionOccupied (mapX: number, mapY: number, width: number, height: number): boolean {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.idByPositionIndex[(mapY - y) * this.planetWidth + (mapX - x)]) {
          return true;
        }
      }
    }
    return false;
  }
}
