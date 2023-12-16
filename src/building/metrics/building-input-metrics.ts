
export default class BuildingInputMetrics {
  resourceId: string;

  mostRecentVelocityMaximum: number;
  mostRecentVelocity: number;
  mostRecentPrice: number;
  mostRecentTotalQuality: number;

  constructor (resourceId: string, mostRecentVelocityMaximum: number, mostRecentVelocity: number, mostRecentPrice: number, mostRecentTotalQuality: number) {
    this.resourceId = resourceId;
    this.mostRecentVelocityMaximum = mostRecentVelocityMaximum;
    this.mostRecentVelocity = mostRecentVelocity;
    this.mostRecentPrice = mostRecentPrice;
    this.mostRecentTotalQuality = mostRecentTotalQuality;
  }

  update (velocityMaximum: number, velocity: number, price: number, totalQuality: number): boolean {
    const didUpdate = this.mostRecentVelocityMaximum !== velocityMaximum || this.mostRecentVelocity !== velocity || this.mostRecentPrice !== price || this.mostRecentTotalQuality !== totalQuality;
    this.mostRecentVelocityMaximum = velocityMaximum;
    this.mostRecentVelocity = velocity;
    this.mostRecentPrice = price;
    this.mostRecentTotalQuality = totalQuality;
    return didUpdate;
  }

  clear (): boolean {
    const didClear = this.mostRecentVelocityMaximum !== 0 || this.mostRecentVelocity !== 0 || this.mostRecentPrice !== 0 || this.mostRecentTotalQuality !== 0;
    this.mostRecentVelocityMaximum = 0;
    this.mostRecentVelocity = 0;
    this.mostRecentPrice = 0;
    this.mostRecentTotalQuality = 0;
    return didClear;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      mostRecentVelocityMaximum: this.mostRecentVelocityMaximum,
      mostRecentVelocity: this.mostRecentVelocity,
      mostRecentPrice: this.mostRecentPrice,
      mostRecentTotalQuality: this.mostRecentTotalQuality,
    };
  }

  static fromJson (json: any): BuildingInputMetrics {
    return new BuildingInputMetrics(
      json.resourceId,
      json.mostRecentVelocityMaximum ?? 0,
      json.mostRecentVelocity ?? 0,
      json.mostRecentPrice ?? 0,
      json.mostRecentTotalQuality ?? 0
    );
  }
}
