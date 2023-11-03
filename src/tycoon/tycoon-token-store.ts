import sqlite3 from 'sqlite3';

const TWO_WEEKS = 1209600000;

export default class TycoonTokenStore {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database("./galaxy/sessions.db", (readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS tokens (token PRIMARY KEY, expires, uid)", (err) => {
        if (err) throw err;
      });
    }
  }

  close (): Promise<void> {
    return new Promise((resolve: (value: void) => void, reject: (value: any) => void) => {
      this.db.close((err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  cleanup (): Promise<void> {
    return new Promise((resolve: (value: void) => void, reject: (value: any) => void) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("DELETE FROM tokens WHERE ? > expires", [new Date().getTime()], (err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
  clear (): Promise<void> {
    return new Promise((resolve: (value: void) => void, reject: (value: any) => void) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.exec("DELETE FROM tokens", (err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  get (token: string): Promise<string> {
    return new Promise<string>((resolve: (value: string) => void, reject: (value: any) => void) => {
      this.db.get("SELECT uid FROM tokens WHERE token = ? AND ? <= expires", [token, new Date().getTime()], (err: Error | null, row: any) => {
        if (err) return reject(err);
        resolve(row?.uid);
      });
    });
  }

  set (token: string, uid: string): Promise<string> {
    return new Promise<string>((resolve: (value: string) => void, reject: (value: any) => void) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.all("INSERT OR REPLACE INTO tokens VALUES (?, ?, ?)", [token, new Date().getTime() + TWO_WEEKS, uid], (err: Error | null) => {
        if (err) return reject(err);
        resolve(token);
      });
    });
  }

  destroy (token: string): Promise<void> {
    return new Promise<void>((resolve: (value: void) => void, reject: (value: any) => void) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("DELETE FROM tokens WHERE token = ?", [token], (err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  length (): Promise<number> {
    return new Promise<number>((resolve: (value: number) => void, reject: (value: any) => void) => {
      this.db.all("SELECT COUNT(*) AS count FROM tokens", [], (err: Error | null, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows?.[0]?.count || 0);
      });
    });
  }

  consumeToken (token: string): Promise<string> {
    return new Promise((resolve: (value: string) => void, reject: (value: any) => void) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.get(token)
        .then((uid: string) => {
          if (uid) {
            this.destroy(token)
              .then(() => resolve(uid))
              .catch(reject);
          }
          else
            reject('INVALID_TOKEN');
        })
        .catch(reject);
    });
  }

}
