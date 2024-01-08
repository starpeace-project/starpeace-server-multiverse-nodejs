import winston from 'winston';

import GalaxyManager, { BuildingConfigurations, CoreConfigurations, InventionConfigurations } from '../core/galaxy-manager.js';
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
import BuildingConnectionCache from '../building/connections/building-connection-cache.js';
import BuildingConnectionStore from '../building/connections/building-connection-store.js';
import BuildingConstructionCache from '../building/construction/building-construction-cache.js';
import BuildingConstructionStore from '../building/construction/building-construction-store.js';
import BuildingMetricsCache from '../building/metrics/building-metrics-cache.js';
import BuildingMetricsStore from '../building/metrics/building-metrics-store.js';
import BuildingSettingsCache from '../building/settings/building-settings-cache.js';
import BuildingSettingsStore from '../building/settings/building-settings-store.js';
import BookmarkStore from '../corporation/bookmark-store.js';
import CacheByPlanet from '../planet/cache-by-planet.js';
import CompanyCache from '../company/company-cache.js';
import CompanyStore from '../company/company-store.js';
import CorporationCache from '../corporation/corporation-cache.js';
import CorporationStore from '../corporation/corporation-store.js';
import GovernmentCache from '../planet/government/government-cache.js';
import GovernmentStore from '../planet/government/government-store.js';
import InventionSummaryCache from '../company/invention-summary-cache.js';
import InventionSummaryStore from '../company/invention-summary-store.js';
import MailStore from '../corporation/mail-store.js';
import PlanetCache from '../planet/planet-cache.js';
import PlanetStore from '../planet/planet-store.js';
import RankingsCache from '../corporation/rankings-cache.js';
import RankingsStore from '../corporation/rankings-store.js';
import TownCache from '../planet/town-cache.js';
import TownStore from '../planet/town-store.js';
import TycoonSettingsCache from '../tycoon/settings/tycoon-settings-cache.js';
import TycoonSettingsStore from '../tycoon/settings/tycoon-settings-store.js';
import CashflowCache from '../finances/cashflow-cache.js';


const logger: winston.Logger = Logger.createProcessLoggerModelServer();

setInterval(() => Logger.logMemory(logger), 1000 * 900);

const galaxyManager = GalaxyManager.create(logger);
const planetIds = galaxyManager.planets.map((p) => p.id);

const tycoonStore = new TycoonStore(false);
const tycoonTokenStore = new TycoonTokenStore(false);
const tycoonCache = new TycoonCache(tycoonStore);
const tycoonVisaCache = new TycoonVisaCache({
  all: async () => { return []; }
});

const bookmarkByPlanet: Record<string, BookmarkStore> = {};
const mailByPlanet: Record<string, MailStore> = {};
const governmentByPlanet: Record<string, GovernmentCache> = {};

const cashflowByPlanet: Record<string, CashflowCache> = {};
const companyByPlanet: Record<string, CompanyCache> = {};
const corporationByPlanet: Record<string, CorporationCache> = {};
const planetByPlanet: Record<string, PlanetCache> = {};
const rankingsByPlanet: Record<string, RankingsCache> = {};
const townByPlanet: Record<string, TownCache> = {};

const buildingStoreByPlanet: Record<string, BuildingStore> = {};
const buildingByPlanet: Record<string, BuildingCache> = {};
const buildingConnectionByPlanet: Record<string, BuildingConnectionCache> = {};
const buildingConstructionByPlanet: Record<string, BuildingConstructionCache> = {};
const buildingMetricsByPlanet: Record<string, BuildingMetricsCache> = {};
const buildingSettingsByPlanet: Record<string, BuildingSettingsCache> = {};

const inventionSummaryByPlanet: Record<string, InventionSummaryCache> = {};

const tycoonSettingsByPlanet: Record<string, TycoonSettingsCache> = {};

const buildingConfigurations: Record<string, BuildingConfigurations> = {};
const coreConfigurations: Record<string, CoreConfigurations> = {};
const inventionConfigurations: Record<string, InventionConfigurations> = {};

