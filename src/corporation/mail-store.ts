import * as sqlite3 from 'sqlite3';

import Mail from '../corporation/mail';


export default class MailStore {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/corporations.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS mail (id TEXT PRIMARY KEY, corporationId TEXT NOT NULL, content TEXT NOT NULL)", (err:any) => {
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

  all (): Promise<Mail[]> {
    return new Promise((resolve:Function, reject:Function) => {
      this.db.all("SELECT content FROM mail", [], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => Mail.fromJson(JSON.parse(row.content))));
      });
    });
  }

  get (id: string): Promise<Mail | null> {
    return new Promise((resolve:Function, reject:Function) => {
      return this.db.get("SELECT content FROM mail WHERE id = ?", [id], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? Mail.fromJson(JSON.parse(row.content)) : null);
      });
    });
  }

  forCorporationId (corporationId: string): Promise<Mail[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM mail WHERE corporationId = ?", [corporationId], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => Mail.fromJson(JSON.parse(row.content))));
      });
    });
  }

  set (mail: Mail): Promise<Mail> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO mail (id, corporationId, content) VALUES (?, ?, ?)", [mail.id, mail.corporationId, JSON.stringify(mail.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(mail);
      });
    });
  }

  delete (mailId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("DELETE FROM mail WHERE id = ?", [mailId], (err: Error) => {
        if (err) return reject(err);
        resolve(mailId);
      });
    });
  }

}
