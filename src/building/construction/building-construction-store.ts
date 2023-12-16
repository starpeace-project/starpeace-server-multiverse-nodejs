import sqlite3 from 'sqlite3';

import BuildingConstruction from './building-construction.js';
import BuildingConstructionDao from './building-construction-dao.js';

export default class BuildingConstructionStore implements BuildingConstructionDao {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/building.construction.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS construction (id TEXT PRIMARY KEY, content TEXT NOT NULL)", (err: any) => {
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

  async all (): Promise<BuildingConstruction[]> {
    return new Promise((resolve:Function, reject:Function) => {
      this.db.all("SELECT content FROM construction", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => BuildingConstruction.fromJson(JSON.parse(row.content))));
      });
    });
  }

  async get (id: string): Promise<BuildingConstruction> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM construction WHERE id = ?", [id], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? BuildingConstruction.fromJson(JSON.parse(row.content)) : null);
      });
    });
  }

  async set (construction: BuildingConstruction): Promise<BuildingConstruction> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO construction (id, content) VALUES (?, ?)", [construction.buildingId, JSON.stringify(construction.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(construction);
      });
    });
  }

  remove (id: string): Promise<string> {
    return new Promise((resolve: (value: string) => void, reject: (value: any) => void) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("DELETE FROM construction WHERE id = ?", [id], (err: Error | null) => {
        if (err) return reject(err);
        resolve(id);
      });
    });
  }
}
