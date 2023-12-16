import Building from '../../building/building.js';
import BuildingConstruction from '../../building/construction/building-construction.js';
import BuildingMetrics from '../../building/metrics/building-metrics.js';

export default class SimulationBuildingFrame {
  updatedConstructions: Array<BuildingConstruction>;

  addedBuildingIds: Set<string>;
  deletedBuildingIds: Set<string>;
  updatedBuildings: Array<Building>;

  updatedMetrics: Array<BuildingMetrics>;

  constructor (updatedConstructions: Array<BuildingConstruction>, addedBuildingIds: Set<string>, deletedBuildingIds: Set<string>, updatedBuildings: Array<Building>, metrics: Array<BuildingMetrics>) {
    this.updatedConstructions = updatedConstructions;
    this.addedBuildingIds = addedBuildingIds;
    this.deletedBuildingIds = deletedBuildingIds;
    this.updatedBuildings = updatedBuildings;
    this.updatedMetrics = metrics;
  }

  toJson (): any {
    return {
      updatedConstructions: this.updatedConstructions.map(c => c.toJson()),
      addedBuildingIds: Array.from(this.addedBuildingIds),
      deletedBuildingIds: Array.from(this.deletedBuildingIds),
      updatedBuildings: this.updatedBuildings.map(c => c.toJson()),
      updatedMetrics: this.updatedMetrics.map(m => m.toJson())
    }
  }

  static fromJson (json: any): SimulationBuildingFrame {
    return new SimulationBuildingFrame(
      (json.updatedConstructions ?? []).map(BuildingConstruction.fromJson),
      new Set(json.addedBuildingIds ?? []),
      new Set(json.deletedBuildingIds ?? []),
      (json.updatedBuildings ?? []).map(Building.fromJson),
      (json.updatedMetrics ?? []).map(BuildingMetrics.fromJson)
    );
  }
}
