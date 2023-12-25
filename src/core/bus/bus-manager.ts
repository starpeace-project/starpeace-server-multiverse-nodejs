import _ from 'lodash';
import { gzipSync } from 'fflate';
import http from 'http';
import jwt from 'jsonwebtoken';
import { Server, Socket as ioSocket } from 'socket.io';
import winston from 'winston';

import ConnectionManager from '../connection-manager.js';
import ModelEventPublisher from '../events/model-event-publisher.js';
import { type HttpServerCaches } from '../http-server.js';
import SimulationFrame from '../../engine/simulation-frame.js';

import GalaxyManager from '../galaxy-manager.js';

import Building from '../../building/building.js';
import BuildingCache from '../../building/building-cache.js';
import BuildingConstruction from '../../building/construction/building-construction.js';
import BuildingConstructionCache from '../../building/construction/building-construction-cache.js';
import Company from '../../company/company.js';
import CompanyCache from '../../company/company-cache.js';
import Corporation from '../../corporation/corporation.js';
import CorporationCache from '../../corporation/corporation-cache.js';
import InventionSummaryCache from '../../company/invention-summary-cache.js';
import Planet from '../../planet/planet.js';
import PlanetCache from '../../planet/planet-cache.js';
import Tycoon from '../../tycoon/tycoon.js';
import TycoonVisa from '../../tycoon/tycoon-visa.js';
import CashflowCache from '../../finances/cashflow-cache.js';

import InitializePayload from './events/initialize-payload.js';
import SimulationPayload from './events/simulation-payload.js';
import BuildingPayload from './events/types/building-payload.js';
import CorporationPayload from './events/types/corporation-payload.js';
import PlanetPayload from './events/types/planet-payload.js';
import ViewPayload from './events/types/view-payload.js';
import CompanyPayload from './events/types/company-payload.js';


export default class BusManager {
  logger: winston.Logger;
  io: Server;

  galaxyManager: GalaxyManager;
  caches: HttpServerCaches;

  constructor (logger: winston.Logger, server: http.Server, galaxyManager: GalaxyManager, caches: HttpServerCaches) {
    this.logger = logger;
    this.io = new Server(server, {
      cors: {
        origin: [/localhost\:11010/, 'https://client.starpeace.io'],
        credentials: true
      },
      transports: ['websocket']
    });
    this.galaxyManager = galaxyManager;
    this.caches = caches;

    this.configureAuthentication();
  }

  configureAuthentication (): void {
    this.io.use((socket: ioSocket, next: (err?: Error) => void) => {
      socket.request.headers['Authorization'] = `JWT ${socket.handshake.query.JWT}`;
      socket.request.headers['PlanetId'] = socket.handshake.query.PlanetId;
      socket.request.headers['VisaId'] = socket.handshake.query.VisaId;

      jwt.verify(socket.handshake.query.JWT as string, this.galaxyManager.secret, {}, (err: any, payload: any) => {
        if (err) return next(err);
        if (new Date(payload.exp * 1000) < new Date()) return next();
        const tycoon: Tycoon | null = this.caches.tycoon.forId(payload.id);
        if (tycoon) socket.data.user = tycoon;
        return next();
      });
    });

    this.io.use((socket: ioSocket, next) => {
      if (socket.data.user) {
        next();
      }
      else {
        next(new Error('unauthorized'))
      }
    });
  }

