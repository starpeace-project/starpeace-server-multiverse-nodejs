import Town from '../planet/town.js';
import type TownDao from '../planet/town-dao.js';
import Utils from '../utils/utils.js';

export default class TownCache {
  dao: TownDao;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byId: Record<string, Town> = {};
  byColor: Record<number, Town> = {};

  constructor (dao: TownDao) {
    this.dao = dao;
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

  flush (): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.dirtyIds.size) {
        return resolve();
      }

      Promise.all(Array.from(this.dirtyIds).map(id => {
        return this.dao.set(this.byId[id]);
      }))
        .then((towns: Town[]) => {
          for (const town of towns) {
            this.dirtyIds.delete(town.id);
          }
        })
        .then(resolve)
        .catch(reject);
    });
  }

  loadTown (town: Town): Town {
    this.byId[town.id] = town;
    this.byColor[town.color] = town;
    return town;
  }

  all (): Town[] { return Object.values(this.byId); }
  forId (townId: string): Town | null { return this.byId[townId]; }
  forColor (color: number): Town | null { return this.byColor[color]; }

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
