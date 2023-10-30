
// Resource Source
export default class BuildingProduct {
  id: string;
  buildingId: string;
  resourceId: string;

  disabled: boolean;
  price: number;

  // TODO: FIXME: move quality?
  quality: number;
  maxVelocity: number;
  weightEfficiency: number;
  weightQuality: number;

  constructor (id: string, buildingId: string, resourceId: string, disabled: boolean, price: number, quality: number, maxVelocity: number, weightEfficiency: number, weightQuality: number) {
    this.id = id;
    this.buildingId = buildingId;
    this.resourceId = resourceId;
    this.disabled = disabled;
    this.price = price;
    this.quality = quality;
    this.maxVelocity = maxVelocity;
    this.weightEfficiency = weightEfficiency;
    this.weightQuality = weightQuality;
  }

  toJson (): any {
    return {
      id: this.id,
      buildingId: this.buildingId,
      resourceId: this.resourceId,
      disabled: this.disabled,
      price: this.price,
      quality: this.quality,
      maxVelocity: this.maxVelocity,
      weightEfficiency: this.weightEfficiency,
      weightQuality: this.weightQuality,
    };
  }

  static fromJson (json: any): BuildingProduct {
    return new BuildingProduct(
      json.id,
      json.buildingId,
      json.resourceId,
      json.disabled ?? false,
      json.price ?? 0,
      json.quality ?? 0,
      json.maxVelocity ?? 0,
      json.weightEfficiency ?? 0,
      json.weightQuality ?? 0,
    );
  }
}
