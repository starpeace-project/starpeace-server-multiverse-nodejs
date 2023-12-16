
export class SimulationFinancesFrameParameters {
  cashByCorporationId?: Record<string, number> | undefined;
  cashflowByCorporationId?: Record<string, number> | undefined;
  cashflowByCompanyId?: Record<string, number> | undefined;
  cashflowByBuildingId?: Record<string, number> | undefined;
}

export default class SimulationFinancesFrame {
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
    this.cashByCorporationId = parameters.cashByCorporationId ?? {};
    this.cashflowByCorporationId = parameters.cashflowByCorporationId ?? {};
    this.cashflowByCompanyId = parameters.cashflowByCompanyId ?? {};
    this.cashflowByBuildingId = parameters.cashflowByBuildingId ?? {};
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

  adjustBuildingCashflow (corporationId: string, companyId: string, buildingId: string, delta: number): void {
    if (this.cashflowByCorporationId[corporationId] !== undefined) {
      this.cashflowByCorporationId[corporationId] += delta;
    }
    if (this.cashflowByCompanyId[companyId] !== undefined) {
      this.cashflowByCompanyId[companyId] += delta;
    }
    if (this.cashflowByBuildingId[buildingId] !== undefined) {
      this.cashflowByBuildingId[buildingId] += delta;
    }
  }

  toJson (): any {
    return {
      cashByCorporationId: this.cashByCorporationId,
      cashflowByCorporationId: this.cashflowByCorporationId,
      cashflowByCompanyId: this.cashflowByCompanyId,
      cashflowByBuildingId: this.cashflowByBuildingId
    }
  }

  static fromJson (json: any): SimulationFinancesFrame {
    return new SimulationFinancesFrame({
      cashByCorporationId: json.cashByCorporationId,
      cashflowByCorporationId: json.cashflowByCorporationId,
      cashflowByCompanyId: json.cashflowByCompanyId,
      cashflowByBuildingId: json.cashflowByBuildingId
    });
  }
}
