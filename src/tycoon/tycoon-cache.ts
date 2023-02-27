import Tycoon from '../tycoon/tycoon';
import TycoonDao from './tycoon-dao';
import Utils from '../utils/utils';

export default class TycoonCache {
  dao: TycoonDao;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byId: Record<string, Tycoon> = {};
  idByUsername: Record<string, string> = {};

  constructor (dao: TycoonDao) {
    this.dao = dao;
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (let tycoon of await this.dao.all()) {
        this.byId[tycoon.id] = tycoon;
        this.idByUsername[tycoon.username] = tycoon.id;
      }
      this.loaded = true;
    });
  }

  flush (): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.dirtyIds.size) {
        return resolve();
      }

      Promise.all(Array.from(this.dirtyIds).map(id => this.dao.set(this.byId[id])))
        .then((tycoons: Tycoon[]) => {
          for (const tycoon of tycoons) {
            this.dirtyIds.delete(tycoon.id);
          }
        })
        .then(resolve)
        .catch(reject);
    });
  }

  loadTycoon (account: Tycoon): Tycoon {
    this.byId[account.id] = account;
    this.idByUsername[account.username] = account.id;
    return account;
  }

  all (): Array<Tycoon> { return Object.values(this.byId); }

  forId (tycoonId: string): Tycoon | null { return this.byId[tycoonId]; }
  forUsername (username: string): Tycoon | null { return this.forId(this.idByUsername[username]); }

  update (accountOrTycoons: Tycoon | Array<Tycoon>): void {
    if (Array.isArray(accountOrTycoons)) {
      for (const account of accountOrTycoons) {
        this.update(account);
      }
    }
    else {
      this.byId[accountOrTycoons.id] = accountOrTycoons;
      this.idByUsername[accountOrTycoons.username] = accountOrTycoons.id;
      this.dirtyIds.add(accountOrTycoons.id);
    }
  }

}
