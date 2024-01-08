import tasktimer from 'tasktimer';
import winston from 'winston';

import SimulationEventPublisher from '../core/events/simulation-event-publisher.js';
import SimulationBuildings from './buildings/simulation-buildings.js';
import type SimulationBuildingFrame from './buildings/simulation-buildings-frame.js';
import SimulationContext from './simulation-context.js';
import SimulationFinancesFrame from './finances/simulation-finances-frame.js';
import SimulationFrame from './simulation-frame.js';
import SimulationResearch from './research/simulation-research.js';
import type SimulationResearchFrame from './research/simulation-research-frame.js';

import Building from '../building/building.js';
import BuildingCache from '../building/building-cache.js';
import BuildingConstruction from '../building/construction/building-construction.js';
import BuildingConstructionCache from '../building/construction/building-construction-cache.js';
import Company from '../company/company.js';
import CompanyCache from '../company/company-cache.js';
import Corporation from '../corporation/corporation.js';
import CorporationCache from '../corporation/corporation-cache.js';
import InventionSummaryCache from '../company/invention-summary-cache.js';
import Planet from '../planet/planet.js';
import PlanetCache from '../planet/planet-cache.js';
import RankingsCache from '../corporation/rankings-cache.js';
import TownCache from '../planet/town-cache.js';
import Town from '../planet/town.js';
import TycoonCache from '../tycoon/tycoon-cache.js';

import { BuildingConfigurations, CoreConfigurations, InventionConfigurations } from '../core/galaxy-manager.js';
import Logger from '../utils/logger.js';
import SimulationMetrics from './metrics/simulation-metrics.js';
import GovernmentMetrics from '../planet/government/government-metrics.js';
import BuildingSettingsCache from '../building/settings/building-settings-cache.js';
import BuildingSettings from '../building/settings/building-settings.js';
import BuildingMetricsCache from '../building/metrics/building-metrics-cache.js';
import BuildingMetrics from '../building/metrics/building-metrics.js';


const FRAME_DURATION_MS = 500;

export interface SimulationCaches {
  tycoon: TycoonCache;
  building: BuildingCache;
  buildingConstruction: BuildingConstructionCache;
  buildingMetrics: BuildingMetricsCache;
  buildingSettings: BuildingSettingsCache;
  company: CompanyCache;
  corporation: CorporationCache;
  inventionSummary: InventionSummaryCache;
  planet: PlanetCache;
  rankings: RankingsCache;
  town: TownCache;
}

export default class Simulation {
  logger: winston.Logger;
  simulationLogger: winston.Logger;
  timer: tasktimer.TaskTimer;
  eventPublisher: SimulationEventPublisher;

  planetId: string;
  caches: SimulationCaches;
  context: SimulationContext;

  research: SimulationResearch;
  buildings: SimulationBuildings;
  metrics: SimulationMetrics;

  running: boolean = false;

  constructor (logger: winston.Logger, eventPublisher: SimulationEventPublisher, planetId: string, coreConfigurations: CoreConfigurations, buildingConfigurations: BuildingConfigurations, inventionConfigurations: InventionConfigurations, caches: SimulationCaches, context: SimulationContext) {
    this.logger = logger;
    this.eventPublisher = eventPublisher;
    this.planetId = planetId;
    this.caches = caches;
    this.context = context;

    this.research = new SimulationResearch(inventionConfigurations, this.caches, this.context);
    this.buildings = new SimulationBuildings(coreConfigurations, buildingConfigurations, this.caches, this.context);
    this.metrics = new SimulationMetrics(coreConfigurations, buildingConfigurations);

    this.timer = new tasktimer.TaskTimer(FRAME_DURATION_MS);
    this.timer.on(tasktimer.TaskTimer.Event.TICK, () => this.mainLoop());
    this.timer.on(tasktimer.TaskTimer.Event.STOPPED, () => this.logger.info('Engine stopped'));

    this.simulationLogger = Logger.createSimulationLogger();
  }

