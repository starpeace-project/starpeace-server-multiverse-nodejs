import { LoadableCache } from "../planet/cache-by-planet.js";

export default class CashflowCache implements LoadableCache {

  byCorporationId: Record<string, number> = {};
  byCompanyId: Record<string, number> = {};
  byBuildingId: Record<string, number> = {};

  get loaded (): boolean {
    // nothing to do
    return true;
  }
  async close (): Promise<any> {
    // nothing to do
    return true;
  }
  async load (): Promise<void> {
    // nothing to do
  }
  async flush (): Promise<void> {
    // nothing to do
  }

  forCorporationId (corporationId: string): number {
    return this.byCorporationId[corporationId] ?? 0;
  }
  forCompanyId (companyId: string): number {
    return this.byCompanyId[companyId] ?? 0;
  }
  forBuildingId (buildingId: string): number {
    return this.byBuildingId[buildingId] ?? 0;
  }

  updateCorporation (corporationId: string, cashflow: number): void {
    this.byCorporationId[corporationId] = cashflow;
  }
  updateCompany (companyId: string, cashflow: number): void {
    this.byCompanyId[companyId] = cashflow;
  }
  updateBuilding (buildingId: string, cashflow: number): void {
    this.byBuildingId[buildingId] = cashflow;
  }
}
