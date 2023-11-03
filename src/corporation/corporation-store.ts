import _ from 'lodash';
import sqlite3 from 'sqlite3';

import Corporation from '../corporation/corporation.js';
import type CorporationDao from './corporation-dao.js';


export default class CorporationStore implements CorporationDao {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/corporations.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS corporations (id TEXT PRIMARY KEY, tycoonId TEXT NOT NULL UNIQUE, content TEXT NOT NULL)", (err:any) => {
        if (err) throw err;
      });
    }
  }

  close (): Promise<void> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.close((err:any) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  all (): Promise<Corporation[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM corporations", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(_.map(_.filter(rows, (row: any) => row?.content != null), (row: any) => Corporation.fromJson(JSON.parse(row.content))));
      });
    });
  }

  get (id: string): Promise<Corporation | null> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM corporations WHERE id = ?", [id], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? Corporation.fromJson(JSON.parse(row.content)) : null);
      });
    });
  }

  set (corporation: Corporation): Promise<Corporation> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO corporations (id, tycoonId, content) VALUES (?, ?, ?)", [corporation.id, corporation.tycoonId, JSON.stringify(corporation.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(corporation);
      });
    });
  }

}
