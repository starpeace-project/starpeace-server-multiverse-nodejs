
export default class BuildingLaborMetrics {
  resourceId: string;

  mostRecentVelocity: number;
  mostRecentTotalQuality: number;

  constructor (resourceId: string, mostRecentVelocity: number, mostRecentTotalQuality: number) {
    this.resourceId = resourceId;
    this.mostRecentVelocity = mostRecentVelocity;
    this.mostRecentTotalQuality = mostRecentTotalQuality;
  }

  update (velocity: number, totalQuality: number): boolean {
    const didUpdate = this.mostRecentVelocity !== velocity || this.mostRecentTotalQuality !== totalQuality;
    this.mostRecentVelocity = velocity;
    this.mostRecentTotalQuality = totalQuality;
    return didUpdate;
  }

  clear (): boolean {
    const didClear = this.mostRecentVelocity !== 0 || this.mostRecentTotalQuality !== 0;
    this.mostRecentVelocity = 0;
    this.mostRecentTotalQuality = 0;
    return didClear;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      mostRecentVelocity: this.mostRecentVelocity,
      mostRecentTotalQuality: this.mostRecentTotalQuality,
    };
  }

  static fromJson (json: any): BuildingLaborMetrics {
    return new BuildingLaborMetrics(
      json.resourceId,
      json.mostRecentVelocity ?? 0,
      json.mostRecentTotalQuality ?? 0
    );
  }
}
