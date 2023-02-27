import * as sqlite3 from 'sqlite3';

import InventionSummary from './invention-summary';
import InventionSummaryDao from './invention-summary-dao';


export default class InventionSummaryStore implements InventionSummaryDao {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/companies.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS invention_summaries (companyId TEXT PRIMARY KEY, content TEXT NOT NULL)", (err:any) => {
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

  forCompanyId (companyId: string): Promise<InventionSummary> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM invention_summaries WHERE companyId = ?", [companyId], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? InventionSummary.fromJson(JSON.parse(row.content)) : new InventionSummary(companyId));
      });
    });
  }

  set (summary: InventionSummary): Promise<InventionSummary> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO invention_summaries (companyId, content) VALUES (?, ?)", [summary.companyId, JSON.stringify(summary.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(summary);
      });
    });
  }

}
