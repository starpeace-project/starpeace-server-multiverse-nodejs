
export default class BuildingLaborSettings {
  resourceId: string;

  price: number;

  constructor (resourceId: string, price: number) {
    this.resourceId = resourceId;
    this.price = price;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      price: this.price
    };
  }

  static fromJson (json: any): BuildingLaborSettings {
    return new BuildingLaborSettings(
      json.resourceId,
      json.price ?? 0
    );
  }
}
