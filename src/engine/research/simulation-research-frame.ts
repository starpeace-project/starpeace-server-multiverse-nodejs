
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

export default class SimulationResearchFrame {
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
