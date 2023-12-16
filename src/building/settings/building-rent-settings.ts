
export default class BuildingRentSettings {
  resourceId: string;

  rentFactor: number;
  maintenanceFactor: number;

  constructor (resourceId: string, rentFactor: number, maintenanceFactor: number) {
    this.resourceId = resourceId;
    this.rentFactor = rentFactor;
    this.maintenanceFactor = maintenanceFactor;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      rentFactor: this.rentFactor,
      maintenanceFactor: this.maintenanceFactor
    };
  }

  static fromJson (json: any): BuildingRentSettings {
    return new BuildingRentSettings(
      json.resourceId,
      json.rentFactor ?? 0,
      json.maintenanceFactor ?? 0
    );
  }
}
