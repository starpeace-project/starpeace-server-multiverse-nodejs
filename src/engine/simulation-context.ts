

export default class SimulationContext {

  companyIdsWithResearch: Set<string> = new Set();


  completeResearch (companyIds: Set<string>): void {
    for (const companyId of Array.from(companyIds)) {
      this.companyIdsWithResearch.delete(companyId);
    }
  }

}