for (const id of planetIds) {
  buildingConfigurations[id] = galaxyManager.metadataBuildingForPlanet(id) ?? new BuildingConfigurations([], [], []);
  coreConfigurations[id] = galaxyManager.metadataCoreForPlanet(id) ?? new CoreConfigurations([], [], [], [], [], [], [], []);
  inventionConfigurations[id] = galaxyManager.metadataInventionForPlanet(id) ?? new InventionConfigurations([]);

  bookmarkByPlanet[id] = new BookmarkStore(false, id);
  mailByPlanet[id] = new MailStore(false, id);
  governmentByPlanet[id] = new GovernmentCache(new GovernmentStore(false, id));

  cashflowByPlanet[id] = new CashflowCache();
  companyByPlanet[id] = new CompanyCache(new CompanyStore(false, id));
  corporationByPlanet[id] = new CorporationCache(new CorporationStore(false, id));
  planetByPlanet[id] = new PlanetCache(new PlanetStore(false, id));
  rankingsByPlanet[id] = new RankingsCache(new RankingsStore(false, id));
  townByPlanet[id] = new TownCache(new TownStore(false, id));

  buildingStoreByPlanet[id] = new BuildingStore(false, id);
  buildingByPlanet[id] = new BuildingCache(buildingStoreByPlanet[id], galaxyManager.forPlanetRequired(id).planetWidth, buildingConfigurations[id], townByPlanet[id]);
  buildingConnectionByPlanet[id] = new BuildingConnectionCache(new BuildingConnectionStore(false, id), buildingByPlanet[id]);
  buildingConstructionByPlanet[id] = new BuildingConstructionCache(new BuildingConstructionStore(false, id));
  buildingMetricsByPlanet[id] = new BuildingMetricsCache(new BuildingMetricsStore(false, id));
  buildingSettingsByPlanet[id] = new BuildingSettingsCache(new BuildingSettingsStore(false, id));

  inventionSummaryByPlanet[id] = new InventionSummaryCache(new InventionSummaryStore(false, id), inventionConfigurations[id], companyByPlanet[id]);

  tycoonSettingsByPlanet[id] = new TycoonSettingsCache(new TycoonSettingsStore(false, id));
}


const caches = {
  buildingConfigurations: buildingConfigurations,
  coreConfigurations: coreConfigurations,
  inventionConfigurations: inventionConfigurations,
  tycoon: tycoonCache,
  tycoonVisa: tycoonVisaCache,
  building: new CacheByPlanet(buildingByPlanet),
  buildingConstruction: new CacheByPlanet(buildingConstructionByPlanet),
  buildingConnection: new CacheByPlanet(buildingConnectionByPlanet),
  buildingMetrics: new CacheByPlanet(buildingMetricsByPlanet),
  buildingSettings: new CacheByPlanet(buildingSettingsByPlanet),
  cashflow: new CacheByPlanet(cashflowByPlanet),
  company: new CacheByPlanet(companyByPlanet),
  corporation: new CacheByPlanet(corporationByPlanet),
  government: new CacheByPlanet(governmentByPlanet),
  inventionSummary: new CacheByPlanet(inventionSummaryByPlanet),
  planet: new CacheByPlanet(planetByPlanet),
  rankings: new CacheByPlanet(rankingsByPlanet),
  town: new CacheByPlanet(townByPlanet),
  tycoonSettings: new CacheByPlanet(tycoonSettingsByPlanet)
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
    ...caches.cashflow.loadAll(),
    ...caches.company.loadAll(),
    ...caches.corporation.loadAll(),
    ...caches.planet.loadAll(),
    ...caches.government.loadAll(),
    ...caches.rankings.loadAll(),
    ...caches.town.loadAll(),
    ...caches.tycoonSettings.loadAll()
  ]);
  // second load (depends on first)
  await Promise.all([
    ...caches.building.loadAll(),
    ...caches.buildingMetrics.loadAll(),
    ...caches.buildingSettings.loadAll(),
    ...caches.buildingConstruction.loadAll(),
    ...caches.inventionSummary.loadAll()
  ]);
  // third load (depends on second)
  await Promise.all([
    ...caches.buildingConnection.loadAll()
  ]);
};

