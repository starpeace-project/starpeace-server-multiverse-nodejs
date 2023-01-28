import CompanyCache from './company-cache';
import Invention from './invention';
import InventionDao from './invention-dao';
import Utils from '../utils/utils';

export default class InventionCache {
  dao: InventionDao;
  companyCache: CompanyCache;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byId: Record<string, Invention>;

  idsByCompanyId: Record<string, Set<string>>;

  constructor (dao: InventionDao, companyCache: CompanyCache) {
    this.dao = dao;
    this.companyCache = companyCache;
    this.byId = {};
    this.idsByCompanyId = {};
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (const company of this.companyCache.all()) {
        for (const invention of await this.dao.forCompanyId(company.id)) {
          this.loadInvention(invention);
        }
      }
      this.loaded = true;
    });
  }

  loadInvention (invention: Invention): Invention {
    this.byId[invention.id] = invention;

    if (!this.idsByCompanyId[invention.companyId]) this.idsByCompanyId[invention.companyId] = new Set();
    this.idsByCompanyId[invention.companyId].add(invention.id);

    return invention;
  }

  forId (inventionId: string): Invention | null { return this.byId[inventionId]; }
  forCompanyId (companyId: string): Array<Invention> {
    return Array.from(this.idsByCompanyId[companyId] ?? []).map((id: string) => this.forId(id)).filter(c => !!c) as Invention[];
  }

  update (inventionOrInventions: Invention | Array<Invention>): Invention | Array<Invention> {
    if (Array.isArray(inventionOrInventions)) {
      for (const invention of inventionOrInventions) {
        this.update(invention);
      }
    }
    else {
      this.loadInvention(inventionOrInventions);
      this.dirtyIds.add(inventionOrInventions.id);
    }
    return inventionOrInventions;
  }

}
