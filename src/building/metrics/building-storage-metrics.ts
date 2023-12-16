
export default class BuildingStorageMetrics {
  resourceId: string;

  mostRecentCapacity: number;
  mostRecentTotalQuality: number;

  constructor (resourceId: string,  mostRecentCapacity: number, mostRecentTotalQuality: number) {
    this.resourceId = resourceId;
    this.mostRecentCapacity = mostRecentCapacity;
    this.mostRecentTotalQuality = mostRecentTotalQuality;
  }

  clear (): boolean {
    const didClear = this.mostRecentCapacity !== 0 || this.mostRecentTotalQuality !== 0;
    this.mostRecentCapacity = 0;
    this.mostRecentTotalQuality = 0;
    return didClear;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      mostRecentCapacity: this.mostRecentCapacity,
      mostRecentTotalQuality: this.mostRecentTotalQuality,
    };
  }

  static fromJson (json: any): BuildingStorageMetrics {
    return new BuildingStorageMetrics(
      json.resourceId,
      json.mostRecentCapacity ?? 0,
      json.mostRecentTotalQuality ?? 0
    );
  }
}
