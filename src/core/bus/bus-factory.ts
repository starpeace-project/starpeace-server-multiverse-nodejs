import _ from 'lodash';
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


export default class BusFactory {

  static create (server: http.Server, galaxyManager: GalaxyManager, caches: HttpServerCaches): Server {
    const io = new Server(server, {
      cors: {
        origin: [/localhost\:11010/, 'https://client.starpeace.io'],
        credentials: true
      },
      transports: ['websocket']
    });

    BusFactory.configureAuthentication(io, galaxyManager, caches);
    return io;
  }

  static configureAuthentication (io: Server, galaxyManager: GalaxyManager, caches: HttpServerCaches): void {
    io.use((socket: ioSocket, next: (err?: Error) => void) => {
      socket.request.headers['Authorization'] = `JWT ${socket.handshake.query.JWT}`;
      socket.request.headers['PlanetId'] = socket.handshake.query.PlanetId;
      socket.request.headers['VisaId'] = socket.handshake.query.VisaId;

      jwt.verify(socket.handshake.query.JWT as string, galaxyManager.secret, {}, (err: any, payload: any) => {
        if (err) return next(err);
        if (new Date(payload.exp * 1000) < new Date()) return next();
        const tycoon: Tycoon | null = caches.tycoon.forId(payload.id);
        if (tycoon) socket.data.user = tycoon;
        return next();
      });
    });
    io.use((socket: ioSocket, next) => {
      if (socket.data.user) {
        next();
      } else {
        next(new Error('unauthorized'))
      }
    });
  }

  static configureEvents (logger: winston.Logger, io: Server, connectionManager: ConnectionManager, modelEventPublisher: ModelEventPublisher, caches: HttpServerCaches): void {
    io.on('connect', (socket: ioSocket) => {
      if (!connectionManager.state.running) {
        socket.disconnect(true);
        return;
      }

      const user: Tycoon = <Tycoon> socket.data.user;
      const visa: TycoonVisa | null = caches.tycoonVisa.forTycoonId(user.id);
      if (!visa) {
        socket.disconnect(true);
        return;
      }

      socket.on('disconnect', () => {
        connectionManager.disconnectSocket(socket.id);
        modelEventPublisher.disconnectSocket(socket.id);
        logger.info(`Client socket disconnected: ${socket.id} @ ${socket.handshake.address}`);
      });

      socket.on('view', (data: any) => {
        const visa: TycoonVisa | null = caches.tycoonVisa.forTycoonId(user.id);
        if (visa && _.isInteger(data.viewX) && _.isInteger(data.viewY)) {
          modelEventPublisher.updateViewTarget(visa.id, data.viewX, data.viewY);
          caches.tycoonSocket.selectBuilding(user.id, data.selectedBuildingId);
        }
      });

      const existingSocketId: string | undefined = caches.tycoonSocket.forId(user.id);
      if (existingSocketId) {
        connectionManager.disconnectSocket(socket.id);
        modelEventPublisher.disconnectSocket(existingSocketId);
      }
      modelEventPublisher.connectSocket(socket.id, user.id);
      connectionManager.connectSocket(socket.id, user.id);

      const cashflowCache: CashflowCache = caches.cashflow.withPlanetId(visa.planetId);
      const corporationCache: CorporationCache = caches.corporation.withPlanetId(visa.planetId);
      const companyCache: CompanyCache = caches.company.withPlanetId(visa.planetId);
      const corporation: Corporation | undefined = visa.corporationId ? corporationCache.forId(visa.corporationId) : visa.isTycoon ? corporationCache.forTycoonId(user.id) : undefined;
      const companies: Company[] = corporation ? companyCache.forCorporationId(corporation.id) : [];
      const cashflowJson: any = !corporation ? undefined : {
        id: corporation.id,
        lastMailAt: corporation.lastMailAt?.toISO(),
        cash: corporation.cash ?? 0,
        cashflow: cashflowCache.forCorporationId(corporation.id) ?? 0,
        companies: companies.map((company) => {
          return {
            id: company.id,
            cashflow: cashflowCache.forCompanyId(company.id) ?? 0
          };
        })
      };

      const planetCache: PlanetCache = caches.planet.withPlanetId(visa.planetId);
      socket.emit('initialize', {
        view: { x: visa.viewX, y: visa.viewY },
        planet: {
          time: planetCache.planet.time.toISO(),
          season: planetCache.planet.season
        },
        corporation: cashflowJson
      });

      logger.info(`Client socket connected: ${socket.id} @ ${socket.handshake.address}`);
    });
  }

