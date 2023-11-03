import winston from 'winston';

import GalaxyManager, { BuildingConfigurations, InventionConfigurations } from '../core/galaxy-manager.js';
import ModelEventServer from '../core/events/model-event-server.js';
import SimulationEventSubscriber from '../core/events/simulation-event-subscriber.js';
import SimulationFrame from '../engine/simulation-frame.js';
import Logger from '../utils/logger.js';

import TycoonCache from '../tycoon/tycoon-cache.js';
import TycoonStore from '../tycoon/tycoon-store.js';
import TycoonTokenStore from '../tycoon/tycoon-token-store.js';
import TycoonVisaCache from '../tycoon/tycoon-visa-cache.js';

import BuildingCache from '../building/building-cache.js';
import BuildingStore from '../building/building-store.js';
import BookmarkStore from '../corporation/bookmark-store.js';
import CacheByPlanet from '../planet/cache-by-planet.js';
import CompanyCache from '../company/company-cache.js';
import CompanyStore from '../company/company-store.js';
import CorporationCache from '../corporation/corporation-cache.js';
import CorporationStore from '../corporation/corporation-store.js';
import InventionSummaryCache from '../company/invention-summary-cache.js';
import InventionSummaryStore from '../company/invention-summary-store.js';
import MailStore from '../corporation/mail-store.js';
import PlanetCache from '../planet/planet-cache.js';
import PlanetStore from '../planet/planet-store.js';
import RankingsCache from '../corporation/rankings-cache.js';
import RankingsStore from '../corporation/rankings-store.js';
import TownCache from '../planet/town-cache.js';
import TownStore from '../planet/town-store.js';


const logger: winston.Logger = Logger.createProcessLoggerModelServer();


const galaxyManager = GalaxyManager.create(logger);
const planetIds = galaxyManager.planets.map((p) => p.id);

const tycoonStore = new TycoonStore(false);
const tycoonTokenStore = new TycoonTokenStore(false);
const tycoonCache = new TycoonCache(tycoonStore);
const tycoonVisaCache = new TycoonVisaCache({
  all: async () => { return []; }
});

const bookmarkByPlanet = Object.fromEntries(planetIds.map((id) => [id, new BookmarkStore(false, id)]));
const mailByPlanet = Object.fromEntries(planetIds.map((id) => [id, new MailStore(false, id)]));

const companyByPlanet = Object.fromEntries(planetIds.map((id) => [id, new CompanyCache(new CompanyStore(false, id))]));
const corporationByPlanet = Object.fromEntries(planetIds.map((id) => [id, new CorporationCache(new CorporationStore(false, id))]));
const planetByPlanet = Object.fromEntries(planetIds.map((id) => [id, new PlanetCache(new PlanetStore(false, id))]));
const rankingsByPlanet = Object.fromEntries(planetIds.map((id) => [id, new RankingsCache(new RankingsStore(false, id))]));
const townByPlanet = Object.fromEntries(planetIds.map((id) => [id, new TownCache(new TownStore(false, id))]));

const buildingStoreByPlanet = Object.fromEntries(planetIds.map((id) => [id, new BuildingStore(false, id)]));
const buildingByPlanet = Object.fromEntries(planetIds.map((id) => [id, new BuildingCache(buildingStoreByPlanet[id], galaxyManager.forPlanetRequired(id).planetWidth, galaxyManager.metadataBuildingForPlanet(id) ?? new BuildingConfigurations([], [], []), townByPlanet[id])]));
const inventionSummaryByPlanet = Object.fromEntries(planetIds.map((id) => [id, new InventionSummaryCache(new InventionSummaryStore(false, id), galaxyManager.metadataInventionForPlanet(id) ?? new InventionConfigurations([]), companyByPlanet[id])]));

const caches = {
  tycoon: tycoonCache,
  tycoonVisa: tycoonVisaCache,
  building: new CacheByPlanet(buildingByPlanet),
  company: new CacheByPlanet(companyByPlanet),
  corporation: new CacheByPlanet(corporationByPlanet),
  inventionSummary: new CacheByPlanet(inventionSummaryByPlanet),
  planet: new CacheByPlanet(planetByPlanet),
  rankings: new CacheByPlanet(rankingsByPlanet),
  town: new CacheByPlanet(townByPlanet)
};

