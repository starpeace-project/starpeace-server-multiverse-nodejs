import BuildingConstruction from './building-construction.js';
import BuildingConstructionDao from './building-construction-dao.js';
import Utils from '../../utils/utils.js';

export default class BuildingConstructionCache {
  dao: BuildingConstructionDao;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byId: Record<string, BuildingConstruction> = {};

  constructor (dao: BuildingConstructionDao) {
    this.dao = dao;
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  flush (): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.dirtyIds.size) {
        return resolve();
      }

      Promise.all(Array.from(this.dirtyIds).map(async (id) => {
        if (this.byId[id]) {
          return (await this.dao.set(this.byId[id])).buildingId;
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
      for (const construction of await this.dao.all()) {
        this.byId[construction.buildingId] = construction;
      }
      this.loaded = true;
    });
  }


  all (): Array<BuildingConstruction> {
    return Object.values(this.byId);
  }

  forBuildingId (connectionId: string): BuildingConstruction | undefined {
    return this.byId[connectionId];
  }

  remove (constructionId: string): void {
    if (this.byId[constructionId]) {
      delete this.byId[constructionId];
    }
    this.dirtyIds.add(constructionId);
  }

  update (constructionOrConstructions: BuildingConstruction | Array<BuildingConstruction>): void {
    if (Array.isArray(constructionOrConstructions)) {
      for (const connection of constructionOrConstructions) {
        this.update(connection);
      }
    }
    else {
      this.byId[constructionOrConstructions.buildingId] = constructionOrConstructions;
      this.dirtyIds.add(constructionOrConstructions.buildingId);
    }
  }
}
