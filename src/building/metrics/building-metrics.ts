import BuildingInputMetrics from "./building-input-metrics.js";
import BuildingLaborMetrics from "./building-labor-metrics.js";
import BuildingOutputMetrics from "./building-output-metrics.js";
import BuildingRentMetrics from "./building-rent-metrics.js";
import BuildingServiceMetrics from "./building-service-metrics.js";
import BuildingStorageMetrics from "./building-storage-metrics.js";

export interface BuildingMetricsParameters {
  buildingId: string;

  inputByResourceId?: Record<string, BuildingInputMetrics>;
  outputByResourceId?: Record<string, BuildingOutputMetrics>;
  laborByResourceId?: Record<string, BuildingLaborMetrics>;
  rentByResourceId?: Record<string, BuildingRentMetrics>;
  serviceByResourceId?: Record<string, BuildingServiceMetrics>;
  storageByResourceId?: Record<string, BuildingStorageMetrics>;
}

export default class BuildingMetrics {
  buildingId: string;

  inputByResourceId: Record<string, BuildingInputMetrics>;
  outputByResourceId: Record<string, BuildingOutputMetrics>;
  laborByResourceId: Record<string, BuildingLaborMetrics>;
  rentByResourceId: Record<string, BuildingRentMetrics>;
  serviceByResourceId: Record<string, BuildingServiceMetrics>;
  storageByResourceId: Record<string, BuildingStorageMetrics>;

  constructor (parameters: BuildingMetricsParameters) {
    this.buildingId = parameters.buildingId;
    this.inputByResourceId = parameters.inputByResourceId ?? {};
    this.outputByResourceId = parameters.outputByResourceId ?? {};
    this.laborByResourceId = parameters.laborByResourceId ?? {};
    this.rentByResourceId = parameters.rentByResourceId ?? {};
    this.serviceByResourceId = parameters.serviceByResourceId ?? {};
    this.storageByResourceId = parameters.storageByResourceId ?? {};
  }

  updateLabor (resourceId: string, velocity: number, quality: number) {
    return this.laborByResourceId[resourceId]?.update(velocity, velocity * quality) ?? false;
  }
  clearLabor (): boolean {
    return Object.values(this.laborByResourceId).map(m => m.clear()).some(c => c);
  }

  updateInput (resourceId: string, velocityMaximum: number, velocity: number, price: number, quality: number) {
    return this.inputByResourceId[resourceId]?.update(velocityMaximum, velocity, price, velocity * quality) ?? false;
  }
  clearInput (): boolean {
    return Object.values(this.inputByResourceId).map(m => m.clear()).some(c => c);
  }


  clear (): boolean {
    const anyInputCleared = this.clearInput();
    const anyOutputCleared = Object.values(this.outputByResourceId).map(m => m.clear()).some(c => c);
    const anyLaborCleared = this.clearLabor();
    const anyRentCleared = Object.values(this.rentByResourceId).map(m => m.clear()).some(c => c);
    const anyServiceCleared = Object.values(this.serviceByResourceId).map(m => m.clear()).some(c => c);
    const anyStorageCleared = Object.values(this.storageByResourceId).map(m => m.clear()).some(c => c);
    return anyInputCleared || anyOutputCleared || anyLaborCleared || anyRentCleared || anyServiceCleared || anyStorageCleared;
  }

  toJson (): any {
    return {
      buildingId: this.buildingId,
      inputs: Object.values(this.inputByResourceId).map(v => v.toJson()),
      outputs: Object.values(this.outputByResourceId).map(v => v.toJson()),
      labors: Object.values(this.laborByResourceId).map(v => v.toJson()),
      services: Object.values(this.serviceByResourceId).map(v => v.toJson()),
      storages: Object.values(this.storageByResourceId).map(v => v.toJson()),
      rents: Object.values(this.rentByResourceId).map(v => v.toJson()),
    };
  }

  static fromJson (json: any): BuildingMetrics {
    return new BuildingMetrics({
      buildingId: json.buildingId,
      inputByResourceId: Object.fromEntries((json.inputs ?? []).map(BuildingInputMetrics.fromJson).map((m: BuildingInputMetrics) => [m.resourceId, m])),
      outputByResourceId: Object.fromEntries((json.outputs ?? []).map(BuildingOutputMetrics.fromJson).map((m: BuildingOutputMetrics) => [m.resourceId, m])),
      laborByResourceId: Object.fromEntries((json.labors ?? []).map(BuildingLaborMetrics.fromJson).map((m: BuildingLaborMetrics) => [m.resourceId, m])),
      rentByResourceId: Object.fromEntries((json.rents ?? []).map(BuildingRentMetrics.fromJson).map((m: BuildingRentMetrics) => [m.resourceId, m])),
      serviceByResourceId: Object.fromEntries((json.services ?? []).map(BuildingServiceMetrics.fromJson).map((m: BuildingServiceMetrics) => [m.resourceId, m])),
      storageByResourceId: Object.fromEntries((json.storages ?? []).map(BuildingStorageMetrics.fromJson).map((m: BuildingStorageMetrics) => [m.resourceId, m])),
    });
  }
}
