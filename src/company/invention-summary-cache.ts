import CompanyCache from './company-cache';
import InventionSummary from './invention-summary';
import InventionSummaryDao from './invention-summary-dao';
import Utils from '../utils/utils';
import { InventionConfigurations } from '../core/galaxy-manager';


export default class InventionSummaryCache {
  dao: InventionSummaryDao;
  companyCache: CompanyCache;
  inventionConfigurations: InventionConfigurations;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byCompanyId: Record<string, InventionSummary>;

  constructor (dao: InventionSummaryDao, inventionConfigurations: InventionConfigurations, companyCache: CompanyCache) {
    this.dao = dao;
    this.companyCache = companyCache;
    this.inventionConfigurations = inventionConfigurations;
    this.byCompanyId = {};
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (const company of this.companyCache.all()) {
        this.loadInvention(await this.dao.forCompanyId(company.id));
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
        return this.dao.set(this.byCompanyId[id]);
      }))
        .then((summaries: InventionSummary[]) => {
          for (const summary of summaries) {
            this.dirtyIds.delete(summary.companyId);
          }
        })
        .then(resolve)
        .catch(reject);
    });
  }

  loadInvention (summary: InventionSummary): InventionSummary {
    this.byCompanyId[summary.companyId] = summary;
    return summary;
  }

  forCompanyId (companyId: string): InventionSummary {
    if (!this.byCompanyId[companyId]) {
      this.byCompanyId[companyId] = new InventionSummary(companyId);
    }
    return this.byCompanyId[companyId];
  }

  definition (definitionId: string) {
    return this.inventionConfigurations.definitionsById[definitionId];
  }

  update (inventionOrInventions: InventionSummary | Array<InventionSummary>): InventionSummary | Array<InventionSummary> {
    if (Array.isArray(inventionOrInventions)) {
      for (const invention of inventionOrInventions) {
        this.update(invention);
      }
    }
    else {
      this.loadInvention(inventionOrInventions);
      this.dirtyIds.add(inventionOrInventions.companyId);
    }
    return inventionOrInventions;
  }

  updateDeleted (companyId: string, inventionIds: Set<string>): InventionSummary {
    const summary: InventionSummary = this.forCompanyId(companyId);
    for (const inventionId of Array.from(inventionIds)) {
      if (summary.completedIds.has(inventionId)) {
        summary.completedIds.delete(inventionId);
        this.dirtyIds.add(companyId);
      }
      if (summary.activeId === inventionId) {
        summary.activeId = null;
        summary.activeInvestment = 0;
        this.dirtyIds.add(companyId);
      }
      const pendingIndex: number = summary.pendingIds.indexOf(inventionId);
      if (pendingIndex >= 0) {
        summary.pendingIds.splice(pendingIndex, 1);
        this.dirtyIds.add(companyId);
      }
      if (summary.canceledIds.has(inventionId)) {
        summary.canceledIds.delete(inventionId);
        this.dirtyIds.add(companyId);
      }
    }
    return summary;
  }
  updateCompleted (companyId: string, inventionId: string): InventionSummary {
    const summary: InventionSummary = this.forCompanyId(companyId);
    if (summary.activeId == inventionId) {
      summary.activeId = null;
      summary.activeInvestment = 0;
      this.dirtyIds.add(companyId);
    }
    if (!summary.completedIds.has(inventionId)) {
      summary.completedIds.add(inventionId);
      this.dirtyIds.add(companyId);
    }
    return summary;
  }
  updateActive (companyId: string, inventionId: string | null, investment: number): InventionSummary {
    const summary: InventionSummary = this.forCompanyId(companyId);
    const pendingIndex: number = inventionId ? summary.pendingIds.indexOf(inventionId) : -1;
    if (pendingIndex >= 0) {
      summary.pendingIds.splice(pendingIndex, 1);
      this.dirtyIds.add(companyId);
    }
    if (summary.activeId !== inventionId || summary.activeInvestment !== investment) {
      summary.activeId = inventionId;
      summary.activeInvestment = investment;
      this.dirtyIds.add(companyId);
    }
    return summary;
  }
}