  start (): void {
    this.logger.info(`Starting simulation engine for planet ${this.planetId}`);
    this.running = true;
    this.setupContext();
    this.startEngine();
  }

  stop (): void {
    this.logger.info('Stopping engine...');
    this.running = false;
    this.timer.stop();
  }

  setupContext (): void {
    const companies: Company[] = this.caches.company.all();
    for (const company of companies) {
      const summary = this.caches.inventionSummary.forCompanyId(company.id);
      if (summary.activeId?.length || summary.pendingIds.length || summary.canceledIds.size) {
        this.context.companyIdsWithResearch.add(company.id);
      }
    }
  }

  startEngine (): void {
    if (!this.running) {
      this.logger.info('Engine stopped');
      return;
    }

    this.timer.start();
  }

  mainLoop (): void {
    if (!this.running) {
      this.logger.info('Engine stopped');
      return;
    }

    const frame: SimulationFrame = this.simulate();
    this.eventPublisher.sendEvent(frame);
  }

  simulate (): SimulationFrame {
    const planet: Planet = this.caches.planet.planet;
    planet.time = planet.time.plus({ hour: 1 });

    const corporationById: Record<string, Corporation> = this.caches.corporation.byId;
    const corporationIds: Array<string> = Object.keys(corporationById);
    const companyById: Record<string, Company> = this.caches.company.byId;
    const buildingById: Record<string, Building> = this.caches.building.byId;
    const buildingConstructionById: Record<string, BuildingConstruction> = this.caches.buildingConstruction.byId;
    const buildingMetricsById: Record<string, BuildingMetrics> = this.caches.buildingMetrics.metricsByBuildingId;
    const buildingSettingsById: Record<string, BuildingSettings> = this.caches.buildingSettings.settingsByBuildingId;
    const townById: Record<string, Town> = this.caches.town.byId;

    const infos = [];
    infos.push(`${corporationIds.length} corporations`);
    infos.push(`${Object.keys(companyById).length} companies`);
    infos.push(`${Object.keys(townById).length} towns`);
    infos.push(`${Object.keys(buildingById).length} buildings`);
    infos.push(`${Object.keys(buildingConstructionById).length} constructions`);
    infos.push(`${Object.keys(buildingMetricsById).length} metrics`);
    infos.push(`${Object.keys(buildingSettingsById).length} settings`);
    this.simulationLogger.info("[%s] %s", planet.planetTime, infos.join(', '));

    const financesFrame: SimulationFinancesFrame = SimulationFinancesFrame.create(townById, corporationById, companyById, buildingById)
    const researchFrame: SimulationResearchFrame = this.research.simulateResarch(companyById, financesFrame);

    const buildingsFrame: SimulationBuildingFrame = this.buildings.simulationBuilding({
      planetTime: planet.time,
      townById: townById,
      corporationById: corporationById,
      buildingById,
      constructionById: buildingConstructionById,
      metricsById: buildingMetricsById,
      settingsById: buildingSettingsById,
      finances: financesFrame
    });

    const townMetrics: Array<GovernmentMetrics> = this.metrics.gatherGovernmentMetrics(townById, buildingById, buildingMetricsById);

    // update caches
    for (const townId of Object.keys(townById)) {
      townById[townId].cash = financesFrame.townCash(townId);
    }
    for (const corporationId of corporationIds) {
      corporationById[corporationId].cash = financesFrame.corporationCash(corporationId);
    }
    for (const buildingId of buildingsFrame.deletedBuildingIds) {
      // TODO: remove other building types (settings, metrics, construction, history)
      this.caches.buildingConstruction.remove(buildingId);
      this.caches.building.remove(buildingId);
    }

    return new SimulationFrame(this.planetId, planet, financesFrame, researchFrame, buildingsFrame, townMetrics);
  }

}
