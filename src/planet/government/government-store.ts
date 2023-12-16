import _ from 'lodash';
import sqlite3 from 'sqlite3';

import GovernmentMetrics from './government-metrics.js';
import GovernmentPolitics from './government-politics.js';
import GovernmentTaxes from './government-taxes.js';

export default class GovernmentStore {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/government.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS metrics (townId TEXT PRIMARY KEY, content TEXT NOT NULL)", (err: any) => {
        if (err) throw err;
      });
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS politics (townId TEXT PRIMARY KEY, content TEXT NOT NULL)", (err: any) => {
        if (err) throw err;
      });
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS taxes (townId TEXT PRIMARY KEY, content TEXT NOT NULL)", (err: any) => {
        if (err) throw err;
      });
    }
  }

  async close (): Promise<void> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.close((err: any) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  allMetrics (): Promise<GovernmentMetrics[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM metrics", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => GovernmentMetrics.fromJson(JSON.parse(row.content))));
      });
    });
  }
  async getMetricsForPlanet (): Promise<GovernmentMetrics | undefined> {
    return this.getMetricsForTownId('PLANET');
  }
  async getMetricsForTownId (townId: string): Promise<GovernmentMetrics | undefined> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM metrics WHERE townId = ?", [townId], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? GovernmentMetrics.fromJson(JSON.parse(row.content)) : undefined);
      });
    });
  }

  async setPlanetMetrics (metrics: GovernmentMetrics): Promise<GovernmentMetrics> {
    return this.setTownMetrics('PLANET', metrics);
  }
  async setTownMetrics (townId: string, metrics: GovernmentMetrics): Promise<GovernmentMetrics> {
    return new Promise((resolve: Function, reject: Function) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO metrics (townId, content) VALUES (?, ?)", [townId, JSON.stringify(metrics.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(metrics);
      });
    });
  }

  allPolitics (): Promise<GovernmentPolitics[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM politics", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => GovernmentPolitics.fromJson(JSON.parse(row.content))));
      });
    });
  }
  async getPoliticsForPlanet (): Promise<GovernmentPolitics | undefined> {
    return this.getPoliticsForTownId('PLANET');
  }
  async getPoliticsForTownId (townId: string): Promise<GovernmentPolitics | undefined> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM politics WHERE townId = ?", [townId], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? GovernmentPolitics.fromJson(JSON.parse(row.content)) : undefined);
      });
    });
  }

  async setPlanetPolitcs (politics: GovernmentPolitics): Promise<GovernmentPolitics> {
    return this.setTownPolitics('PLANET', politics);
  }
  async setTownPolitics (townId: string, politics: GovernmentPolitics): Promise<GovernmentPolitics> {
    return new Promise((resolve: Function, reject: Function) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO politics (townId, content) VALUES (?, ?)", [townId, JSON.stringify(politics.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(politics);
      });
    });
  }

  allTaxes (): Promise<GovernmentTaxes[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM taxes", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => GovernmentTaxes.fromJson(JSON.parse(row.content))));
      });
    });
  }
  async getTaxesForPlanet (): Promise<GovernmentTaxes | undefined> {
    return this.getTaxesForTownId('PLANET');
  }
  async getTaxesForTownId (townId: string): Promise<GovernmentTaxes | undefined> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM taxes WHERE townId = ?", [townId], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? GovernmentTaxes.fromJson(JSON.parse(row.content)) : undefined);
      });
    });
  }

  async setPlanetTaxes (taxes: GovernmentTaxes): Promise<GovernmentTaxes> {
    return this.setTownTaxes('PLANET', taxes);
  }
  async setTownTaxes (townId: string, taxes: GovernmentTaxes): Promise<GovernmentTaxes> {
    return new Promise((resolve: Function, reject: Function) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO taxes (townId, content) VALUES (?, ?)", [townId, JSON.stringify(taxes.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(taxes);
      });
    });
  }
}
