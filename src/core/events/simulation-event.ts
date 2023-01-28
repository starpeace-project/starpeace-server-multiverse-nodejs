import Planet from '../../planet/planet';


export default class SimulationEvent {
  planetId: string;
  planet: Planet;

  constructor (planetId: string, planet: Planet) {
    this.planetId = planetId;
    this.planet = planet;
  }

  static fromJson (json: any): SimulationEvent {
    return new SimulationEvent(
      json.planetId,
      Planet.fromJson(json.planet)
    );
  }

}
