import _ from 'lodash';
import { DateTime } from 'luxon';

import Company from '../company/company';
import Utils from '../utils/utils';


export default class Corporation {
  id: string;
  tycoonId: string;
  planetId: string;

  name: string;
  levelId: string;

  lastMailAt: DateTime | null;
  buildingCount: number;

  companyIds: Set<string>;

  cash: number;
  cashflow: number;

  constructor (id: string, tycoonId: string, planetId: string, name: string, levelId: string, lastMailAt: DateTime | null, buildingCount: number, companyIds: Set<string>, cash: number, cashflow: number) {
    this.id = id;
    this.tycoonId = tycoonId;
    this.planetId = planetId;
    this.name = name;
    this.levelId = levelId;
    this.lastMailAt = lastMailAt;
    this.buildingCount = buildingCount;
    this.companyIds = companyIds;
    this.cash = cash;
    this.cashflow = cashflow;
  }

  withLastMailAt (time: DateTime): Corporation {
    this.lastMailAt = time;
    return this;
  }

  withCash (cash: number): Corporation {
    this.cash = cash;
    return this;
  }
  withCashflow (cashflow: number): Corporation {
    this.cashflow = cashflow;
    return this;
  }

  toJson (): any {
    return {
      id: this.id,
      tycoonId: this.tycoonId,
      planetId: this.planetId,
      name: this.name,
      levelId: this.levelId,
      lastMailAt: this.lastMailAt?.toISO(),
      buildingCount: this.buildingCount,
      companyIds: Array.from(this.companyIds),
      cash: this.cash,
      cashflow: this.cashflow
    };
  }

  toJsonApi (companies: Company[]): any {
    return {
      id: this.id,
      tycoonId: this.tycoonId,
      planetId: this.planetId,
      name: this.name,
      levelId: this.levelId,
      buildingCount: this.buildingCount,
      companies: _.map(companies, (company) => company.toJsonApi()),
      cash: this.cash,
      cashflow: this.cashflow
    };
  }

  static create (tycoonId: string, planetId: string, name: string, levelId: string, initialCash: number): Corporation {
    return new Corporation(
      Utils.uuid(),
      tycoonId,
      planetId,
      name,
      levelId,
      null,
      0,
      new Set(),
      initialCash,
      0
    );
  }

  static fromJson (json: any): Corporation {
    return new Corporation(
      json.id,
      json.tycoonId,
      json.planetId,
      json.name,
      json.levelId,
      json.lastMailAt ? DateTime.fromISO(json.lastMailAt) : null,
      parseInt(json.buildingCount ?? 0),
      new Set(Array.isArray(json.companyIds) ? json.companyIds : []),
      json.cash,
      json.cashflow
    );
  }
}
