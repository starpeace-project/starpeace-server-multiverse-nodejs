import _ from 'lodash';

import Tycoon from '../tycoon/tycoon';
import { TycoonDao } from '../tycoon/tycoon-store';
import Utils from '../utils/utils';

export default class TycoonCache {
  dao: TycoonDao;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byId: Record<string, Tycoon>;
  idByUsername: Record<string, string>;

  constructor (dao: TycoonDao) {
    this.dao = dao;
    this.byId = {};
    this.idByUsername = {};
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (let account of await this.dao.all()) {
        this.byId[account.id] = account;
        this.idByUsername[account.username] = account.id;
      }
      this.loaded = true;
    });
  }

  loadTycoon (account: Tycoon): Tycoon {
    this.byId[account.id] = account;
    this.idByUsername[account.username] = account.id;
    return account;
  }

  all (): Array<Tycoon> { return _.values(this.byId); }

  forId (accountId: string): Tycoon | null { return this.byId[accountId]; }
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