const persistCaches = async () => {
  // save caches to disk every 5 minutes
  try {
    await Promise.all([
      tycoonCache.flush(),
      ...Object.values(buildingByPlanet).map((c) => c.flush()),
      ...Object.values(buildingConnectionByPlanet).map((c) => c.flush()),
      ...Object.values(buildingConstructionByPlanet).map((c) => c.flush()),
      ...Object.values(buildingMetricsByPlanet).map((c) => c.flush()),
      ...Object.values(buildingSettingsByPlanet).map((c) => c.flush()),
      ...Object.values(cashflowByPlanet).map((c) => c.flush()),
      ...Object.values(companyByPlanet).map((c) => c.flush()),
      ...Object.values(corporationByPlanet).map((c) => c.flush()),
      ...Object.values(governmentByPlanet).map((c) => c.flush()),
      ...Object.values(inventionSummaryByPlanet).map((c) => c.flush()),
      ...Object.values(planetByPlanet).map((c) => c.flush()),
      ...Object.values(rankingsByPlanet).map((c) => c.flush()),
      ...Object.values(townByPlanet).map((c) => c.flush()),
      ...Object.values(tycoonSettingsByPlanet).map((c) => c.flush())
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
    ...caches.buildingConnection.closeAll(),
    ...caches.buildingConstruction.closeAll(),
    ...caches.buildingMetrics.closeAll(),
    ...caches.buildingSettings.closeAll(),
    ...Object.values(bookmarkByPlanet).map((c) => c.close()),
    ...caches.cashflow.closeAll(),
    ...caches.company.closeAll(),
    ...caches.corporation.closeAll(),
    ...caches.government.closeAll(),
    ...caches.inventionSummary.closeAll(),
    ...Object.values(mailByPlanet).map((c) => c.close()),
    ...caches.planet.closeAll(),
    ...caches.rankings.closeAll(),
    ...caches.town.closeAll(),
    ...caches.tycoonSettings.closeAll()
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

  for (const [townId, cash] of Object.entries(event.finances.cashByTownId)) {
    townByPlanet[event.planetId]?.updateCash(townId, cash);
  }
  for (const [corporationId, cash] of Object.entries(event.finances.cashByCorporationId)) {
    corporationByPlanet[event.planetId]?.updateCash(corporationId, cash);
  }
  for (const [corporationId, cashflow] of Object.entries(event.finances.cashflowByCorporationId)) {
    cashflowByPlanet[event.planetId]?.updateCorporation(corporationId, cashflow);
  }
  for (const [companyId, cashflow] of Object.entries(event.finances.cashflowByCompanyId)) {
    cashflowByPlanet[event.planetId]?.updateCompany(companyId, cashflow);
  }
  for (const [buildingId, cashflow] of Object.entries(event.finances.cashflowByBuildingId)) {
    cashflowByPlanet[event.planetId]?.updateBuilding(buildingId, cashflow);
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

  for (const construction of Array.from(event.buildings.updatedConstructions)) {
    buildingConstructionByPlanet[event.planetId]?.update(construction);
  }

  for (const id of Array.from(event.buildings.deletedBuildingIds)) {
    // TODO: remove other building types
    buildingConstructionByPlanet[event.planetId]?.remove(id);
    buildingByPlanet[event.planetId]?.remove(id);
  }
  for (const building of Array.from(event.buildings.updatedBuildings)) {
    buildingByPlanet[event.planetId]?.update(building);
  }

  for (const metrics of Array.from(event.buildings.updatedMetrics)) {
    buildingMetricsByPlanet[event.planetId]?.update(metrics);
  }

  for (const metrics of (event.townMetrics ?? [])) {
    governmentByPlanet[event.planetId]?.updateMetrics(metrics);
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
