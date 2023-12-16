
export default class BuildingInputSettings {
  resourceId: string;

  maxPrice: number;
  minQuality: number;

  constructor (resourceId: string, maxPrice: number, minQuality: number) {
    this.resourceId = resourceId;
    this.maxPrice = maxPrice;
    this.minQuality = minQuality;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      maxPrice: this.maxPrice,
      minQuality: this.minQuality
    };
  }

  static fromJson (json: any): BuildingInputSettings {
    return new BuildingInputSettings(
      json.resourceId,
      json.maxPrice ?? 0,
      json.minQuality ?? 0
    );
  }
}
