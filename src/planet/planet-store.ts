import sqlite3 from 'sqlite3';

import Planet from './planet.js';
import type PlanetDao from './planet-dao.js';

export default class PlanetStore implements PlanetDao {
  readOnly: boolean;
  db: sqlite3.Database;

  constructor (readOnly: boolean, planetId: string) {
    this.readOnly = readOnly;
    this.db = new sqlite3.Database(`./galaxy/${planetId}/metadata.db`, readOnly ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE));

    if (!readOnly) {
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS planet (id TEXT PRIMARY KEY, content TEXT NOT NULL)", (err) => {
        if (err) throw err;
      });
    }
  }

  async close (): Promise<void> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.close((err:Error | null): void => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async get (): Promise<Planet | null> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.get("SELECT content FROM planet WHERE id = ?", ['PLANET_ID'], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? Planet.fromJson(JSON.parse(row.content)) : null);
      });
    });
  }

  async set (planet: Planet): Promise<Planet> {
    return new Promise((resolve: Function, reject: Function) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.get("INSERT OR REPLACE INTO planet (id, content) VALUES (?, ?)", ['PLANET_ID', JSON.stringify(planet.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(planet);
      });
    });
  }

}
