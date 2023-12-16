
import GovernmentMetrics from './government-metrics.js';
import GovernmentPolitics from './government-politics.js';
import GovernmentStore from './government-store.js';
import GovernmentTaxes from './government-taxes.js';
import Utils from '../../utils/utils.js';

export default class GovernmentCache {
  store: GovernmentStore;

  loaded: boolean = false;
  dirtyMetricsIds: Set<string> = new Set();
  dirtyPoliticsIds: Set<string> = new Set();
  dirtyTaxesIds: Set<string> = new Set();

  metricsById: Record<string, GovernmentMetrics> = {};
  politicsById: Record<string, GovernmentPolitics> = {};
  taxesById: Record<string, GovernmentTaxes> = {};

  constructor (store: GovernmentStore) {
    this.store = store;
  }

  close (): Promise<any> {
    return this.store.close();
  }

  async flush (): Promise<void> {
    await Promise.all([this.flushMetrics(), this.flushPolitics(), this.flushTaxes()]);
  }

  async flushMetrics (): Promise<void> {
    const metrics: GovernmentMetrics[] = await Promise.all(Array.from(this.dirtyMetricsIds).map(id => {
      return this.store.setTownMetrics(this.metricsById[id].townId, this.metricsById[id]);
    }));
    for (const metric of metrics) {
      this.dirtyMetricsIds.delete(metric.townId);
    }
  }

  async flushPolitics (): Promise<void> {
    const services: GovernmentPolitics[] = await Promise.all(Array.from(this.dirtyPoliticsIds).map(id => {
      return this.store.setTownPolitics(this.politicsById[id].townId, this.politicsById[id]);
    }));
    for (const service of services) {
      this.dirtyPoliticsIds.delete(service.townId);
    }
  }

  async flushTaxes (): Promise<void> {
    const inputs: GovernmentTaxes[] = await Promise.all(Array.from(this.dirtyTaxesIds).map(id => {
      return this.store.setTownTaxes(this.taxesById[id].townId, this.taxesById[id]);
    }));
    for (const input of inputs) {
      this.dirtyTaxesIds.delete(input.townId);
    }
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (const metrics of (await this.store.allMetrics())) {
        this.loadMetrics(metrics);
      }
      for (const politics of (await this.store.allPolitics())) {
        this.loadPolitics(politics);
      }
      for (const taxes of (await this.store.allTaxes())) {
        this.loadTaxes(taxes);
      }
      this.loaded = true;
    });
  }

  loadMetrics (metrics: GovernmentMetrics): void {
    this.metricsById[metrics.townId] = metrics;
  }

  loadPolitics (politics: GovernmentPolitics): void {
    this.politicsById[politics.townId] = politics;
  }

  loadTaxes (taxes: GovernmentTaxes): void {
    this.taxesById[taxes.townId] = taxes;
  }


  metricsForTownId (townId: string): GovernmentMetrics | undefined {
    return this.metricsById[townId];
  }

  politicsForTownId (townId: string): GovernmentPolitics | undefined {
    return this.politicsById[townId];
  }

  taxesForTownId (townId: string): GovernmentTaxes | undefined {
    return this.taxesById[townId];
  }

  updateMetrics (metrics: GovernmentMetrics | Array<GovernmentMetrics>): void {
    if (Array.isArray(metrics)) {
      for (const metric of metrics) {
        this.updateMetrics(metric);
      }
    }
    else {
      this.loadMetrics(metrics);
      this.dirtyMetricsIds.add(metrics.townId);
    }
  }

  updatePolitics (politics: GovernmentPolitics | Array<GovernmentPolitics>): void {
    if (Array.isArray(politics)) {
      for (const politic of politics) {
        this.updatePolitics(politic);
      }
    }
    else {
      this.loadPolitics(politics);
      this.dirtyPoliticsIds.add(politics.townId);
    }
  }

  updateTaxes (taxes: GovernmentTaxes | Array<GovernmentTaxes>): void {
    if (Array.isArray(taxes)) {
      for (const tax of taxes) {
        this.updateTaxes(tax);
      }
    }
    else {
      this.loadTaxes(taxes);
      this.dirtyTaxesIds.add(taxes.townId);
    }
  }
}
