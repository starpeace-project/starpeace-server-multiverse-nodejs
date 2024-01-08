
export default class BuildingLaborMetrics {
  resourceId: string;

  mostRecentVelocity: number;
  mostRecentTotalQuality: number;
  mostRecentTotalWages: number;

  constructor (resourceId: string, mostRecentVelocity: number, mostRecentTotalQuality: number, mostRecentTotalWages: number) {
    this.resourceId = resourceId;
    this.mostRecentVelocity = mostRecentVelocity;
    this.mostRecentTotalQuality = mostRecentTotalQuality;
    this.mostRecentTotalWages = mostRecentTotalWages;
  }

  update (velocity: number, totalQuality: number, totalWages: number): boolean {
    const didUpdate = this.mostRecentVelocity !== velocity || this.mostRecentTotalQuality !== totalQuality || this.mostRecentTotalWages !== totalWages;
    this.mostRecentVelocity = velocity;
    this.mostRecentTotalQuality = totalQuality;
    this.mostRecentTotalWages = totalWages;
    return didUpdate;
  }

  clear (): boolean {
    const didClear = this.mostRecentVelocity !== 0 || this.mostRecentTotalQuality !== 0 || this.mostRecentTotalWages !== 0;
    this.mostRecentVelocity = 0;
    this.mostRecentTotalQuality = 0;
    this.mostRecentTotalWages = 0;
    return didClear;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      mostRecentVelocity: this.mostRecentVelocity,
      mostRecentTotalQuality: this.mostRecentTotalQuality,
      mostRecentTotalWages: this.mostRecentTotalWages
    };
  }

  static fromJson (json: any): BuildingLaborMetrics {
    return new BuildingLaborMetrics(
      json.resourceId,
      json.mostRecentVelocity ?? 0,
      json.mostRecentTotalQuality ?? 0,
      json.mostRecentTotalWages ?? 0
    );
  }
}