  configureEvents (connectionManager: ConnectionManager, modelEventPublisher: ModelEventPublisher): void {
    this.io.on('connect', (socket: ioSocket) => {
      if (!connectionManager.state.running) {
        socket.disconnect(true);
        return;
      }

      const user: Tycoon = <Tycoon> socket.data.user;
      const visa: TycoonVisa | null = this.caches.tycoonVisa.forTycoonId(user.id);
      if (!visa) {
        socket.disconnect(true);
        return;
      }

      socket.on('disconnect', () => {
        connectionManager.disconnectSocket(socket.id);
        modelEventPublisher.disconnectSocket(socket.id);
        this.logger.info(`Client socket disconnected: ${socket.id} @ ${socket.handshake.address}`);
      });

      socket.on('view', (data: any) => {
        const visa: TycoonVisa | null = this.caches.tycoonVisa.forTycoonId(user.id);
        if (visa && _.isInteger(data.viewX) && _.isInteger(data.viewY)) {
          modelEventPublisher.updateViewTarget(visa.id, data.viewX, data.viewY);
          this.caches.tycoonSocket.selectBuilding(user.id, data.selectedBuildingId);
        }
      });

      const existingSocketId: string | undefined = this.caches.tycoonSocket.forId(user.id);
      if (existingSocketId) {
        connectionManager.disconnectSocket(socket.id);
        modelEventPublisher.disconnectSocket(existingSocketId);
      }
      modelEventPublisher.connectSocket(socket.id, user.id);
      connectionManager.connectSocket(socket.id, user.id);

      const cashflowCache: CashflowCache = this.caches.cashflow.withPlanetId(visa.planetId);
      const corporationCache: CorporationCache = this.caches.corporation.withPlanetId(visa.planetId);
      const companyCache: CompanyCache = this.caches.company.withPlanetId(visa.planetId);
      const corporation: Corporation | undefined = visa.corporationId ? corporationCache.forId(visa.corporationId) : visa.isTycoon ? corporationCache.forTycoonId(user.id) : undefined;
      const companies: Company[] = corporation ? companyCache.forCorporationId(corporation.id) : [];

      const planetCache: PlanetCache = this.caches.planet.withPlanetId(visa.planetId);
      const rawPayload = new InitializePayload(
        new ViewPayload(
          visa.viewX,
          visa.viewY
        ),
        new PlanetPayload(
          planetCache.planet.time,
          planetCache.planet.season
        ),
        corporation ? new CorporationPayload(
          corporation.lastMailAt,
          corporation.cash ?? 0,
          cashflowCache.forCorporationId(corporation.id) ?? 0,
          companies.map((company) => {
            return new CompanyPayload(
              company.id,
              cashflowCache.forCompanyId(company.id) ?? 0
            );
          })
        ) : undefined
      ).toJson();

      let payload = rawPayload;
      if (this.galaxyManager.galaxyMetadata.settings?.streamEncoding === 'gzip') {
        payload = gzipSync(Buffer.from(JSON.stringify(rawPayload)))
      }

      socket.emit('initialize', payload);
      this.logger.info(`Client socket connected: ${socket.id} @ ${socket.handshake.address}`);
    });
  }

