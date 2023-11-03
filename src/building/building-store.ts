import sqlite3 from 'sqlite3';

import Building from '../building/building.js';
import type BuildingDao from '../building/building-dao.js';
import BuildingLabor from '../building/building-labor.js';
import BuildingProduct from '../building/building-product.js';


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
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS building_labors (id TEXT PRIMARY KEY, buildingId TEXT NOT NULL, content TEXT NOT NULL)", (err: any) => {
        if (err) throw err;
      });
      this.db.exec("PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS building_products (id TEXT PRIMARY KEY, buildingId TEXT NOT NULL, content TEXT NOT NULL)", (err: any) => {
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

  forTownId(townId: string): Promise<Building[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM buildings WHERE townId = ?", [townId], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => Building.fromJson(JSON.parse(row.content))));
      });
    });
  }

  get (id: string): Promise<Building | null> {
    return new Promise((resolve: Function, reject: Function) => {
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

  laborsForBuildingId(buildingId: string): Promise<BuildingLabor[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM building_labors WHERE buildingId = ?", [buildingId], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => BuildingLabor.fromJson(JSON.parse(row.content))));
      });
    });
  }
  getLabor (id: string): Promise<BuildingLabor | undefined> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM building_labors WHERE id = ?", [id], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? BuildingLabor.fromJson(JSON.parse(row.content)) : undefined);
      });
    });
  }
  setLabor (buildingLabor: BuildingLabor): Promise<BuildingLabor> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO building_labors (id, buildingId, content) VALUES (?, ?, ?)", [buildingLabor.id, buildingLabor.buildingId, JSON.stringify(buildingLabor.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(buildingLabor);
      });
    });
  }

  productsForBuildingId(buildingId: string): Promise<BuildingProduct[]> {
    return new Promise((resolve: Function, reject: Function) => {
      this.db.all("SELECT content FROM building_products WHERE buildingId = ?", [buildingId], (err: Error, rows: Array<any>) => {
        if (err) return reject(err);
        resolve(rows.filter((row: any) => row?.content != null).map((row: any) => BuildingProduct.fromJson(JSON.parse(row.content))));
      });
    });
  }
  getProduct (id: string): Promise<BuildingProduct | undefined> {
    return new Promise((resolve: Function, reject: Function) => {
      return this.db.get("SELECT content FROM building_products WHERE id = ?", [id], (err: Error, row: any) => {
        if (err) return reject(err);
        resolve(row?.content ? BuildingProduct.fromJson(JSON.parse(row.content)) : undefined);
      });
    });
  }
  setProduct (buildingProduct: BuildingProduct): Promise<BuildingProduct> {
    return new Promise((resolve, reject) => {
      if (this.readOnly) return reject('READ_ONLY');
      this.db.run("INSERT OR REPLACE INTO building_products (id, buildingId, content) VALUES (?, ?, ?)", [buildingProduct.id, buildingProduct.buildingId, JSON.stringify(buildingProduct.toJson())], (err: Error) => {
        if (err) return reject(err);
        resolve(buildingProduct);
      });
    });
  }
}
