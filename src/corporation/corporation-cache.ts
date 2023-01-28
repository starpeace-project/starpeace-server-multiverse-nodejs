import Corporation from '../corporation/corporation';
import { CorporationDao } from '../corporation/corporation-store';
import Utils from '../utils/utils';

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

  loadCorporation (corporation: Corporation): Corporation {
    this.byId[corporation.id] = corporation;
    this.idByTycoonId[corporation.tycoonId] = corporation.id;
    return corporation;
  }

  all (): Array<Corporation> {
    return Object.values(this.byId);
  }

  forId (corporationId: string): Corporation | null { return this.byId[corporationId]; }
  forTycoonId (tycoonId: string): Corporation | null {
    return this.idByTycoonId[tycoonId] ? this.forId(this.idByTycoonId[tycoonId]) : null;
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

}
