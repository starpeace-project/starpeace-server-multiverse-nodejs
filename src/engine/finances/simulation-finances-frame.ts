import Building from '../../building/building.js';
import Company from '../../company/company.js';
import Corporation from '../../corporation/corporation.js';
import Town from '../../planet/town.js';

export class SimulationFinancesFrameParameters {
  cashByTownId?: Record<string, number> | undefined;
  cashflowByTownId?: Record<string, number> | undefined;

  cashByCorporationId?: Record<string, number> | undefined;
  cashflowByCorporationId?: Record<string, number> | undefined;
  cashflowByCompanyId?: Record<string, number> | undefined;
  cashflowByBuildingId?: Record<string, number> | undefined;
}

export default class SimulationFinancesFrame {
  /**
   * IFEL budget per town
   */
  cashByTownId: Record<string, number>;
  cashflowByTownId: Record<string, number>;

  cashByCorporationId: Record<string, number>;

  /**
   * Corporation cashflow is equal sum of all company cashflows (in corporation)
   */
  cashflowByCorporationId: Record<string, number>;

  /**
   * Company cashflow is equal sum of all building cashflows (in company) and any other company expenses
   */
  cashflowByCompanyId: Record<string, number>;

  /**
   * Building cashflow
   */
  cashflowByBuildingId: Record<string, number>;

  constructor (parameters: SimulationFinancesFrameParameters) {
    this.cashByTownId = parameters.cashByTownId ?? {};
    this.cashflowByTownId = parameters.cashflowByTownId ?? {};
    this.cashByCorporationId = parameters.cashByCorporationId ?? {};
    this.cashflowByCorporationId = parameters.cashflowByCorporationId ?? {};
    this.cashflowByCompanyId = parameters.cashflowByCompanyId ?? {};
    this.cashflowByBuildingId = parameters.cashflowByBuildingId ?? {};
  }

  townCash (townId: string): number {
    return (this.cashByTownId[townId] ?? 0) + (this.cashflowByTownId[townId] ?? 0);
  }
  townCashAvailable (townId: string): number {
    return Math.max(0, this.townCash(townId));
  }

  corporationCash (corporationId: string): number {
    return (this.cashByCorporationId[corporationId] ?? 0) + (this.cashflowByCorporationId[corporationId] ?? 0);
  }
  corporationCashAvailable (corporationId: string): number {
    return Math.max(0, this.corporationCash(corporationId));
  }

  adjustCompanyCashflow (corporationId: string, companyId: string, delta: number): void {
    if (this.cashflowByCorporationId[corporationId] !== undefined) {
      this.cashflowByCorporationId[corporationId] += delta;
    }
    if (this.cashflowByCompanyId[companyId] !== undefined) {
      this.cashflowByCompanyId[companyId] += delta;
    }
  }

  adjustBuildingCashflow (townId: string, corporationId: string, companyId: string, buildingId: string, delta: number): void {
    if (corporationId === 'IFEL') {
      if (this.cashflowByTownId[townId] !== undefined) {
        this.cashflowByTownId[townId] += delta;
      }
    }
    else {
      if (this.cashflowByCorporationId[corporationId] !== undefined) {
        this.cashflowByCorporationId[corporationId] += delta;
      }
      if (this.cashflowByCompanyId[companyId] !== undefined) {
        this.cashflowByCompanyId[companyId] += delta;
      }
    }
    if (this.cashflowByBuildingId[buildingId] !== undefined) {
      this.cashflowByBuildingId[buildingId] += delta;
    }
  }

  toJson (): any {
    return {
      cashByTownId: this.cashByTownId,
      cashflowByTownId: this.cashflowByTownId,
      cashByCorporationId: this.cashByCorporationId,
      cashflowByCorporationId: this.cashflowByCorporationId,
      cashflowByCompanyId: this.cashflowByCompanyId,
      cashflowByBuildingId: this.cashflowByBuildingId
    }
  }

  static fromJson (json: any): SimulationFinancesFrame {
    return new SimulationFinancesFrame({
      cashByTownId: json.cashByTownId,
      cashflowByTownId: json.cashflowByTownId,
      cashByCorporationId: json.cashByCorporationId,
      cashflowByCorporationId: json.cashflowByCorporationId,
      cashflowByCompanyId: json.cashflowByCompanyId,
      cashflowByBuildingId: json.cashflowByBuildingId
    });
  }

  static create (townById: Record<string, Town>, corporationById: Record<string, Corporation>, companyById: Record<string, Company>, buildingById: Record<string, Building>): SimulationFinancesFrame {
    const cashByTownId: Record<string, number> = {};
    const cashflowByTownId: Record<string, number> = {};
    const cashByCorporationId: Record<string, number> = {};
    const cashflowByCorporationId: Record<string, number> = {};
    const cashflowByCompanyId: Record<string, number> = {};
    const cashflowByBuildingId: Record<string, number> = {};

    for (const town of Object.values(townById)) {
      cashByTownId[town.id] = town.cash;
      cashflowByTownId[town.id] = 0;
    }
    for (const corporation of Object.values(corporationById)) {
      cashByCorporationId[corporation.id] = corporation.cash;
      cashflowByCorporationId[corporation.id] = 0;
    }
    for (const companyId of Object.keys(companyById)) {
      cashflowByCompanyId[companyId] = 0;
    }
    for (const buildingId of Object.keys(buildingById)) {
      cashflowByBuildingId[buildingId] = 0;
    }

    return new SimulationFinancesFrame({
      cashByTownId,
      cashflowByTownId,
      cashByCorporationId,
      cashflowByCorporationId,
      cashflowByCompanyId,
      cashflowByBuildingId
    });
  }
}
