import sqlite3 from 'sqlite3';

import BuildingMetrics from './building-metrics.js';
import BuildingMetricsDao from './building-metrics-dao.js';


export default class BuildingMetricsStore implements BuildingMetricsDao {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/building.metrics.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS metrics (buildingId TEXT PRIMARY KEY, content TEXT NOT NULL)", (err: any) => {
        if (err) throw err;
      });
    }
  }

  async close (): Promise<void> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.close((err:any) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async all (): Promise<BuildingMetrics[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM metrics", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => BuildingMetrics.fromJson(JSON.parse(row.content))));
      });
    });
  }

  async get (buildingId: string): Promise<BuildingMetrics | undefined> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM metrics WHERE buildingId = ?", [buildingId], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? BuildingMetrics.fromJson(JSON.parse(row.content)) : undefined);
      });
    });
  }

  async set (metrics: BuildingMetrics): Promise<BuildingMetrics> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO metrics (buildingId, content) VALUES (?, ?)", [metrics.buildingId, JSON.stringify(metrics.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(metrics);
      });
    });
  }

  remove (buildingId: string): Promise<string> {
    return new Promise((resolve: (value: string) => void, reject: (value: any) => void) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("DELETE FROM metrics WHERE buildingId = ?", [buildingId], (err: Error | null) => {
        if (err) return reject(err);
        resolve(buildingId);
      });
    });
  }
}
