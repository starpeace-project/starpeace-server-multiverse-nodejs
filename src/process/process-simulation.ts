import winston from 'winston';
import 'winston-daily-rotate-file';

import GalaxyManager, { BuildingConfigurations, CoreConfigurations, InventionConfigurations } from '../core/galaxy-manager.js';
import Logger from '../utils/logger.js';
import ModelEventClient from '../core/events/model-event-client.js';
import ModelEventSubscriber from '../core/events/model-event-subscriber.js';
import SimulationEventPublisher from '../core/events/simulation-event-publisher.js';
import Simulation from '../engine/simulation.js';

import BuildingCache from '../building/building-cache.js';
import { asBuildingDao } from '../building/building-dao.js';
import CompanyCache from '../company/company-cache.js';
import { asCompanyDao } from '../company/company-dao.js';
import InventionSummaryCache from '../company/invention-summary-cache.js';
import { asInventionSummaryDao } from '../company/invention-summary-dao.js';
import CorporationCache from '../corporation/corporation-cache.js';
import { asCorporationDao } from '../corporation/corporation-dao.js';
import PlanetCache from '../planet/planet-cache.js';
import { asPlanetDao } from '../planet/planet-dao.js';
import RankingsCache from '../corporation/rankings-cache.js';
import { asRankingsDao } from '../corporation/rankings-dao.js';
import TownCache from '../planet/town-cache.js';
import { asTownDao } from '../planet/town-dao.js';
import { asTycoonDao } from '../tycoon/tycoon-dao.js';
import TycoonCache from '../tycoon/tycoon-cache.js';
import SimulationContext from '../engine/simulation-context.js';
import Utils from '../utils/utils.js';
import BuildingConstructionCache from '../building/construction/building-construction-cache.js';
import { asBuildingConstructionDao } from '../building/construction/building-construction-dao.js';
import BuildingSettingsCache from '../building/settings/building-settings-cache.js';
import { asBuildingSettingsDao } from '../building/settings/building-settings-dao.js';
import BuildingMetricsCache from '../building/metrics/building-metrics-cache.js';
import { asBuildingMetricsDao } from '../building/metrics/building-metrics-dao.js';


const planetIndex = parseInt(process.argv[3]);
const planetId = process.argv[2];

const logger: winston.Logger = Logger.createProcessLoggerSimulation();

setInterval(() => Logger.logMemory(logger), 1000 * 900);

const galaxyManager = GalaxyManager.create(logger);
const planetMetadata = galaxyManager.forPlanetRequired(planetId);
const coreConfigurations: CoreConfigurations = galaxyManager.metadataCoreForPlanet(planetId) ?? new CoreConfigurations([], [], [], [], [], [], [], []);
const buildingConfigurations: BuildingConfigurations = galaxyManager.metadataBuildingForPlanet(planetId) ?? new BuildingConfigurations([], [], []);
const inventionConfigurations: InventionConfigurations = galaxyManager.metadataInventionForPlanet(planetId) ?? new InventionConfigurations([]);

const modelEventClient = new ModelEventClient(logger);
const modelEventSubscriber = new ModelEventSubscriber(logger);

const tycoonCache: TycoonCache = new TycoonCache(asTycoonDao(modelEventClient));
const planetCache: PlanetCache = new PlanetCache(asPlanetDao(modelEventClient, planetId));
const companyCache: CompanyCache = new CompanyCache(asCompanyDao(modelEventClient, planetId));
const corporationCache: CorporationCache = new CorporationCache(asCorporationDao(modelEventClient, planetId));
const rankingsCache: RankingsCache = new RankingsCache(asRankingsDao(modelEventClient, planetId));
const townCache: TownCache = new TownCache(asTownDao(modelEventClient, planetId));

const buildingCache: BuildingCache = new BuildingCache(asBuildingDao(modelEventClient, planetId), planetMetadata.planetWidth, buildingConfigurations, townCache);
const buildingConstructionCache: BuildingConstructionCache = new BuildingConstructionCache(asBuildingConstructionDao(modelEventClient, planetId));
const buildingSettingsCache: BuildingSettingsCache = new BuildingSettingsCache(asBuildingSettingsDao(modelEventClient, planetId));
const buildingMetricsCache: BuildingMetricsCache = new BuildingMetricsCache(asBuildingMetricsDao(modelEventClient, planetId));
const inventionSummaryCache: InventionSummaryCache = new InventionSummaryCache(asInventionSummaryDao(modelEventClient, planetId), inventionConfigurations, companyCache);

