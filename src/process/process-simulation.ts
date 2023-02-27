import winston from 'winston';
import 'winston-daily-rotate-file';

import GalaxyManager, { BuildingConfigurations, InventionConfigurations } from '../core/galaxy-manager';
import Logger from '../utils/logger';
import ModelEventClient from '../core/events/model-event-client';
import ModelEventSubscriber from '../core/events/model-event-subscriber';
import SimulationEventPublisher from '../core/events/simulation-event-publisher';
import Simulation from '../engine/simulation';

import BuildingCache from '../building/building-cache';
import { asBuildingDao } from '../building/building-dao';
import CompanyCache from '../company/company-cache';
import { asCompanyDao } from '../company/company-dao';
import InventionSummaryCache from '../company/invention-summary-cache';
import { asInventionSummaryDao } from '../company/invention-summary-dao';
import CorporationCache from '../corporation/corporation-cache';
import { asCorporationDao } from '../corporation/corporation-dao';
import PlanetCache from '../planet/planet-cache';
import { asPlanetDao } from '../planet/planet-dao';
import RankingsCache from '../corporation/rankings-cache';
import { asRankingsDao } from '../corporation/rankings-dao';
import TownCache from '../planet/town-cache';
import { asTownDao } from '../planet/town-dao';
import { asTycoonDao } from '../tycoon/tycoon-dao';
import TycoonCache from '../tycoon/tycoon-cache';
import SimulationContext from '../engine/simulation-context';
import Utils from '../utils/utils';


const planetIndex = parseInt(process.argv[3]);
const planetId = process.argv[2];

const logger: winston.Logger = Logger.createProcessLoggerSimulation();


const galaxyManager = GalaxyManager.create(logger);
const planetMetadata = galaxyManager.forPlanetRequired(planetId);
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
const inventionSummaryCache: InventionSummaryCache = new InventionSummaryCache(asInventionSummaryDao(modelEventClient, planetId), inventionConfigurations, companyCache);



const eventPublisher = new SimulationEventPublisher(logger, planetIndex);
const simulationContext = new SimulationContext();
const simulation = new Simulation(logger, eventPublisher, planetId, buildingConfigurations, inventionConfigurations, {
  tycoon: tycoonCache,
  building: buildingCache,
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
modelEventSubscriber.events.on('updateBuilding', handleModelEvent((event: any) => buildingCache.update(event.building)));
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
    inventionSummaryCache.load()
  ]);
};

const waitForData = (resolve: Function) => {
  if (!tycoonCache.loaded ||
    !buildingCache.loaded ||
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
