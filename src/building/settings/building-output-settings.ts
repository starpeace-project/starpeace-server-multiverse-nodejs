
export default class BuildingOutputSettings {
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

  static fromJson (json: any): BuildingOutputSettings {
    return new BuildingOutputSettings(
      json.resourceId,
      json.price ?? 0
    );
  }
}
