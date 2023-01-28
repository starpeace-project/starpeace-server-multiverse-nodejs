import _ from 'lodash';
import * as sqlite3 from 'sqlite3';

import RankingsDao from './rankings-dao';
import Rankings from './rankings';


export default class RankingsStore implements RankingsDao {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/corporations.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS rankings (rankingTypeId TEXT PRIMARY KEY, content TEXT NOT NULL)", (err: any) => {
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

  all (): Promise<Rankings[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM rankings", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => Rankings.fromJson(JSON.parse(row.content))));
      });
    });
  }

  get (rankingTypeId: string): Promise<Rankings> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM rankings WHERE rankingTypeId = ?", [rankingTypeId], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? Rankings.fromJson(JSON.parse(row.content)) : null);
      });
    });
  }

  set (rankings: Rankings): Promise<Rankings> {
    return new Promise((resolve: Function, reject: Function) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO rankings (rankingTypeId, content) VALUES (?, ?)", [rankings.rankingTypeId, JSON.stringify(rankings.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(rankings);
      });
    });
  }

}
