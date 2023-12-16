import { DateTime } from 'luxon';

export default class BuildingConnection {
  id: string;
  sourceBuildingId: string;
  sinkBuildingId: string;
  resourceId: string;
  connectedAt: DateTime;

  constructor (id: string, sourceBuildingId: string, sinkBuildingId: string, resourceId: string, connectedAt: DateTime) {
    this.id = id;
    this.sourceBuildingId = sourceBuildingId;
    this.sinkBuildingId = sinkBuildingId;
    this.resourceId = resourceId;
    this.connectedAt = connectedAt;
  }

  toJson (): any {
    return {
      id: this.id,
      sourceBuildingId: this.sourceBuildingId,
      sinkBuildingId: this.sinkBuildingId,
      resourceId: this.resourceId,
      connectedAt: this.connectedAt.toISO()
    };
  }

  static fromJson (json: any): BuildingConnection {
    return new BuildingConnection(
      json.id,
      json.sourceBuildingId,
      json.sinkBuildingId,
      json.resourceId,
      DateTime.fromISO(json.connectedAt)
    );
  }
}
