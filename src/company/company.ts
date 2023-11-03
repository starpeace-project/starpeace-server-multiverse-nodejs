import Utils from "../utils/utils.js";

export default class Company {
  id: string;
  planetId: string;
  tycoonId: string;
  corporationId: string;
  sealId: string;
  name: string;

  cashflow: number;

  pendingResearchRebate: number

  constructor (id: string, planetId: string, tycoonId: string, corporationId: string, sealId: string, name: string, cashflow: number, pendingResearchRebate: number) {
    this.id = id;
    this.planetId = planetId;
    this.tycoonId = tycoonId;
    this.corporationId = corporationId;
    this.sealId = sealId;
    this.name = name;
    this.cashflow = cashflow;
    this.pendingResearchRebate = pendingResearchRebate;
  }

  withCashflow (cashflow: number): Company {
    this.cashflow = cashflow;
    return this;
  }

  toJsonApi (): any {
    return {
      id: this.id,
      tycoonId: this.tycoonId,
      corporationId: this.corporationId,
      sealId: this.sealId,
      name: this.name,
      cashflow: this.cashflow
    };
  }

  toJson (): any {
    return {
      id: this.id,
      planetId: this.planetId,
      tycoonId: this.tycoonId,
      corporationId: this.corporationId,
      sealId: this.sealId,
      name: this.name,
      cashflow: this.cashflow,
      pendingResearchRebate: this.pendingResearchRebate
    };
  }

  static create (planetId: string, tycoonId: string, corporationId: string, sealId: string, name: string): Company {
    return new Company(
      Utils.uuid(),
      planetId,
      tycoonId,
      corporationId,
      sealId,
      name,
      0,
      0
    );
  }
  static fromJson (json: any): Company {
    return new Company(
      json.id,
      json.planetId,
      json.tycoonId,
      json.corporationId,
      json.sealId,
      json.name,
      json.cashflow,
      json.pendingResearchRebate
    );
  }
}
