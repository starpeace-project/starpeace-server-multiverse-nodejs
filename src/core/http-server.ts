import _ from 'lodash';
import http from 'http';
import socketio from 'socket.io';

import ModelEventClient from './events/model-event-client';
import ModelEventPublisher from './events/model-event-publisher';
import ModelEventSubscriber from './events/model-event-subscriber';
import SimulationEvent from './events/simulation-event';
import SimulationEventSubscriber from './events/simulation-event-subscriber';

import ApiFactory from './api/api-factory';
import BusFactory from './bus/bus-factory';
import ConnectionManager from './connection-manager';
import GalaxyManager from './galaxy-manager';
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
import InventionCache from '../company/invention-cache';
import { asInventionDao } from '../company/invention-dao';
import Planet from '../planet/planet';
import PlanetCache from '../planet/planet-cache';
import { asPlanetDao } from '../planet/planet-dao';
import RankingsCache from '../corporation/rankings-cache';
import { asRankingsDao } from '../corporation/rankings-dao';
import TownCache from '../planet/town-cache';
import { asTownDao } from '../planet/town-dao';
import TycoonVisaCache from '../tycoon/tycoon-visa-cache';
import { asTycoonVisaDao } from '../tycoon/tycoon-visa-dao';

export interface HttpServerCaches {
  tycoon: TycoonCache;
  tycoonSocket: TycoonSocketCache;
  tycoonVisa: TycoonVisaCache;

  building: CacheByPlanet<BuildingCache>;
  company: CacheByPlanet<CompanyCache>;
  corporation: CacheByPlanet<CorporationCache>;
  invention: CacheByPlanet<InventionCache>;
  planet: CacheByPlanet<PlanetCache>;
  rankings: CacheByPlanet<RankingsCache>;
  town: CacheByPlanet<TownCache>;
}

export default class HttpServer {
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
    this.modelEventClient = new ModelEventClient();
    this.modelEventPublisher = new ModelEventPublisher();
    this.modelEventSubscriber = new ModelEventSubscriber(this.modelEventClient);

    this.simulationSubscriber = new SimulationEventSubscriber();

    this.galaxyManager = GalaxyManager.create();
    const planetIds: string[] = this.galaxyManager.planets.map((p) => p.id);

    const companyByPlanet: Record<string, CompanyCache> = Object.fromEntries(planetIds.map((id: string) => [id, new CompanyCache(asCompanyDao(this.modelEventClient, id))]));
    const townByPlanet: Record<string, TownCache> = Object.fromEntries(planetIds.map((id: string) => [id, new TownCache(asTownDao(this.modelEventClient, id))]));
    this.caches = {
      tycoon: new TycoonCache(asTycoonDao(this.modelEventClient)),
      tycoonSocket: new TycoonSocketCache(),
      tycoonVisa: new TycoonVisaCache(asTycoonVisaDao(this.modelEventClient)),
      building: new CacheByPlanet(Object.fromEntries(planetIds.map((id: string) => [id, new BuildingCache(asBuildingDao(this.modelEventClient, id), townByPlanet[id])]))),
      company: new CacheByPlanet(companyByPlanet),
      corporation: new CacheByPlanet(Object.fromEntries(planetIds.map((id: string) => [id, new CorporationCache(asCorporationDao(this.modelEventClient, id))]))),
      invention: new CacheByPlanet(Object.fromEntries(planetIds.map((id: string) => [id, new InventionCache(asInventionDao(this.modelEventClient, id), companyByPlanet[id])]))),
      planet: new CacheByPlanet(Object.fromEntries(planetIds.map((id: string) => [id, new PlanetCache(asPlanetDao(this.modelEventClient, id))]))),
      rankings: new CacheByPlanet(Object.fromEntries(planetIds.map((id: string) => [id, new RankingsCache(asRankingsDao(this.modelEventClient, id))]))),
      town: new CacheByPlanet(townByPlanet),
    };


    this.server = ApiFactory.create(this.galaxyManager, this.modelEventClient, this.caches);
    this.io = BusFactory.create(this.server);
    this.connectionManager = new ConnectionManager(this.io);

    this.configureEvents();
    this.loadCaches();
  }

  configureEvents () {
    this.server.on('connection', (socket) => this.connectionManager.handleConnection(socket));
    BusFactory.configureEvents(this.io, this.connectionManager, this.modelEventPublisher, this.caches);
    this.modelEventClient.events.on('disconnectSocket', (socketId) => this.connectionManager.disconnectSocket(socketId));
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
      ...this.caches.invention.loadAll()
    ]);
  }

  waitForSimulationState (finishCallback: Function): void {
    if (!this.caches.tycoon.loaded || !this.caches.tycoonVisa.loaded ||
        !this.caches.building.loaded ||
        !this.caches.company.loaded ||
        !this.caches.corporation.loaded ||
        !this.caches.invention.loaded ||
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
    this.modelEventSubscriber.start(this.caches);
    this.simulationSubscriber.start((event) => this.notifySocketsWithSimulation(event));

    this.waitForSimulationState(() => {
      this.server.listen(19160, () => {
        console.log('[HTTP Worker] Started on port 19160');
        this.running = true;
      });
    });
  }

  async stop (): Promise<void> {
    if (this.running) {
      this.running = false;
      console.log('[HTTP Worker] Stopping...');

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
        ...this.caches.invention.closeAll(),
        ...this.caches.planet.closeAll(),
        ...this.caches.rankings.closeAll(),
        ...this.caches.town.closeAll()
      ]);

      console.log('[HTTP Worker] Stopped');
      process.exit();
    }
    else {
      console.log('[HTTP Worker] Already stopped');
      process.exit();
    }
  }

  async notifySocketsWithSimulation (event: SimulationEvent): Promise<void> {
    const info = this.connectionManager.connectionInformation();
    for (let socketId of info.disconnectableSocketIds) {
      await this.modelEventPublisher.disconnectSocket(socketId);
    }

    const planet: Planet = this.caches.planet.withPlanetId(event.planetId).update(event.planet);

    for (const [tycoonId, socket] of Object.entries(info.connectedSocketsByTycoonIds)) {
      const tycoon = this.caches.tycoon.forId(tycoonId);
      if (tycoon) {
        socket.emit('simulation', {
          planet: {
            time: planet.time.toISO()
          }
        });
      }
    }
  }

}
