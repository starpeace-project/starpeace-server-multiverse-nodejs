
import Planet from '../planet/planet.js';

export class SimulationCorporationFinances {
  cash: number = 0;
  cashflow: number = 0;

  constructor (cash: number, cashflow: number) {
    this.cash = cash;
    this.cashflow = cashflow;
  }

  toJson (corporationId: string): any {
    return {
      corporationId: corporationId,
      cash: this.cash,
      cashflow: this.cashflow
    }
  }

  static fromJson (json: any): SimulationCorporationFinances {
    return new SimulationCorporationFinances(
      json.cash,
      json.cashflow
    );
  }
}


export class SimulationFinancesFrame {
  financesByCorporationId: Record<string, SimulationCorporationFinances>;
  cashflowByCompanyId: Record<string, number>;

  constructor (financesByCorporationId: Record<string, SimulationCorporationFinances>, cashflowByCompanyId: Record<string, number>) {
    this.financesByCorporationId = financesByCorporationId;
    this.cashflowByCompanyId = cashflowByCompanyId;
  }

  toJson (): any {
    return {
      financesByCorporationId: Object.entries(this.financesByCorporationId).map(([corporationId, finances]) => finances.toJson(corporationId)),
      cashflowByCompanyId: this.cashflowByCompanyId
    }
  }

  static fromJson (json: any): SimulationFinancesFrame {
    return new SimulationFinancesFrame(
      Object.fromEntries(json.financesByCorporationId.map((json: any) => [json.corporationId, SimulationCorporationFinances.fromJson(json)])),
      json.cashflowByCompanyId
    );
  }
}

export class SimulationActiveResearch {
  inventionId: string | null = null;
  investment: number = 0;

  constructor (inventionId: string | null, investment: number) {
    this.inventionId = inventionId;
    this.investment = investment;
  }

  toJson (companyId: string): any {
    return {
      companyId: companyId,
      inventionId: this.inventionId,
      investment: this.investment
    }
  }

  static fromJson (json: any): SimulationActiveResearch {
    return new SimulationActiveResearch(
      json.inventionId,
      json.investment
    );
  }
}

export class SimulationResearchFrame {
  deletedInventionIdsByCompanyId: Record<string, Set<string>>;
  completedInventionIdByCompanyId: Record<string, string>;
  activeResearchByCompanyId: Record<string, SimulationActiveResearch>;

  constructor (deletedInventionIdsByCompanyId: Record<string, Set<string>>, completedInventionIdByCompanyId: Record<string, string>, activeResearchByCompanyId: Record<string, SimulationActiveResearch>) {
    this.deletedInventionIdsByCompanyId = deletedInventionIdsByCompanyId;
    this.completedInventionIdByCompanyId = completedInventionIdByCompanyId;
    this.activeResearchByCompanyId = activeResearchByCompanyId;
  }

  toJson (): any {
    return {
      deletedInventionIdsByCompanyId: Object.fromEntries(Object.entries(this.deletedInventionIdsByCompanyId).map(([companyId, inventionIds]) => [companyId, Array.from(inventionIds)])),
      completedInventionIdByCompanyId: this.completedInventionIdByCompanyId,
      activeResearchByCompanyId: Object.entries(this.activeResearchByCompanyId).map(([companyId, research]) => research.toJson(companyId))
    }
  }

  static fromJson (json: any): SimulationResearchFrame {
    return new SimulationResearchFrame(
      Object.fromEntries(Object.entries(json.deletedInventionIdsByCompanyId).map(([companyId, inventionIds]) => [companyId, new Set(<string[]> inventionIds)])),
      json.completedInventionIdByCompanyId,
      Object.fromEntries(json.activeResearchByCompanyId.map((json: any) => [json.companyId, SimulationActiveResearch.fromJson(json)])),
    );
  }
}

export default class SimulationFrame {
  planetId: string;
  planet: Planet;
  finances: SimulationFinancesFrame;
  research: SimulationResearchFrame;

  constructor (planetId: string, planet: Planet, finances: SimulationFinancesFrame, research: SimulationResearchFrame) {
    this.planetId = planetId;
    this.planet = planet;
    this.finances = finances;
    this.research = research;
  }

  toJson (): any {
    return {
      planetId: this.planetId,
      planet: this.planet.toJson(),
      finances: this.finances.toJson(),
      research: this.research.toJson()
    }
  }

  static fromJson (json: any): SimulationFrame {
    return new SimulationFrame(
      json.planetId,
      Planet.fromJson(json.planet),
      SimulationFinancesFrame.fromJson(json.finances),
      SimulationResearchFrame.fromJson(json.research)
    );
  }
}
