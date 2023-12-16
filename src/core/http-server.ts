import _ from 'lodash';
import http from 'http';
import { Server as ioServer } from 'socket.io';
import winston from 'winston';

import ModelEventClient from './events/model-event-client.js';
import ModelEventPublisher from './events/model-event-publisher.js';
import ModelEventSubscriber from './events/model-event-subscriber.js';
import SimulationEventSubscriber from './events/simulation-event-subscriber.js';

import ApiFactory from './api/api-factory.js';
import BusFactory from './bus/bus-factory.js';
import ConnectionManager from './connection-manager.js';
import GalaxyManager, { BuildingConfigurations, CoreConfigurations, InventionConfigurations } from './galaxy-manager.js';
import CacheByPlanet from '../planet/cache-by-planet.js';

import TycoonCache from '../tycoon/tycoon-cache.js';
import TycoonSocketCache from '../tycoon/tycoon-socket-cache.js';
import { asTycoonDao } from '../tycoon/tycoon-dao.js';

import BusEventsCache from './bus/bus-events-cache.js';
import BuildingCache from '../building/building-cache.js';
import { asBuildingDao } from '../building/building-dao.js';
import BuildingConstructionCache from '../building/construction/building-construction-cache.js';
import { asBuildingConstructionDao } from '../building/construction/building-construction-dao.js';
import CashflowCache from '../finances/cashflow-cache.js';
import CorporationCache from '../corporation/corporation-cache.js';
import { asCorporationDao } from '../corporation/corporation-dao.js';
import CompanyCache from '../company/company-cache.js';
import { asCompanyDao } from '../company/company-dao.js';
import InventionSummaryCache from '../company/invention-summary-cache.js';
import { asInventionSummaryDao } from '../company/invention-summary-dao.js';
import MapCache from '../planet/map-cache.js';
import PlanetCache from '../planet/planet-cache.js';
import { asPlanetDao } from '../planet/planet-dao.js';
import RankingsCache from '../corporation/rankings-cache.js';
import { asRankingsDao } from '../corporation/rankings-dao.js';
import SimulationFrame from '../engine/simulation-frame.js';
import TownCache from '../planet/town-cache.js';
import { asTownDao } from '../planet/town-dao.js';
import TycoonVisaCache from '../tycoon/tycoon-visa-cache.js';
import { asTycoonVisaDao } from '../tycoon/tycoon-visa-dao.js';

import Logger from '../utils/logger.js';

export interface HttpServerCaches {
  buildingConfigurations: Record<string, BuildingConfigurations>;
  coreConfigurations: Record<string, CoreConfigurations>;
  inventionConfigurations: Record<string, InventionConfigurations>;

  tycoon: TycoonCache;
  tycoonSocket: TycoonSocketCache;
  tycoonVisa: TycoonVisaCache;

  busEvents: BusEventsCache;

  building: CacheByPlanet<BuildingCache>;
  buildingConstruction: CacheByPlanet<BuildingConstructionCache>;
  cashflow: CacheByPlanet<CashflowCache>;
  company: CacheByPlanet<CompanyCache>;
  corporation: CacheByPlanet<CorporationCache>;
  inventionSummary: CacheByPlanet<InventionSummaryCache>;
  map: CacheByPlanet<MapCache>;
  planet: CacheByPlanet<PlanetCache>;
  rankings: CacheByPlanet<RankingsCache>;
  town: CacheByPlanet<TownCache>;
}

export default class HttpServer {
  logger: winston.Logger;
  modelEventClient: ModelEventClient;
  modelEventPublisher: ModelEventPublisher;
  modelEventSubscriber: ModelEventSubscriber;

  simulationSubscriber: SimulationEventSubscriber;

  galaxyManager: GalaxyManager;
  caches: HttpServerCaches;

  running: boolean = false;

  connectionManager: ConnectionManager;

  server: http.Server;
  io: ioServer;

  constructor () {
    this.logger = winston.createLogger({
      transports: [new winston.transports.DailyRotateFile({
        level: 'info',
        filename: 'logs/process-http-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: false,
        maxSize: '20m',
        maxFiles: '14d'
      }), new winston.transports.Console()],
      format: winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp(),
        winston.format.label({ label: "HTTP Worker" }),
        winston.format.printf(({ level, message, label, timestamp }) => `${timestamp} [${label}][${level}]: ${message}`)
      )
    });

    this.modelEventClient = new ModelEventClient(this.logger);
    this.modelEventPublisher = new ModelEventPublisher(this.logger);
    this.modelEventSubscriber = new ModelEventSubscriber(this.logger);

    this.simulationSubscriber = new SimulationEventSubscriber(this.logger);

    this.galaxyManager = GalaxyManager.create(this.logger);
    const planetIds: string[] = this.galaxyManager.planets.map((p) => p.id);

