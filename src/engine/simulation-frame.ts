import GovernmentMetrics from '../planet/government/government-metrics.js';
import Planet from '../planet/planet.js';
import SimulationBuildingFrame from './buildings/simulation-buildings-frame.js';
import SimulationFinancesFrame from './finances/simulation-finances-frame.js';
import SimulationResearchFrame from './research/simulation-research-frame.js';

export default class SimulationFrame {
  planetId: string;
  planet: Planet;
  finances: SimulationFinancesFrame;
  research: SimulationResearchFrame;
  buildings: SimulationBuildingFrame;

  townMetrics: Array<GovernmentMetrics>;

  constructor (planetId: string, planet: Planet, finances: SimulationFinancesFrame, research: SimulationResearchFrame, buildings: SimulationBuildingFrame, townMetrics: Array<GovernmentMetrics>) {
    this.planetId = planetId;
    this.planet = planet;
    this.finances = finances;
    this.research = research;
    this.buildings = buildings;
    this.townMetrics = townMetrics;
  }

  toJson (): any {
    return {
      planetId: this.planetId,
      planet: this.planet.toJson(),
      finances: this.finances.toJson(),
      research: this.research.toJson(),
      buildings: this.buildings.toJson(),
      townMetrics: this.townMetrics.map(t => t.toJson())
    }
  }

  static fromJson (json: any): SimulationFrame {
    return new SimulationFrame(
      json.planetId,
      Planet.fromJson(json.planet),
      SimulationFinancesFrame.fromJson(json.finances),
      SimulationResearchFrame.fromJson(json.research),
      SimulationBuildingFrame.fromJson(json.buildings),
      (json.townMetrics ?? []).map(GovernmentMetrics.fromJson)
    );
  }
}
