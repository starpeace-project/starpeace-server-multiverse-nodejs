
export class ConstructionResource {
  resourceId: string;

  totalQuantity: number;
  maxVelocity: number;

  maxPrice: number;
  minQuality: number;

  completedQuantity: number;
  completedQualityTotal: number;

  // TODO: should these be separated to metrics?
  mostRecentVelocity: number;
  mostRecentPrice: number;
  mostRecentTotalQuality: number;

  constructor (resourceId: string, totalQuantity: number, maxVelocity: number, maxPrice: number, minQuality: number, completedQuantity: number, completedQualityTotal: number, mostRecentVelocity: number, mostRecentPrice: number, mostRecentTotalQuality: number) {
    this.resourceId = resourceId;
    this.totalQuantity = totalQuantity;
    this.maxVelocity = maxVelocity;
    this.maxPrice = maxPrice;
    this.minQuality = minQuality;
    this.completedQuantity = completedQuantity;
    this.completedQualityTotal = completedQualityTotal;
    this.mostRecentVelocity = mostRecentVelocity;
    this.mostRecentPrice = mostRecentPrice;
    this.mostRecentTotalQuality = mostRecentTotalQuality;
  }

  get completed (): boolean {
    return this.completedQuantity >= this.totalQuantity;
  }

  get progress (): number {
    return this.totalQuantity <= 0 ? 0 : (this.completedQuantity / this.totalQuantity);
  }

  get quality (): number {
    return this.completedQuantity <= 0 ? 0 : (this.completedQualityTotal / this.completedQuantity);
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      totalQuantity: this.totalQuantity,
      maxVelocity: this.maxVelocity,
      maxPrice: this.maxPrice,
      minQuality: this.minQuality,
      completedQuantity: this.completedQuantity,
      completedQualityTotal: this.completedQualityTotal,
      mostRecentVelocity: this.mostRecentVelocity,
      mostRecentPrice: this.mostRecentPrice,
      mostRecentTotalQuality: this.mostRecentTotalQuality
    };
  }

  static fromJson (json: any): ConstructionResource {
    return new ConstructionResource(
      json.resourceId,
      json.totalQuantity ?? 0,
      json.maxVelocity ?? 0,
      json.maxPrice ?? 0,
      json.minQuality ?? 0,
      json.completedQuantity ?? 0,
      json.completedQualityTotal ?? 0,
      json.mostRecentVelocity ?? 0,
      json.mostRecentPrice ?? 0,
      json.mostRecentTotalQuality ?? 0
    );
  }
}

export default class BuildingConstruction {
  buildingId: string;
  resources: Array<ConstructionResource>;

  constructor (buildingId: string, resources: Array<ConstructionResource>) {
    this.buildingId = buildingId;
    this.resources = resources;
  }

  get completed (): boolean {
    return !this.resources.length || this.resources.every(r => r.completed);
  }

  get progress (): number {
    const total = this.resources.map(r => r.progress).reduce((lhs, rhs) => lhs + rhs, 0);
    return this.resources.length ? (total / this.resources.length) : 0;
  }

  toJson (): any {
    return {
      buildingId: this.buildingId,
      resources: this.resources.map(r => r.toJson())
    };
  }

  static fromJson (json: any): BuildingConstruction {
    return new BuildingConstruction(
      json.buildingId,
      (json.resources ?? []).map(ConstructionResource.fromJson)
    );
  }
}
