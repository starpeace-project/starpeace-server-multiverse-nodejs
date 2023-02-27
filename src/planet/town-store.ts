import _ from 'lodash';
import * as sqlite3 from 'sqlite3';

import Town from '../planet/town';
import TownDao from './town-dao';


export default class TownStore implements TownDao {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/metadata.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS towns (id TEXT PRIMARY KEY, content TEXT NOT NULL)", (err: any) => {
        if (err) throw err;
      });
    }
  }

  close (): Promise<void> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.close((err: any) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  all (): Promise<Town[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM towns", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(_.map(_.filter(rows, (row: any) => row?.content != null), (row: any) => Town.fromJson(JSON.parse(row.content))));
      });
    });
  }

  get (id: string): Promise<Town | null> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM towns WHERE id = ?", [id], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? Town.fromJson(JSON.parse(row.content)) : null);
      });
    });
  }

  set (town: Town): Promise<Town> {
    return new Promise((resolve: Function, reject: Function) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO towns (id, content) VALUES (?, ?)", [town.id, JSON.stringify(town.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(town);
      });
    });
  }

}
