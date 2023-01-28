import _ from 'lodash';
import { DateTime } from 'luxon';

import Company from '../company/company';

export default class Corporation {
  id: string;
  tycoonId: string;
  planetId: string;
  name: string;
  levelId: string;
  lastMailAt: DateTime | null;
  buildingCount: number;
  companyIds: Set<string>;

  constructor (id: string, tycoonId: string, planetId: string, name: string, levelId: string, lastMailAt: DateTime | null, buildingCount: number, companyIds: Set<string>) {
    this.id = id;
    this.tycoonId = tycoonId;
    this.planetId = planetId;
    this.name = name;
    this.levelId = levelId;
    this.lastMailAt = lastMailAt;
    this.buildingCount = buildingCount;
    this.companyIds = companyIds;
  }

  withLastSentAt (time: DateTime): Corporation {
    this.lastMailAt = time;
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
      companyIds: Array.from(this.companyIds)
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
      companies: _.map(companies, (company) => company.toJsonApi())
    };
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
      new Set(Array.isArray(json.companyIds) ? json.companyIds : [])
    );
  }
}
