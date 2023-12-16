
export default class BuildingServiceSettings {
  resourceId: string;

  requestedVelocity: number;

  constructor (resourceId: string, requestedVelocity: number) {
    this.resourceId = resourceId;
    this.requestedVelocity = requestedVelocity;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      requestedVelocity: this.requestedVelocity
    };
  }

  static fromJson (json: any): BuildingServiceSettings {
    return new BuildingServiceSettings(
      json.resourceId,
      json.requestedVelocity ?? 0
    );
  }
}
