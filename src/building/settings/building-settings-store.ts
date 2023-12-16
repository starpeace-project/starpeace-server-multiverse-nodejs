import sqlite3 from 'sqlite3';

import type BuildingSettingsDao from './building-settings-dao.js';
import BuildingSettings from './building-settings.js';


export default class BuildingSettingsStore implements BuildingSettingsDao {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/building.settings.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS settings (buildingId TEXT PRIMARY KEY, content TEXT NOT NULL)", (err: any) => {
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

  async all (): Promise<BuildingSettings[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM settings", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => BuildingSettings.fromJson(JSON.parse(row.content))));
      });
    });
  }

  async get (buildingId: string): Promise<BuildingSettings | undefined> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM settings WHERE buildingId = ?", [buildingId], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? BuildingSettings.fromJson(JSON.parse(row.content)) : undefined);
      });
    });
  }

  async set (settings: BuildingSettings): Promise<BuildingSettings> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO settings (buildingId, content) VALUES (?, ?)", [settings.buildingId, JSON.stringify(settings.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(settings);
      });
    });
  }

  remove (buildingId: string): Promise<string> {
    return new Promise((resolve: (value: string) => void, reject: (value: any) => void) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("DELETE FROM settings WHERE buildingId = ?", [buildingId], (err: Error | null) => {
        if (err) return reject(err);
        resolve(buildingId);
      });
    });
  }
}
