import _ from 'lodash';
import sqlite3 from 'sqlite3';

import TycoonSettings from './tycoon-settings.js';

export default class TycoonSettingsStore {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/tycoons.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, content TEXT NOT NULL)", (err:any) => {
        if (err) throw err;
      });
    }
  }

  close (): Promise<void> {
    return new Promise((resolve:Function, reject:Function) => {
      this.db.close((err:any) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  all (): Promise<TycoonSettings[]> {
    return new Promise((resolve:Function, reject:Function) => {
      this.db.all("SELECT content FROM settings", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => TycoonSettings.fromJson(JSON.parse(row.content))));
      });
    });
  }

  get (id: string): Promise<TycoonSettings | undefined> {
    return new Promise((resolve:Function, reject:Function) => {
      return this.db.get("SELECT content FROM settings WHERE id = ?", [id], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? TycoonSettings.fromJson(JSON.parse(row.content)) : undefined);
      });
    });
  }

  set (settings: TycoonSettings): Promise<TycoonSettings> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO settings (id, content) VALUES (?, ?)", [settings.tycoonId, JSON.stringify(settings.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(settings);
      });
    });
  }

}
