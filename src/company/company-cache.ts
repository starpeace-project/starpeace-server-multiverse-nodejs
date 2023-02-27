import Company from '../company/company';
import CompanyDao from './company-dao';
import Utils from '../utils/utils';

export default class CompanyCache {
  dao: CompanyDao;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byId: Record<string, Company>;

  idsByCorporationId: Record<string, Set<string>>;

  constructor (dao: CompanyDao) {
    this.dao = dao;
    this.byId = {};
    this.idsByCorporationId = {};
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (let company of await this.dao.all()) {
        this.loadCompany(company);
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
        .then((companies: Company[]) => {
          for (const company of companies) {
            this.dirtyIds.delete(company.id);
          }
        })
        .then(resolve)
        .catch(reject);
    });
  }

  loadCompany (company: Company): Company {
    this.byId[company.id] = company;

    if (!this.idsByCorporationId[company.corporationId]) this.idsByCorporationId[company.corporationId] = new Set();
    this.idsByCorporationId[company.corporationId].add(company.id);

    return company;
  }

  all (): Array<Company> { return Object.values(this.byId); }

  forId (companyId: string): Company | null { return this.byId[companyId]; }
  forCorporationId (corporationId: string): Array<Company> {
    return Array.from(this.idsByCorporationId[corporationId] ?? []).map((id: string) => this.forId(id)).filter(c => !!c) as Company[];
  }

  update (companyOrCompanys: Company | Array<Company>): Company | Array<Company> {
    if (Array.isArray(companyOrCompanys)) {
      for (const company of companyOrCompanys) {
        this.update(company);
      }
    }
    else {
      this.loadCompany(companyOrCompanys);
      this.dirtyIds.add(companyOrCompanys.id);
    }
    return companyOrCompanys;
  }

  updateCashflow (companyId: string, cashflow: number): Company | null {
    const company: Company | null = this.forId(companyId)?.withCashflow(cashflow) ?? null;
    if (company) this.dirtyIds.add(companyId);
    return company;
  }
}
