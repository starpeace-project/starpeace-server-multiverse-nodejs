import Utils from '../../utils/utils.js';

import BuildingMetrics from './building-metrics.js';
import BuildingMetricsDao from './building-metrics-dao.js';

export default class BuildingMetricsCache {
  dao: BuildingMetricsDao;

  loaded: boolean = false;
  dirtyBuildingIds: Set<string> = new Set();

  metricsByBuildingId: Record<string, BuildingMetrics> = {};

  constructor (dao: BuildingMetricsDao) {
    this.dao = dao;
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  async flush (): Promise<void> {
    const flushedIds: string[] = await Promise.all(Array.from(this.dirtyBuildingIds).map(id => {
      if (this.metricsByBuildingId[id]) {
        this.dao.set(this.metricsByBuildingId[id] as BuildingMetrics);
      }
      else {
        this.dao.remove(id);
      }
      return id;
    }));
    for (const id of flushedIds) {
      this.dirtyBuildingIds.delete(id);
    }
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (const metrics of (await this.dao.all())) {
        this.metricsByBuildingId[metrics.buildingId] = metrics;
      }
      this.loaded = true;
    });
  }

  remove (buildingId: string): void {
    if (this.metricsByBuildingId[buildingId]) {
      delete this.metricsByBuildingId[buildingId];
      this.dirtyBuildingIds.add(buildingId);
    }
  }

  all (): BuildingMetrics[] {
    return Object.values(this.metricsByBuildingId);
  }

  forBuildingId (buildingId: string): BuildingMetrics | undefined {
    return this.metricsByBuildingId[buildingId];
  }

  update (metricOrMetrics: BuildingMetrics | BuildingMetrics[]): void {
    if (Array.isArray(metricOrMetrics)) {
      for (const metrics of metricOrMetrics) {
        this.update(metrics);
      }
    }
    else {
      this.metricsByBuildingId[metricOrMetrics.buildingId] = metricOrMetrics;
      this.dirtyBuildingIds.add(metricOrMetrics.buildingId);
    }
  }
}
