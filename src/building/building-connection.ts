
export default class BuildingConnection {
  id: string;
  tycoonId: string;
  corporationId: string;
  companyId: string;

  sourceBuildingId: string;
  sourceCapacity: number = 0;

  sinkBuildingId: string;
  sinkCapacity: number = 0;

  resourceId: string;

  velocity: number = 0;
  resourceQuality: number = 0;

  constructor (id: string, tycoonId: string, corporationId: string, companyId: string, sourceBuildingId: string, sourceCapacity: number, sinkBuildingId: string, sinkCapacity: number, resourceId: string, velocity: number, resourceQuality: number) {
    this.id = id;
    this.tycoonId = tycoonId;
    this.corporationId = corporationId;
    this.companyId = companyId;
    this.sourceBuildingId = sourceBuildingId;
    this.sourceCapacity = sourceCapacity;
    this.sinkBuildingId = sinkBuildingId;
    this.sinkCapacity = sinkCapacity;
    this.resourceId = resourceId;
    this.velocity = velocity;
    this.resourceQuality = resourceQuality;
  }

  toJson (): any {
    return {
      id: this.id,
      tycoonId: this.tycoonId,
      corporationId: this.corporationId,
      companyId: this.companyId,
      sourceBuildingId: this.sourceBuildingId,
      sourceCapacity: this.sourceCapacity,
      sinkBuildingId: this.sinkBuildingId,
      sinkCapacity: this.sinkCapacity,
      resourceId: this.resourceId,
      velocity: this.velocity,
      resourceQuality: this.resourceQuality
    };
  }

  static fromJson (json: any): BuildingConnection {
    return new BuildingConnection(
      json.id,
      json.tycoonId,
      json.corporationId,
      json.companyId,
      json.sourceBuildingId,
      json.sourceCapacity ?? 0,
      json.sinkBuildingId ?? 0,
      json.sinkCapacity ?? 0,
      json.resourceId,
      json.velocity ?? 0,
      json.resourceQuality ?? 0
    );
  }
}
