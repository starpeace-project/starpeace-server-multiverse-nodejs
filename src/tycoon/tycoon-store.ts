import _ from 'lodash';
import * as sqlite3 from 'sqlite3';

import Tycoon from '../tycoon/tycoon';
import TycoonDao from './tycoon-dao';

export default class TycoonStore implements TycoonDao {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database("./galaxy/tycoons.db", readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS tycoons (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, content TEXT NOT NULL)", (err:any) => {
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

  all (): Promise<Tycoon[]> {
    return new Promise((resolve:Function, reject:Function) => {
      this.db.all("SELECT content FROM tycoons", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(_.map(_.filter(rows, (row: any) => row?.content != null), (row: any) => Tycoon.fromJson(JSON.parse(row.content))));
      });
    });
  }

  get (id: string): Promise<Tycoon | null> {
    return new Promise((resolve:Function, reject:Function) => {
      return this.db.get("SELECT content FROM tycoons WHERE id = ?", [id], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? Tycoon.fromJson(JSON.parse(row.content)) : null);
      });
    });
  }

  forUsername (username: string): Promise<Tycoon | null> {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT content FROM tycoons WHERE username = ?", [username], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? Tycoon.fromJson(JSON.parse(row.content)) : null);
      });
    });
  }

  set (tycoon: Tycoon): Promise<Tycoon> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');

      this.db.run("INSERT OR REPLACE INTO tycoons (id, username, content) VALUES (?, ?, ?)", [tycoon.id, tycoon.username, JSON.stringify(tycoon.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(tycoon);
      });
    });
  }

}
