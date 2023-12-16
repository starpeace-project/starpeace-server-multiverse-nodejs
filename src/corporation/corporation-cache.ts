import Corporation from '../corporation/corporation.js';
import type CorporationDao from './corporation-dao.js';
import Utils from '../utils/utils.js';

export default class CorporationCache {
  dao: CorporationDao;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byId: Record<string, Corporation>;

  idByTycoonId: Record<string, string>;

  constructor (dao: CorporationDao) {
    this.dao = dao;
    this.byId = {};
    this.idByTycoonId = {};
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (let corporation of await this.dao.all()) {
        this.loadCorporation(corporation);
      }
      this.loaded = true;
    });
  }

  flush (): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.dirtyIds.size) {
        return resolve();
      }

      Promise.all(Array.from(this.dirtyIds).map(id => {
        return this.dao.set(this.byId[id]);
      }))
        .then((corporations: Corporation[]) => {
          for (const corporation of corporations) {
            this.dirtyIds.delete(corporation.id);
          }
        })
        .then(resolve)
        .catch(reject);
    });
  }

  loadCorporation (corporation: Corporation): Corporation {
    this.byId[corporation.id] = corporation;
    this.idByTycoonId[corporation.tycoonId] = corporation.id;
    return corporation;
  }

  all (): Array<Corporation> {
    return Object.values(this.byId);
  }

  forId (corporationId: string): Corporation | undefined {
    return this.byId[corporationId];
  }
  forTycoonId (tycoonId: string): Corporation | undefined {
    return this.idByTycoonId[tycoonId] ? this.forId(this.idByTycoonId[tycoonId]) : undefined;
  }

  update (corporationOrCorporations: Corporation | Array<Corporation>): Corporation | Array<Corporation> {
    if (Array.isArray(corporationOrCorporations)) {
      for (const corporation of corporationOrCorporations) {
        this.update(corporation);
      }
    }
    else {
      this.loadCorporation(corporationOrCorporations);
      this.dirtyIds.add(corporationOrCorporations.id);
    }
    return corporationOrCorporations;
  }

  updateCash (corporationId: string, cash: number): Corporation | undefined {
    const corporation: Corporation | undefined = this.forId(corporationId);
    if (corporation && corporation.cash !== cash) {
      corporation.cash = cash;
      this.dirtyIds.add(corporationId);
    }
    return corporation;
  }
}
