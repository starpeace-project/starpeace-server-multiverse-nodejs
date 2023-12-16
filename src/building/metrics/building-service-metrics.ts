
export default class BuildingServiceMetrics {
  resourceId: string;

  mostRecentVelocity: number;

  constructor (resourceId: string, mostRecentVelocity: number) {
    this.resourceId = resourceId;
    this.mostRecentVelocity = mostRecentVelocity;
  }

  clear (): boolean {
    const didClear = this.mostRecentVelocity !== 0;
    this.mostRecentVelocity = 0;
    return didClear;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      mostRecentVelocity: this.mostRecentVelocity
    };
  }

  static fromJson (json: any): BuildingServiceMetrics {
    return new BuildingServiceMetrics(
      json.resourceId,
      json.mostRecentVelocity ?? 0
    );
  }
}
