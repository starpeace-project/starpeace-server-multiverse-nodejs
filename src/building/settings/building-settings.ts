import BuildingInputSettings from './building-input-settings.js';
import BuildingLaborSettings from './building-labor-settings.js';
import BuildingOutputSettings from './building-output-settings.js';
import BuildingRentSettings from './building-rent-settings.js';
import BuildingServiceSettings from './building-service-settings.js';
import BuildingStorageSettings from './building-storage-settings.js';

export enum ConnectionPosture {
  ANYONE = 'ANYONE',
  ONLY_ALLIES = 'ONLY_ALLIES',
  ONLY_SELF = 'ONLY_SELF'
}

export const VALID_CONNECTON_POSTURES: Set<string> = new Set(Object.values(ConnectionPosture));

export interface BuildingSettingsParameters {
  buildingId: string;

  inputByResourceId?: Record<string, BuildingInputSettings>;
  outputByResourceId?: Record<string, BuildingOutputSettings>;
  laborByResourceId?: Record<string, BuildingLaborSettings>;
  rentByResourceId?: Record<string, BuildingRentSettings>;
  serviceByResourceId?: Record<string, BuildingServiceSettings>;
  storageByResourceId?: Record<string, BuildingStorageSettings>;

  connectionPosture: ConnectionPosture;
  closed: boolean;
  allowIncomingSettings: boolean;
  requestedLevel: number;
}

export default class BuildingSettings {
  buildingId: string;

  inputByResourceId: Record<string, BuildingInputSettings>;
  outputByResourceId: Record<string, BuildingOutputSettings>;
  laborByResourceId: Record<string, BuildingLaborSettings>;
  rentByResourceId: Record<string, BuildingRentSettings>;
  serviceByResourceId: Record<string, BuildingServiceSettings>;
  storageByResourceId: Record<string, BuildingStorageSettings>;

  closed: boolean;
  connectionPosture: ConnectionPosture;
  allowIncomingSettings: boolean;
  requestedLevel: number;

  constructor (parameters: BuildingSettingsParameters) {
    this.buildingId = parameters.buildingId;
    this.inputByResourceId = parameters.inputByResourceId ?? {};
    this.outputByResourceId = parameters.outputByResourceId ?? {};
    this.laborByResourceId = parameters.laborByResourceId ?? {};
    this.rentByResourceId = parameters.rentByResourceId ?? {};
    this.serviceByResourceId = parameters.serviceByResourceId ?? {};
    this.storageByResourceId = parameters.storageByResourceId ?? {};
    this.closed = parameters.closed;
    this.connectionPosture = parameters.connectionPosture;
    this.allowIncomingSettings = parameters.allowIncomingSettings;
    this.requestedLevel = parameters.requestedLevel;
  }

  toJson (): any {
    return {
      buildingId: this.buildingId,
      inputs: Object.values(this.inputByResourceId).map(v => v.toJson()),
      outputs: Object.values(this.outputByResourceId).map(v => v.toJson()),
      labors: Object.values(this.laborByResourceId).map(v => v.toJson()),
      rents: Object.values(this.rentByResourceId).map(v => v.toJson()),
      services: Object.values(this.serviceByResourceId).map(v => v.toJson()),
      storages: Object.values(this.storageByResourceId).map(v => v.toJson()),
      closed: this.closed,
      connectionPosture: this.connectionPosture,
      allowIncomingSettings: this.allowIncomingSettings,
      requestedLevel: this.requestedLevel
    };
  }

  static fromJson (json: any): BuildingSettings {
    return new BuildingSettings({
      buildingId: json.buildingId,
      inputByResourceId: Object.fromEntries((json.inputs ?? []).map(BuildingInputSettings.fromJson).map((s: BuildingInputSettings) => [s.resourceId, s])),
      outputByResourceId: Object.fromEntries((json.outputs ?? []).map(BuildingOutputSettings.fromJson).map((s: BuildingOutputSettings) => [s.resourceId, s])),
      laborByResourceId: Object.fromEntries((json.labors ?? []).map(BuildingLaborSettings.fromJson).map((s: BuildingLaborSettings) => [s.resourceId, s])),
      rentByResourceId: Object.fromEntries((json.rents ?? []).map(BuildingRentSettings.fromJson).map((s: BuildingRentSettings) => [s.resourceId, s])),
      serviceByResourceId: Object.fromEntries((json.services ?? []).map(BuildingServiceSettings.fromJson).map((s: BuildingServiceSettings) => [s.resourceId, s])),
      storageByResourceId: Object.fromEntries((json.storages ?? []).map(BuildingStorageSettings.fromJson).map((s: BuildingStorageSettings) => [s.resourceId, s])),
      closed: json.closed ?? false,
      connectionPosture: json.connectionPosture ?? ConnectionPosture.ANYONE,
      allowIncomingSettings: json.allowIncomingSettings ?? false,
      requestedLevel: json.requestedLevel ?? 0
    });
  }
}