    const buildingConfigurations: Record<string, BuildingConfigurations> = {};
    const coreConfigurations: Record<string, CoreConfigurations> = {};
    const inventionConfigurations: Record<string, InventionConfigurations> = {};

    const cashflowByPlanet: Record<string, CashflowCache> = {};
    const companyByPlanet: Record<string, CompanyCache> = {};
    const townByPlanet: Record<string, TownCache> = {};
    const buildingByPlanet: Record<string, BuildingCache> = {};
    const constructionByPlanet: Record<string, BuildingConstructionCache> = {};
    const corporationByPlanet: Record<string, CorporationCache> = {};
    const inventionByPlanet: Record<string, InventionSummaryCache> = {};
    const mapByPlanet: Record<string, MapCache> = {};
    const planetByPlanet: Record<string, PlanetCache> = {};
    const rankingByPlanet: Record<string, RankingsCache> = {};

    for (const id of planetIds) {
      cashflowByPlanet[id] = new CashflowCache();
      companyByPlanet[id] = new CompanyCache(asCompanyDao(this.modelEventClient, id));
      townByPlanet[id] = new TownCache(asTownDao(this.modelEventClient, id));

      buildingConfigurations[id] = this.galaxyManager.metadataBuildingForPlanet(id) ?? new BuildingConfigurations([], [], []);
      coreConfigurations[id] = this.galaxyManager.metadataCoreForPlanet(id) ?? new CoreConfigurations([], [], [], [], [], [], [], []);
      inventionConfigurations[id] = this.galaxyManager.metadataInventionForPlanet(id) ?? new InventionConfigurations([]);

      buildingByPlanet[id] = new BuildingCache(asBuildingDao(this.modelEventClient, id), this.galaxyManager.forPlanetRequired(id).planetWidth, buildingConfigurations[id], townByPlanet[id]);
      constructionByPlanet[id] = new BuildingConstructionCache(asBuildingConstructionDao(this.modelEventClient, id));
      corporationByPlanet[id] = new CorporationCache(asCorporationDao(this.modelEventClient, id));
      inventionByPlanet[id] = new InventionSummaryCache(asInventionSummaryDao(this.modelEventClient, id), inventionConfigurations[id], companyByPlanet[id]);
      mapByPlanet[id] = new MapCache(this.galaxyManager.forPlanetRequired(id), townByPlanet[id]);
      planetByPlanet[id] = new PlanetCache(asPlanetDao(this.modelEventClient, id));
      rankingByPlanet[id] = new RankingsCache(asRankingsDao(this.modelEventClient, id));
    }

    this.caches = {
      buildingConfigurations: buildingConfigurations,
      coreConfigurations: coreConfigurations,
      inventionConfigurations: inventionConfigurations,
      tycoon: new TycoonCache(asTycoonDao(this.modelEventClient)),
      tycoonSocket: new TycoonSocketCache(),
      tycoonVisa: new TycoonVisaCache(asTycoonVisaDao(this.modelEventClient)),
      busEvents: new BusEventsCache(),
      building: new CacheByPlanet(buildingByPlanet),
      buildingConstruction: new CacheByPlanet(constructionByPlanet),
      cashflow: new CacheByPlanet(cashflowByPlanet),
      company: new CacheByPlanet(companyByPlanet),
      corporation: new CacheByPlanet(corporationByPlanet),
      inventionSummary: new CacheByPlanet(inventionByPlanet),
      map: new CacheByPlanet(mapByPlanet),
      planet: new CacheByPlanet(planetByPlanet),
      rankings: new CacheByPlanet(rankingByPlanet),
      town: new CacheByPlanet(townByPlanet)
    };


    this.server = ApiFactory.create(this.logger, this.galaxyManager, this.modelEventClient, this.caches);
    this.io = BusFactory.create(this.server, this.galaxyManager, this.caches);
    this.connectionManager = new ConnectionManager(this.logger, this.io);

    this.configureEvents();
    this.loadCaches();

