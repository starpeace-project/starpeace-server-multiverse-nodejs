import _ from 'lodash';
import http from 'http';
import socketio from 'socket.io';
import winston from 'winston';

import ModelEventClient from './events/model-event-client';
import ModelEventPublisher from './events/model-event-publisher';
import ModelEventSubscriber from './events/model-event-subscriber';
import SimulationEventSubscriber from './events/simulation-event-subscriber';

import ApiFactory from './api/api-factory';
import BusFactory from './bus/bus-factory';
import ConnectionManager from './connection-manager';
import GalaxyManager, { BuildingConfigurations, InventionConfigurations } from './galaxy-manager';
import CacheByPlanet from '../planet/cache-by-planet';

import TycoonCache from '../tycoon/tycoon-cache';
import TycoonSocketCache from '../tycoon/tycoon-socket-cache';
import { asTycoonDao } from '../tycoon/tycoon-dao';

import BuildingCache from '../building/building-cache';
import { asBuildingDao } from '../building/building-dao';
import CorporationCache from '../corporation/corporation-cache';
import { asCorporationDao } from '../corporation/corporation-dao';
import CompanyCache from '../company/company-cache';
import { asCompanyDao } from '../company/company-dao';
import InventionSummaryCache from '../company/invention-summary-cache';
import { asInventionSummaryDao } from '../company/invention-summary-dao';
import PlanetCache from '../planet/planet-cache';
import { asPlanetDao } from '../planet/planet-dao';
import RankingsCache from '../corporation/rankings-cache';
import { asRankingsDao } from '../corporation/rankings-dao';
import TownCache from '../planet/town-cache';
import { asTownDao } from '../planet/town-dao';
import TycoonVisaCache from '../tycoon/tycoon-visa-cache';
import { asTycoonVisaDao } from '../tycoon/tycoon-visa-dao';
import SimulationFrame from '../engine/simulation-frame';
import MapCache from '../planet/map-cache';


export interface HttpServerCaches {
  tycoon: TycoonCache;
  tycoonSocket: TycoonSocketCache;
  tycoonVisa: TycoonVisaCache;

  building: CacheByPlanet<BuildingCache>;
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
  io: socketio.Server;


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

    const companyByPlanet: Record<string, CompanyCache> = Object.fromEntries(planetIds.map((id: string) => [id, new CompanyCache(asCompanyDao(this.modelEventClient, id))]));
    const townByPlanet: Record<string, TownCache> = Object.fromEntries(planetIds.map((id: string) => [id, new TownCache(asTownDao(this.modelEventClient, id))]));
    this.caches = {
      tycoon: new TycoonCache(asTycoonDao(this.modelEventClient)),
      tycoonSocket: new TycoonSocketCache(),
      tycoonVisa: new TycoonVisaCache(asTycoonVisaDao(this.modelEventClient)),
      building: new CacheByPlanet(Object.fromEntries(planetIds.map((id: string) => [id, new BuildingCache(asBuildingDao(this.modelEventClient, id), this.galaxyManager.forPlanetRequired(id).planetWidth, this.galaxyManager.metadataBuildingForPlanet(id) ?? new BuildingConfigurations([], [], []), townByPlanet[id])]))),
      company: new CacheByPlanet(companyByPlanet),
      corporation: new CacheByPlanet(Object.fromEntries(planetIds.map((id: string) => [id, new CorporationCache(asCorporationDao(this.modelEventClient, id))]))),
      inventionSummary: new CacheByPlanet(Object.fromEntries(planetIds.map((id: string) => [id, new InventionSummaryCache(asInventionSummaryDao(this.modelEventClient, id), this.galaxyManager.metadataInventionForPlanet(id) ?? new InventionConfigurations([]), companyByPlanet[id])]))),
      map: new CacheByPlanet(Object.fromEntries(planetIds.map((id: string) => [id, new MapCache(this.galaxyManager.forPlanetRequired(id), townByPlanet[id])]))),
      planet: new CacheByPlanet(Object.fromEntries(planetIds.map((id: string) => [id, new PlanetCache(asPlanetDao(this.modelEventClient, id))]))),
      rankings: new CacheByPlanet(Object.fromEntries(planetIds.map((id: string) => [id, new RankingsCache(asRankingsDao(this.modelEventClient, id))]))),
      town: new CacheByPlanet(townByPlanet)
    };


    this.server = ApiFactory.create(this.logger, this.galaxyManager, this.modelEventClient, this.caches);
    this.io = BusFactory.create(this.server, this.galaxyManager, this.caches);
    this.connectionManager = new ConnectionManager(this.logger, this.io);

    this.configureEvents();
    this.loadCaches();
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
    this.modelEventSubscriber.events.on('updateCompany', (event) => this.caches.company.withPlanetId(event.planetId).update(event.company));
    this.modelEventSubscriber.events.on('updateCorporation', (event) => this.caches.corporation.withPlanetId(event.planetId).update(event.corporation));
    this.modelEventSubscriber.events.on('updateTycoon', (event) => this.caches.tycoon.loadTycoon(event.tycoon));
    this.modelEventSubscriber.events.on('updateVisa', (event) => this.caches.tycoonVisa.set(event.visa));
    this.modelEventSubscriber.events.on('deleteVisa', (event) => this.caches.tycoonVisa.clearByVisaId(event.visaId));
    this.modelEventSubscriber.events.on('startResearch', (event) => this.caches.inventionSummary.withPlanetId(event.planetId).update(event.summary));
    this.modelEventSubscriber.events.on('cancelResearch', (event) => this.caches.inventionSummary.withPlanetId(event.planetId).update(event.summary));
  }

  async loadCaches () {
    // first load
    await Promise.all([
      this.caches.tycoon.load(),
      this.caches.tycoonVisa.load(),
      ...this.caches.company.loadAll(),
      ...this.caches.corporation.loadAll(),
      ...this.caches.planet.loadAll(),
      ...this.caches.rankings.loadAll(),
      ...this.caches.town.loadAll()
    ]);
    // second load (depends on first load)
    await Promise.all([
      ...this.caches.building.loadAll(),
      ...this.caches.inventionSummary.loadAll(),
      ...this.caches.map.loadAll()
    ]);
  }

  waitForSimulationState (finishCallback: Function): void {
    if (!this.caches.tycoon.loaded || !this.caches.tycoonVisa.loaded ||
        !this.caches.building.loaded ||
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
      this.server.listen(19160, () => {
        this.logger.info('Started on port 19160');
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
