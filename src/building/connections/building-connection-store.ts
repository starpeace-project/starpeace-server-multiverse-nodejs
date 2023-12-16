import sqlite3 from 'sqlite3';

import BuildingConnection from './building-connection.js';


export default class BuildingConnectionStore {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/building.connections.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS connections (id TEXT PRIMARY KEY, sourceBuildingId TEXT NOT NULL, sinkBuildingId TEXT NOT NULL, content TEXT NOT NULL)", (err: any) => {
        if (err) throw err;
      });
    }
  }

  async close (): Promise<void> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.close((err:any) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async forSourceBuildingId (sourceBuildingId: string): Promise<BuildingConnection[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM connections WHERE sourceBuildingId = ?", [sourceBuildingId], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => BuildingConnection.fromJson(JSON.parse(row.content))));
      });
    });
  }

  async forSinkBuildingId (sinkBuildingId: string): Promise<BuildingConnection[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM connections WHERE sinkBuildingId = ?", [sinkBuildingId], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => BuildingConnection.fromJson(JSON.parse(row.content))));
      });
    });
  }

  async get (id: string): Promise<BuildingConnection> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM connections WHERE id = ?", [id], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? BuildingConnection.fromJson(JSON.parse(row.content)) : null);
      });
    });
  }

  async set (connection: BuildingConnection): Promise<BuildingConnection> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO connections (id, sourceBuildingId, sinkBuildingId, content) VALUES (?, ?, ?, ?)", [connection.id, connection.sourceBuildingId, connection.sinkBuildingId, JSON.stringify(connection.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(connection);
      });
    });
  }
}
