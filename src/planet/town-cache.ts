import Town from '../planet/town';
import TownDao from '../planet/town-dao';
import Utils from '../utils/utils';

export default class TownCache {
  dao: TownDao;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byId: Record<string, Town>;

  constructor (dao: TownDao) {
    this.dao = dao;
    this.byId = {};
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (let town of await this.dao.all()) {
        this.loadTown(town);
      }
      this.loaded = true;
    });
  }

  loadTown (town: Town): Town {
    this.byId[town.id] = town;
    return town;
  }

  all (): Town[] { return Object.values(this.byId); }
  forId (townId: string): Town | null { return this.byId[townId]; }

  update (townOrTowns: Town | Array<Town>): void {
    if (Array.isArray(townOrTowns)) {
      for (const town of townOrTowns) {
        this.update(town);
      }
    }
    else {
      this.loadTown(townOrTowns);
      this.dirtyIds.add(townOrTowns.id);
    }
  }

}
