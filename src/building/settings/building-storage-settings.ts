
export default class BuildingStorageSettings {
  resourceId: string;

  enabled: boolean;

  constructor (resourceId: string, enabled: boolean) {
    this.resourceId = resourceId;
    this.enabled = enabled;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      enabled: this.enabled
    };
  }

  static fromJson (json: any): BuildingStorageSettings {
    return new BuildingStorageSettings(
      json.resourceId,
      json.enabled ?? false
    );
  }
}
