

export default class SimulationContext {

  companyIdsWithResearch: Set<string> = new Set();

  laborHiredByBuildingResourceId: Map<string, Map<string, number>> = new Map();

  completeResearch (companyIds: Set<string>): void {
    for (const companyId of Array.from(companyIds)) {
      this.companyIdsWithResearch.delete(companyId);
    }
  }

  updateLaborResourceHired (buildingId: string, resourceId: string, quantity: number, _price: number): void {
    if (quantity <= 0) {
      if (this.laborHiredByBuildingResourceId.get(buildingId)) {
        this.laborHiredByBuildingResourceId.get(buildingId)?.delete(resourceId);

        if (!this.laborHiredByBuildingResourceId.get(buildingId)?.size) {
          this.laborHiredByBuildingResourceId.delete(buildingId);
        }
      }
    }
    else {
      if (!this.laborHiredByBuildingResourceId.get(buildingId)) {
        this.laborHiredByBuildingResourceId.set(buildingId, new Map());
      }
      this.laborHiredByBuildingResourceId.get(buildingId)?.set(resourceId, quantity);
    }
  }

}
