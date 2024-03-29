import BuildingPayload from './types/building-payload.js';
import CorporationPayload from './types/corporation-payload.js';
import PlanetPayload from './types/planet-payload.js';

export default class SimulationPayload {
  planet: PlanetPayload;
  corporation: CorporationPayload | undefined;
  selectedBuilding: BuildingPayload | undefined;
  buildingEvents: Array<any> | undefined;
  issuedVisas: Array<any> | undefined;

  constructor (planet: PlanetPayload, corporation: CorporationPayload | undefined, selectedBuilding: BuildingPayload | undefined, buildingEvents: Array<any> | undefined, issuedVisas: Array<any> | undefined) {
    this.planet = planet;
    this.corporation = corporation;
    this.selectedBuilding = selectedBuilding;
    this.buildingEvents = buildingEvents;
    this.issuedVisas = issuedVisas;
  }

  toJson (): any {
    return {
      p: this.planet.toJson(),
      c: this.corporation?.toJson(),
      s: this.selectedBuilding?.toJson(),
      b: this.buildingEvents?.length ? this.buildingEvents : undefined,
      v: this.issuedVisas?.length ? this.issuedVisas : undefined,
    };
  }

  static fromJson (json: any): SimulationPayload {
    return new SimulationPayload(
      PlanetPayload.fromJson(json.p),
      CorporationPayload.fromJson(json.c),
      json.s ? BuildingPayload.fromJson(json.s) : undefined,
      json.b ?? [],
      json.v ?? []
    );
  }
}
