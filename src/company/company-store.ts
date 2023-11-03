import _ from 'lodash';
import sqlite3 from 'sqlite3';

import Company from '../company/company.js';
import type CompanyDao from './company-dao.js';


export default class CompanyStore implements CompanyDao {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/companies.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, content TEXT NOT NULL)", (err:any) => {
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

  all (): Promise<Company[]> {
    return new Promise((resolve:Function, reject:Function) => {
      this.db.all("SELECT content FROM companies", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(_.map(_.filter(rows, (row: any) => row?.content != null), (row: any) => Company.fromJson(JSON.parse(row.content))));
      });
    });
  }

  get (id: string): Promise<Company | null> {
    return new Promise((resolve:Function, reject:Function) => {
      return this.db.get("SELECT content FROM companies WHERE id = ?", [id], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? Company.fromJson(JSON.parse(row.content)) : null);
      });
    });
  }

  set (building: Company): Promise<Company> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');

      this.db.run("INSERT OR REPLACE INTO companies (id, content) VALUES (?, ?)", [building.id, JSON.stringify(building.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(building);
      });
    });
  }

}