const simulationSubscriber = new SimulationEventSubscriber(logger);
const modelServer = new ModelEventServer(logger, {
  tycoon: tycoonStore,
  tycoonToken: tycoonTokenStore,
  bookmarkByPlanet: bookmarkByPlanet,
  buildingByPlanet: buildingStoreByPlanet,
  mailByPlanet: mailByPlanet
}, caches);

const loadData = async () => {
  // first load
  await Promise.all([
    tycoonCache.load(),
    ...caches.company.loadAll(),
    ...caches.corporation.loadAll(),
    ...caches.planet.loadAll(),
    ...caches.rankings.loadAll(),
    ...caches.town.loadAll()
  ]);
  // second load (depends on first)
  await Promise.all([
    ...caches.building.loadAll(),
    ...caches.inventionSummary.loadAll()
  ]);

};

const persistCaches = async () => {
  // save caches to disk every 5 minutes
  try {
    await Promise.all([
      tycoonCache.flush(),
      ...Object.values(buildingByPlanet).map((c) => c.flush()),
      ...Object.values(companyByPlanet).map((c) => c.flush()),
      ...Object.values(corporationByPlanet).map((c) => c.flush()),
      ...Object.values(inventionSummaryByPlanet).map((c) => c.flush()),
      ...Object.values(planetByPlanet).map((c) => c.flush()),
      ...Object.values(rankingsByPlanet).map((c) => c.flush()),
      ...Object.values(townByPlanet).map((c) => c.flush())
    ]);
  }
  catch (err) {
    logger.error(err);
  }
};

const closeResources = async () => {
  simulationSubscriber.stop();
  modelServer.stop();

  await Promise.all([
    tycoonTokenStore.close(),
    tycoonCache.close(), // closes tycoonStore
    ...caches.building.closeAll(),
    ...Object.values(bookmarkByPlanet).map((c) => c.close()),
    ...caches.company.closeAll(),
    ...caches.corporation.closeAll(),
    ...caches.inventionSummary.closeAll(),
    ...Object.values(mailByPlanet).map((c) => c.close()),
    ...caches.planet.closeAll(),
    ...caches.rankings.closeAll(),
    ...caches.town.closeAll()
  ]);
};

process.on('SIGINT', async () => {
  try {
    await persistCaches();
    await closeResources();
  }
  catch (err) {
    logger.warn(`Unable to shutdown cleanly: ${err}`);
  }
  process.exit();
});


const handleEvent = async (event: SimulationFrame) => {
  planetByPlanet[event.planetId]?.update(event.planet);

  for (const [corporationId, finances] of Object.entries(event.finances.financesByCorporationId)) {
    corporationByPlanet[event.planetId]?.updateFinances(corporationId, finances);
  }
  for (const [companyId, cashflow] of Object.entries(event.finances.cashflowByCompanyId)) {
    companyByPlanet[event.planetId]?.updateCashflow(companyId, cashflow);
  }

  for (const [companyId, inventionIds] of Object.entries(event.research.deletedInventionIdsByCompanyId)) {
    inventionSummaryByPlanet[event.planetId]?.updateDeleted(companyId, inventionIds);
  }
  for (const [companyId, inventionId] of Object.entries(event.research.completedInventionIdByCompanyId)) {
    inventionSummaryByPlanet[event.planetId]?.updateCompleted(companyId, inventionId);
  }
  for (const [companyId, research] of Object.entries(event.research.activeResearchByCompanyId)) {
    inventionSummaryByPlanet[event.planetId]?.updateActive(companyId, research.inventionId, research.investment);
  }
};

loadData()
  .then(() => setInterval(persistCaches, 1000 * 60 * 5))
  .then(() => modelServer.start())
  .then(() => simulationSubscriber.start(handleEvent))
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
