import * as sqlite3 from 'sqlite3';

import Building from '../building/building';
import BuildingDao from '../building/building-dao';


export default class BuildingStore implements BuildingDao {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/buildings.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS buildings (id TEXT PRIMARY KEY, townId TEXT NOT NULL, content TEXT NOT NULL)", (err: any) => {
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

  forTownId(townId: string): Promise<Building[]> {
    return new Promise((resolve:Function, reject:Function) => {
      this.db.all("SELECT content FROM buildings WHERE townId = ?", [townId], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => Building.fromJson(JSON.parse(row.content))));
      });
    });
  }

  get (id: string): Promise<Building | null> {
    return new Promise((resolve:Function, reject:Function) => {
      return this.db.get("SELECT content FROM buildings WHERE id = ?", [id], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? Building.fromJson(JSON.parse(row.content)) : null);
      });
    });
  }

  set (building: Building): Promise<Building> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');

      this.db.run("INSERT OR REPLACE INTO buildings (id, townId, content) VALUES (?, ?, ?)", [building.id, building.townId, JSON.stringify(building.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(building);
      });
    });
  }

}