    setInterval(() => Logger.logMemory(this.logger), 1000 * 900);
  }

  configureEvents () {
    this.server.on('connection', (socket) => this.connectionManager.handleConnection(socket));
    BusFactory.configureEvents(this.logger, this.io, this.connectionManager, this.modelEventPublisher, this.caches);

    this.modelEventSubscriber.events.on('connectSocket', (event) => this.caches.tycoonSocket.set(event.tycoonId, event.socketId));
    this.modelEventSubscriber.events.on('disconnectSocket', (event) => {
      this.caches.tycoonSocket.clearBySocketId(event.socketId);
      this.connectionManager.disconnectSocket(event.socketId);
    });
    this.modelEventSubscriber.events.on('updateBuilding', (event) => this.caches.building.withPlanetId(event.planetId).update(event.building));
    this.modelEventSubscriber.events.on('updateBuildingConstruction', (event) => this.caches.buildingConstruction.withPlanetId(event.planetId).update(event.construction));
    this.modelEventSubscriber.events.on('updateCompany', (event) => this.caches.company.withPlanetId(event.planetId).update(event.company));
    this.modelEventSubscriber.events.on('updateCorporation', (event) => this.caches.corporation.withPlanetId(event.planetId).update(event.corporation));
    this.modelEventSubscriber.events.on('updateTycoon', (event) => this.caches.tycoon.loadTycoon(event.tycoon));
    this.modelEventSubscriber.events.on('updateVisa', (event) => {
      if (!this.caches.tycoonVisa.forId(event.visa.id)) {
        this.caches.busEvents.queueIssuedVisa(event.visa.planetId, event.visa);
      }
      this.caches.tycoonVisa.set(event.visa);
    });
    this.modelEventSubscriber.events.on('deleteVisa', (event) => this.caches.tycoonVisa.clearByVisaId(event.visaId));
    this.modelEventSubscriber.events.on('startResearch', (event) => this.caches.inventionSummary.withPlanetId(event.planetId).update(event.summary));
    this.modelEventSubscriber.events.on('cancelResearch', (event) => this.caches.inventionSummary.withPlanetId(event.planetId).update(event.summary));
  }

  async loadCaches () {
    // first load
    await Promise.all([
      this.caches.tycoon.load(),
      this.caches.tycoonVisa.load(),
      ...this.caches.cashflow.loadAll(),
      ...this.caches.company.loadAll(),
      ...this.caches.corporation.loadAll(),
      ...this.caches.planet.loadAll(),
      ...this.caches.rankings.loadAll(),
      ...this.caches.town.loadAll()
    ]);
    // second load (depends on first load)
    await Promise.all([
      ...this.caches.building.loadAll(),
      ...this.caches.buildingConstruction.loadAll(),
      ...this.caches.inventionSummary.loadAll(),
      ...this.caches.map.loadAll()
    ]);
  }

  waitForSimulationState (finishCallback: Function): void {
    if (!this.caches.tycoon.loaded || !this.caches.tycoonVisa.loaded ||
        !this.caches.building.loaded ||
        !this.caches.buildingConstruction.loaded ||
        !this.caches.cashflow.loaded ||
        !this.caches.company.loaded ||
        !this.caches.corporation.loaded ||
        !this.caches.inventionSummary.loaded ||
        !this.caches.map.loaded ||
        !this.caches.planet.loaded ||
        !this.caches.rankings.loaded ||
        !this.caches.town.loaded) {
      setTimeout(() => this.waitForSimulationState(finishCallback), 1000);
    }
    else {
      finishCallback();
    }
  }

  start (): void {
    this.connectionManager.start();
    this.modelEventClient.start();
    this.modelEventPublisher.start();
    this.modelEventSubscriber.start();
    this.simulationSubscriber.start((event) => this.notifySocketsWithSimulation(event));

    this.waitForSimulationState(() => {
      const port = this.galaxyManager.galaxyMetadata.settings?.port ?? 19160;
      this.server.listen(port, () => {
        this.logger.info(`Started on port ${port}`);
        this.running = true;
      });
    });
  }

  async stop (): Promise<void> {
    if (this.running) {
      this.running = false;
      this.logger.info('Stopping Worker...');

      this.connectionManager.stop();
      await new Promise<void>((resolve: () => void, reject: (err: Error) => void) => this.io.close((err?: Error) => err ? reject(err) : resolve()));

      this.modelEventClient.stop();
      this.modelEventPublisher.stop();
      this.modelEventSubscriber.stop();
      this.simulationSubscriber.stop();

      await Promise.all([
        this.caches.tycoon.close(),
        ...this.caches.building.closeAll(),
        ...this.caches.buildingConstruction.closeAll(),
        ...this.caches.cashflow.closeAll(),
        ...this.caches.company.closeAll(),
        ...this.caches.corporation.closeAll(),
        ...this.caches.inventionSummary.closeAll(),
        ...this.caches.map.closeAll(),
        ...this.caches.planet.closeAll(),
        ...this.caches.rankings.closeAll(),
        ...this.caches.town.closeAll()
      ]);

      this.logger.info('Stopped Worker');
      process.exit();
    }
    else {
      this.logger.warn('Worker already stopped');
      process.exit();
    }
  }

  async notifySocketsWithSimulation (event: SimulationFrame): Promise<void> {
    const info = this.connectionManager.connectionInformation();
    for (let socketId of info.disconnectableSocketIds) {
      await this.modelEventPublisher.disconnectSocket(socketId);
    }
    BusFactory.notifySockets(this.logger, this.caches, event, info.connectedSocketsByTycoonIds);
  }

}
