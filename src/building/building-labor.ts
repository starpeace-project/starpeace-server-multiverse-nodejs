
// Resource Sink
export default class BuildingLabor {
  id: string;
  buildingId: string;
  resourceId: string;

  price: number;

  maxVelocity: number;
  weightEfficiency: number;
  weightQuality: number;

  constructor (id: string, buildingId: string, resourceId: string, price: number, maxVelocity: number, weightEfficiency: number, weightQuality: number) {
    this.id = id;
    this.buildingId = buildingId;
    this.resourceId = resourceId;
    this.price = price;
    this.maxVelocity = maxVelocity;
    this.weightEfficiency = weightEfficiency;
    this.weightQuality = weightQuality;
  }

  toJson (): any {
    return {
      id: this.id,
      buildingId: this.buildingId,
      resourceId: this.resourceId,
      price: this.price,
      maxVelocity: this.maxVelocity,
      weightEfficiency: this.weightEfficiency,
      weightQuality: this.weightQuality,
    };
  }

  static fromJson (json: any): BuildingLabor {
    return new BuildingLabor(
      json.id,
      json.buildingId,
      json.resourceId,
      json.price ?? 0,
      json.maxVelocity ?? 0,
      json.weightEfficiency ?? 0,
      json.weightQuality ?? 0,
    );
  }
}
