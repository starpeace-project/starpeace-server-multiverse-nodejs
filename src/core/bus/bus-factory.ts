import _ from 'lodash';
import http from 'http';
import jwt from 'jsonwebtoken';
import socketio from 'socket.io';

import ConnectionManager from '../connection-manager';
import ModelEventPublisher from '../events/model-event-publisher';
import { HttpServerCaches } from '../http-server';

import GalaxyManager from '../galaxy-manager';
import SimulationEvent from '../events/simulation-event';

import Company from '../../company/company';
import CompanyCache from '../../company/company-cache';
import Corporation from '../../corporation/corporation';
import CorporationCache from '../../corporation/corporation-cache';
import Planet from '../../planet/planet';
import PlanetCache from '../../planet/planet-cache';
import Tycoon from '../../tycoon/tycoon';
import TycoonVisa from '../../tycoon/tycoon-visa';
import winston from 'winston';


export default class BusFactory {

  static create (server: http.Server, galaxyManager: GalaxyManager, caches: HttpServerCaches): socketio.Server {
    const io = new socketio.Server(server, {
      cors: {
        origin: [/localhost\:11010/, 'https://client.starpeace.io'],
        credentials: true
      },
      transports: ['websocket']
    });

    BusFactory.configureAuthentication(io, galaxyManager, caches);
    return io;
  }

  static configureAuthentication (io: socketio.Server, galaxyManager: GalaxyManager, caches: HttpServerCaches): void {
    io.use((socket: socketio.Socket, next: (err?: Error) => void) => {
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
    io.use((socket: socketio.Socket, next) => {
      if (socket.data.user) {
        next();
      } else {
        next(new Error('unauthorized'))
      }
    });
  }

  static configureEvents (logger: winston.Logger, io: socketio.Server, connectionManager: ConnectionManager, modelEventPublisher: ModelEventPublisher, caches: HttpServerCaches): void {
    io.on('connect', (socket: socketio.Socket) => {
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
        }
      });

      const existingSocketId: string | null = caches.tycoonSocket.forId(user.id);
      if (existingSocketId) {
        connectionManager.disconnectSocket(socket.id);
        modelEventPublisher.disconnectSocket(existingSocketId);
      }
      modelEventPublisher.connectSocket(socket.id, user.id);
      connectionManager.connectSocket(socket.id, user.id);

      const corporationCache: CorporationCache = caches.corporation.withPlanetId(visa.planetId);
      const corporation: Corporation | null = visa.corporationId ? corporationCache.forId(visa.corporationId) : visa.isTycoon ? corporationCache.forTycoonId(user.id) : null;
      const companies: Company[] = [];
      const cashflowJson: any = !corporation ? null : {
        id: corporation.id,
        lastMailAt: corporation.lastMailAt?.toISO(),
        cash: 0,
        cashflow: 0,
        companies: companies.map((company) => {
          return {
            id: company.id,
            cashflow: 0
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

  static notifySockets (logger: winston.Logger, caches: HttpServerCaches, event: SimulationEvent, socketsByTycoonId: Record<string, socketio.Socket>): void {
    const planet: Planet = caches.planet.withPlanetId(event.planetId).update(event.planet);
    const corporationCache: CorporationCache = caches.corporation.withPlanetId(event.planetId);
    const companyCache: CompanyCache = caches.company.withPlanetId(event.planetId);

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

      const corporation: Corporation | null = visa.corporationId ? corporationCache.forId(visa.corporationId) : visa.isTycoon ? corporationCache.forTycoonId(tycoon.id) : null;
      const companies: Company[] = corporation ? companyCache.forCorporationId(corporation.id) : [];
      const cashflowJson: any = !corporation ? null : {
        id: corporation.id,
        lastMailAt: corporation.lastMailAt?.toISO(),
        cash: 0,
        cashflow: 0,
        companies: companies.map((company) => {
          return {
            id: company.id,
            cashflow: 0
          };
        })
      };

      socket.emit('simulation', {
        planet: {
          time: planet.time.toISO(),
          season: planet.season
        },
        corporation: cashflowJson
      });
    }
  }

    // getCashflow: () -> (req, res, next) =>
  //   return res.status(400) unless req.params.corporationId?
  //   return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == req.params.corporationId

  //   try
  //     corporation = await @corporationManager.forId(req.params.corporationId)
  //     return res.status(404) unless corporation?

  //     cashflow = {
  //       id: corporation.id
  //       lastMailAt: if corporation.lastMailAt? then corporation.lastMailAt.toISO() else null
  //       cash: 0
  //       cashflow: 0
  //       companies: _.map(Array.from(corporation.companyIds), (companyId) -> {
  //         id: companyId
  //         cashflow: 0
  //       })
  //     }

  //     res.json(cashflow)
  //   catch err
  //     console.error err
  //     res.status(500).json(err || {})

  // getEvents (): (req: express.Request, res: express.Response, next: any) => any {
  //   return async (req: express.Request, res: express.Response, next: any) => {
  //   return res.status(400) unless req.params.planetId?
  //   return res.status(404) unless @galaxyManager.forPlanet(req.params.planetId)?
  //   return res.status(404) unless @simulationStates[req.params.planetId]?
  //   return res.status(403) unless req.visa? && req.visa.planetId == req.params.planetId

  //   # FIXME: TODO: hookup event state
  //   res.json({
  //     planetId: req.params.planetId
  //     time: @simulationStates[req.params.planetId].planetTime.toISO()
  //     season: @simulationStates[req.params.planetId].season()
  //     buildingEvents: []
  //     tycoonEvents: []
  //   })

}