const eventPublisher = new SimulationEventPublisher(logger, planetIndex);
const simulationContext = new SimulationContext();
const simulation = new Simulation(logger, eventPublisher, planetId, coreConfigurations, buildingConfigurations, inventionConfigurations, {
  tycoon: tycoonCache,
  building: buildingCache,
  buildingConstruction: buildingConstructionCache,
  buildingMetrics: buildingMetricsCache,
  buildingSettings: buildingSettingsCache,
  company: companyCache,
  corporation: corporationCache,
  inventionSummary: inventionSummaryCache,
  planet: planetCache,
  rankings: rankingsCache,
  town: townCache
}, simulationContext);

const handleModelEvent = (callback: Function) => {
  return (event: any) => {
    if (event.planetId === planetId) {
      callback(event);
    }
  };
};

modelEventSubscriber.events.on('updateCompany', handleModelEvent((event: any) => companyCache.update(event.company)));
modelEventSubscriber.events.on('updateCorporation', handleModelEvent((event: any) => corporationCache.update(event.corporation)));
modelEventSubscriber.events.on('updateTycoon', handleModelEvent((event: any) => tycoonCache.update(event.tycoon)));

modelEventSubscriber.events.on('updateBuilding', handleModelEvent((event: any) => buildingCache.update(event.building)));
modelEventSubscriber.events.on('updateBuildingConstruction', handleModelEvent((event: any) => buildingConstructionCache.update(event.construction)));
modelEventSubscriber.events.on('updateBuildingMetrics', handleModelEvent((event: any) => buildingMetricsCache.update(event.metrics)));
modelEventSubscriber.events.on('updateBuildingSettings', handleModelEvent((event: any) => buildingSettingsCache.update(event.settings)));

modelEventSubscriber.events.on('startResearch', handleModelEvent((event: any) => {
  inventionSummaryCache.forCompanyId(event.summary.companyId).queuePending(event.summary.pendingIds);
  simulationContext.companyIdsWithResearch.add(event.summary.companyId);
}));
modelEventSubscriber.events.on('cancelResearch', handleModelEvent((event: any) => {
  inventionSummaryCache.forCompanyId(event.summary.companyId).queueCancel(event.summary.canceledIds);
  simulationContext.companyIdsWithResearch.add(event.summary.companyId);
}));

process.on('SIGINT', async () => {
  try {
    modelEventClient.stop();
    eventPublisher.stop();
    simulation.stop();

    await Promise.all([
      tycoonCache.close(),
      buildingCache.close(),
      buildingConstructionCache.close(),
      buildingMetricsCache.close(),
      buildingSettingsCache.close(),
      companyCache.close(),
      corporationCache.close(),
      inventionSummaryCache.close(),
      planetCache.close(),
      rankingsCache.close(),
      townCache.close()
    ]);
  }
  catch (err) {
    logger.warn(`Unable to shutdown cleanly: ${err}`);
  }
  process.exit();
});

const loadData = async () => {
  modelEventClient.start();

  // first load
  await Promise.all([
    tycoonCache.load(),
    companyCache.load(),
    corporationCache.load(),
    planetCache.load(),
    rankingsCache.load(),
    townCache.load()
  ]);
  // second load (depends on first load)
  await Promise.all([
    buildingCache.load(),
    buildingConstructionCache.load(),
    buildingMetricsCache.load(),
    buildingSettingsCache.load(),
    inventionSummaryCache.load()
  ]);
};

const waitForData = (resolve: Function) => {
  if (!tycoonCache.loaded ||
    !buildingCache.loaded ||
    !buildingConstructionCache.loaded ||
    !buildingMetricsCache.loaded ||
    !buildingSettingsCache.loaded ||
    !companyCache.loaded ||
    !corporationCache.loaded ||
    !inventionSummaryCache.loaded ||
    !planetCache.loaded ||
    !rankingsCache.loaded ||
    !townCache.loaded) {
    setTimeout(() => waitForData(resolve), 1000);
    return;
  }
  resolve();
};


loadData()
  .then(() => new Promise((resolve) => waitForData(resolve)))
  .then(() => eventPublisher.start())
  .then(() => Utils.sleep(2500)) // wait for other processes to start
  .then(() => simulation.start())
  .then(() => modelEventSubscriber.start())
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
