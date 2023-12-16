import _ from 'lodash';
import { DateTime } from 'luxon';

import Company from '../company/company.js';
import Utils from '../utils/utils.js';

export interface CorporationParameters {
  id: string;
  tycoonId: string;
  planetId: string;
  name: string;
  levelId: string;
  lastMailAt?: DateTime | undefined;
  buildingCount: number;
  companyIds: Set<string>;
  cash: number;
  prestige?: number | undefined;
}

export default class Corporation {
  id: string;
  tycoonId: string;
  planetId: string;

  name: string;
  levelId: string;

  lastMailAt: DateTime | undefined;
  buildingCount: number; // FIXME: TODO: can remove?

  companyIds: Set<string>;

  cash: number;
  prestige: number;


  constructor (parameters: CorporationParameters) {
    this.id = parameters.id;
    this.tycoonId = parameters.tycoonId;
    this.planetId = parameters.planetId;
    this.name = parameters.name;
    this.levelId = parameters.levelId;
    this.lastMailAt = parameters.lastMailAt;
    this.buildingCount = parameters.buildingCount;
    this.companyIds = parameters.companyIds;
    this.cash = parameters.cash;
    this.prestige = parameters.prestige ?? 0;
  }

  withLastMailAt (time: DateTime): Corporation {
    this.lastMailAt = time;
    return this;
  }

  withCash (cash: number): Corporation {
    this.cash = cash;
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
      prestige: this.prestige
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
      companies: _.map(companies, (company) => company.toJson()),
      cash: this.cash,
      prestige: this.prestige
    };
  }

  static create (tycoonId: string, planetId: string, name: string, levelId: string, initialCash: number): Corporation {
    return new Corporation({
      id: Utils.uuid(),
      tycoonId: tycoonId,
      planetId: planetId,
      name: name,
      levelId: levelId,
      lastMailAt: undefined,
      buildingCount: 0,
      companyIds: new Set(),
      cash: initialCash,
      prestige: 0
    });
  }

  static fromJson (json: any): Corporation {
    return new Corporation({
      id: json.id,
      tycoonId: json.tycoonId,
      planetId: json.planetId,
      name: json.name,
      levelId: json.levelId,
      lastMailAt: json.lastMailAt ? DateTime.fromISO(json.lastMailAt) : undefined,
      buildingCount: parseInt(json.buildingCount ?? 0),
      companyIds: new Set(Array.isArray(json.companyIds) ? json.companyIds : []),
      cash: json.cash,
      prestige: json.prestige
    });
  }
}