  static notifySockets (logger: winston.Logger, caches: HttpServerCaches, event: SimulationFrame, socketsByTycoonId: Record<string, ioSocket>): void {
    const planet: Planet = caches.planet.withPlanetId(event.planetId).update(event.planet);
    const buildingCache: BuildingCache = caches.building.withPlanetId(event.planetId);
    const buildingConstructionCache: BuildingConstructionCache = caches.buildingConstruction.withPlanetId(event.planetId);
    const cashflowCache: CashflowCache = caches.cashflow.withPlanetId(event.planetId);
    const corporationCache: CorporationCache = caches.corporation.withPlanetId(event.planetId);
    const companyCache: CompanyCache = caches.company.withPlanetId(event.planetId);
    const inventionSummaryCache: InventionSummaryCache = caches.inventionSummary.withPlanetId(event.planetId);

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
        tycoonName: caches.tycoon.forId(building.tycoonId)?.name ?? building.tycoonId,
        companyId: building.companyId,
        companyName: companyCache.forId(building.companyId)?.name ?? building.companyId,
        mapX: building.mapX,
        mapY: building.mapY
      });
    }

    const issuedVisaEvents = caches.busEvents.issuedVisasForPlanetId(event.planetId).map((v: TycoonVisa) => {
      return {
        tycoonName: v.isTycoon ? caches.tycoon.forId(v.tycoonId)?.name : 'Visitor',
        corporationName: v.isTycoon && !!v.corporationId ? corporationCache.forId(v.corporationId)?.name : undefined
      };
    });

    for (const [tycoonId, socket] of Object.entries(socketsByTycoonId)) {
      const tycoon: Tycoon | null = caches.tycoon.forId(tycoonId);
      const visa: TycoonVisa | null = caches.tycoonVisa.forTycoonId(tycoonId);
      if (!tycoon || !visa || visa.isExpired) {
        logger.info(`Client socket has unknown tycoon or expired visa: ${socket.id} @ ${socket.handshake.address}`);
        socket.disconnect();
        continue;
      }
      else if (visa.planetId !== event.planetId) {
        // socket connected to different planete simulation
        continue;
      }

      // FIXME: TODO: add per socket throttling (1 tps ?)

      const selectedBuildingId: string | undefined = caches.tycoonSocket.selectedBuildingIdForTycoonId(tycoon.id);
      const selectedBuilding: Building | undefined = selectedBuildingId ? buildingCache.forId(selectedBuildingId) : undefined;
      const selectedBuildingConstruction: BuildingConstruction | undefined = selectedBuilding && (!selectedBuilding.constructed || selectedBuilding.upgrading) ? buildingConstructionCache.forBuildingId(selectedBuilding.id) : undefined;

      const corporation: Corporation | undefined = visa.corporationId ? corporationCache.forId(visa.corporationId) : visa.isTycoon ? corporationCache.forTycoonId(tycoon.id) : undefined;
      const companies: Company[] = corporation ? companyCache.forCorporationId(corporation.id) : [];
      const cashflowJson: any = !corporation ? null : {
        id: corporation.id,
        lastMailAt: corporation.lastMailAt?.toISO(),
        cash: corporation.cash ?? 0,
        cashflow: cashflowCache.forCorporationId(corporation.id) ?? 0,
        companies: companies.map((company) => {
          return {
            id: company.id,
            cashflow: cashflowCache.forCompanyId(company.id) ?? 0
          };
        })
      };

      socket.emit('simulation', {
        planet: {
          time: planet.time.toISO(),
          season: planet.season
        },
        corporation: cashflowJson,
        selectedBuildingId: selectedBuildingId,
        selectedBuilding: selectedBuilding ? {
          id: selectedBuilding.id,
          constructed: selectedBuilding.constructed,
          constructionProgress: selectedBuildingConstruction?.progress,
          cashflow: cashflowCache.forBuildingId(selectedBuilding.id) ?? 0
        } : undefined,
        buildingEvents: buildingEvents.length ? buildingEvents : undefined,
        issuedVisas: issuedVisaEvents.length ? issuedVisaEvents : undefined
      });
    }
  }

}
