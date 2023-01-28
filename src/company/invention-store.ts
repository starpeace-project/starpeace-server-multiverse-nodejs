import _ from 'lodash';
import * as sqlite3 from 'sqlite3';

import Invention from '../company/invention';


export default class InventionStore {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/companies.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      const columns = [];
      columns.push('id TEXT PRIMARY KEY');
      columns.push('companyId TEXT NOT NULL');
      columns.push('status TEXT NOT NULL');
      columns.push('progress INTEGER NOT NULL');
      columns.push('investment INTEGER NOT NULL');
      columns.push('rebate INTEGER NOT NULL');
      columns.push('rebatePaid INTEGER NOT NULL');
      columns.push('createdAt INTEGER NOT NULL');
      columns.push('UNIQUE(id, companyId)');
      this.db.exec(`PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS inventions (${columns.join(', ')})`, (err) => {
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

  forCompanyId (companyId: string): Promise<Invention[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT id, companyId, status, progress, investment, rebate, rebatePaid, createdAt FROM inventions WHERE companyId = ?", [companyId], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(_.map(_.filter(rows, (row: any) => row?.id), (row: any) => Invention.fromJson(row)));
      });
    });
  }
  forId (companyId: string, inventionId: string): Promise<Invention | null> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.get("SELECT id, companyId, status, progress, investment, rebate, rebatePaid, createdAt FROM inventions WHERE id = ? AND companyId = ?", [inventionId, companyId], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.id ? Invention.fromJson(row) : null);
      });
    });
  }

  insert (invention: Invention): Promise<Invention> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');

      this.db.run("INSERT INTO inventions (id, companyId, status, progress, investment, rebate, rebatePaid, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [invention.id, invention.companyId, invention.status, invention.progress, invention.investment, invention.rebate, invention.rebatePaid, invention.createdAt], (err: Error) => {
        if (err) return reject(err);
        resolve(invention);
      });
    });
  }

  updateStatus (companyId: string, inventionId: string, status: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');

      this.db.run("UPDATE inventions SET status = ? WHERE id = ? AND companyId = ?", [status, inventionId, companyId], (err: Error) => {
        if (err) return reject(err);
        resolve(inventionId);
      });
    });
  }
  updateProgress (companyId: string, inventionId: string, progress: number): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');

      this.db.run("UPDATE inventions SET progress = ? WHERE id = ? AND companyId = ?", [progress, inventionId, companyId], (err: Error) => {
        if (err) return reject(err);
        resolve(inventionId);
      });
    });
  }

  delete (companyId: string, inventionId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');

      this.db.run("DELETE FROM inventions WHERE id = ? AND companyId = ?", [inventionId, companyId], (err: Error) => {
        if (err) return reject(err);
        resolve(inventionId);
      });
    });
  }
}
