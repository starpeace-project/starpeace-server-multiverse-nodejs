import _ from 'lodash';
import * as sqlite3 from 'sqlite3';

import Bookmark from '../corporation/bookmark';


export default class BookmarkStore {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/corporations.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS bookmarks (id TEXT PRIMARY KEY, corporationId TEXT NOT NULL, content TEXT NOT NULL)", (err:any) => {
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

  all (): Promise<Bookmark[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM bookmarks", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(_.map(_.filter(rows, (row: any) => row?.content != null), (row: any) => Bookmark.fromJson(JSON.parse(row.content))));
      });
    });
  }

  get (id: string): Promise<Bookmark | null> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM bookmarks WHERE id = ?", [id], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? Bookmark.fromJson(JSON.parse(row.content)) : null);
      });
    });
  }

  forCorporationId (corporationId: string): Promise<Bookmark[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM bookmarks WHERE corporationId = ?", [corporationId], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(_.map(_.filter(rows, (row: any) => row?.id), (row: any) => Bookmark.fromJson(row)));
      });
    });
  }

  set (bookmark: Bookmark): Promise<Bookmark> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO bookmarks (id, corporationId, content) VALUES (?, ?, ?)", [bookmark.id, bookmark.corporationId, JSON.stringify(bookmark.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(bookmark);
      });
    });
  }

}