  notifySockets (event: SimulationFrame, socketsByTycoonId: Record<string, ioSocket>): void {
    const planet: Planet = this.caches.planet.withPlanetId(event.planetId).update(event.planet);
    const buildingCache: BuildingCache = this.caches.building.withPlanetId(event.planetId);
    const buildingConstructionCache: BuildingConstructionCache = this.caches.buildingConstruction.withPlanetId(event.planetId);
    const cashflowCache: CashflowCache = this.caches.cashflow.withPlanetId(event.planetId);
    const corporationCache: CorporationCache = this.caches.corporation.withPlanetId(event.planetId);
    const companyCache: CompanyCache = this.caches.company.withPlanetId(event.planetId);
    const inventionSummaryCache: InventionSummaryCache = this.caches.inventionSummary.withPlanetId(event.planetId);

    for (const [corporationId, cash] of Object.entries(event.finances.cashByCorporationId)) {
      corporationCache.updateCash(corporationId, cash);
    }
    for (const [corporationId, cashflow] of Object.entries(event.finances.cashflowByCorporationId)) {
      cashflowCache.updateCorporation(corporationId, cashflow);
    }
    for (const [companyId, cashflow] of Object.entries(event.finances.cashflowByCompanyId)) {
      cashflowCache.updateCompany(companyId, cashflow);
    }
    for (const [buildingId, cashflow] of Object.entries(event.finances.cashflowByBuildingId)) {
      cashflowCache.updateBuilding(buildingId, cashflow);
    }

    for (const [companyId, inventionIds] of Object.entries(event.research.deletedInventionIdsByCompanyId)) {
      inventionSummaryCache.updateDeleted(companyId, inventionIds);
    }
    for (const [companyId, inventionId] of Object.entries(event.research.completedInventionIdByCompanyId)) {
      inventionSummaryCache.updateCompleted(companyId, inventionId);
    }
    for (const [companyId, research] of Object.entries(event.research.activeResearchByCompanyId)) {
      inventionSummaryCache.updateActive(companyId, research.inventionId, research.investment);
    }

    for (const construction of event.buildings.updatedConstructions) {
      buildingConstructionCache.update(construction);
    }

    const buildingEvents = [];
    for (const id of Array.from(event.buildings.deletedBuildingIds)) {
      // TODO: remove other building types
      buildingConstructionCache.remove(id);
      buildingCache.remove(id);
      buildingEvents.push({ type: 'DELETE', id: id });
    }

    for (const building of Array.from(event.buildings.updatedBuildings)) {
      buildingCache.update(building);
      buildingEvents.push({
        type: event.buildings.addedBuildingIds.has(building.id) ? 'ADD' : 'UPDATE',
        id: building.id,
        definitionId: building.definitionId,
        townId: building.townId,
        tycoonId: building.tycoonId,
        tycoonName: this.caches.tycoon.forId(building.tycoonId)?.name ?? building.tycoonId,
        companyId: building.companyId,
        companyName: companyCache.forId(building.companyId)?.name ?? building.companyId,
        mapX: building.mapX,
        mapY: building.mapY
      });
    }

    const issuedVisaEvents = this.caches.busEvents.issuedVisasForPlanetId(event.planetId).map((v: TycoonVisa) => {
      return {
        tycoonName: v.isTycoon ? this.caches.tycoon.forId(v.tycoonId)?.name : 'Visitor',
        corporationName: v.isTycoon && !!v.corporationId ? corporationCache.forId(v.corporationId)?.name : undefined
      };
    });

    for (const [tycoonId, socket] of Object.entries(socketsByTycoonId)) {
      const tycoon: Tycoon | null = this.caches.tycoon.forId(tycoonId);
      const visa: TycoonVisa | null = this.caches.tycoonVisa.forTycoonId(tycoonId);
      if (!tycoon || !visa || visa.isExpired) {
        this.logger.info(`Client socket has unknown tycoon or expired visa: ${socket.id} @ ${socket.handshake.address}`);
        socket.disconnect();
        continue;
      }
      else if (visa.planetId !== event.planetId) {
        // socket connected to different planete simulation
        continue;
      }

      // FIXME: TODO: add per socket throttling (1 tps ?)

      const selectedBuildingId: string | undefined = this.caches.tycoonSocket.selectedBuildingIdForTycoonId(tycoon.id);
      const selectedBuilding: Building | undefined = selectedBuildingId ? buildingCache.forId(selectedBuildingId) : undefined;
      const selectedBuildingConstruction: BuildingConstruction | undefined = selectedBuilding && (!selectedBuilding.constructed || selectedBuilding.upgrading) ? buildingConstructionCache.forBuildingId(selectedBuilding.id) : undefined;

      const corporation: Corporation | undefined = visa.corporationId ? corporationCache.forId(visa.corporationId) : visa.isTycoon ? corporationCache.forTycoonId(tycoon.id) : undefined;
      const companies: Company[] = corporation ? companyCache.forCorporationId(corporation.id) : [];

      const rawPayload = new SimulationPayload(
        new PlanetPayload(
          planet.time,
          planet.season
        ),
        corporation ? new CorporationPayload(
          corporation.lastMailAt,
          corporation.cash ?? 0,
          cashflowCache.forCorporationId(corporation.id) ?? 0,
          companies.map((company) => {
            return new CompanyPayload(
              company.id,
              cashflowCache.forCompanyId(company.id) ?? 0
            );
          })
        ) : undefined,
        selectedBuilding ? new BuildingPayload(
          selectedBuilding.id,
          selectedBuildingConstruction?.progress,
          cashflowCache.forBuildingId(selectedBuilding.id) ?? 0
        ) : undefined,
        buildingEvents.length ? buildingEvents : undefined,
        issuedVisaEvents.length ? issuedVisaEvents : undefined
      ).toJson();

      let payload = rawPayload;
      if (this.galaxyManager.galaxyMetadata.settings?.streamEncoding === 'gzip') {
        payload = gzipSync(Buffer.from(JSON.stringify(rawPayload)))
      }

      socket.emit('simulation', payload);
    }
  }

}
