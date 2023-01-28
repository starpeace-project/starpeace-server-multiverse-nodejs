import _ from 'lodash';
import express from 'express';
import http from 'http';
import passport from 'passport';
import socketio from 'socket.io';

import ConnectionManager from '../connection-manager';
import ModelEventPublisher from '../events/model-event-publisher';
import { HttpServerCaches } from '../http-server';

import Tycoon from '../../tycoon/tycoon';
import TycoonVisa from '../../tycoon/tycoon-visa';
import PlanetCache from '../../planet/planet-cache';


export default class BusFactory {

  static create (server: http.Server): socketio.Server {
    const io = new socketio.Server(server, {
      cors: {
        origin: [/localhost\:9000/],
        credentials: true
      }
    });

    BusFactory.configureAuthentication(io);
    return io;
  }

  static configureAuthentication (io: socketio.Server): void {
    io.use((socket: socketio.Socket, next: (err?: Error) => void) => passport.initialize()(<express.Request>socket.request, <express.Response>{}, <express.NextFunction>next));
    io.use((socket: socketio.Socket, next: (err?: Error) => void) => {
      passport.authenticate('jwt', { session: false }, (err: Error, user: any) => {
        if (err || !user) return next();
        return (<express.Request>socket.request).logIn(user, { session: false }, (err: Error) => err ? next(err) : next());
      })(<express.Request>socket.request, <express.Response>{}, <express.NextFunction>next);
    });
    io.use((socket: socketio.Socket, next) => {
      if ((<express.Request>socket.request).user) {
        next();
      } else {
        next(new Error('unauthorized'))
      }
    });
  }

  static configureEvents (io: socketio.Server, connectionManager: ConnectionManager, modelEventPublisher: ModelEventPublisher, caches: HttpServerCaches): void {
    io.on('connect', (socket: socketio.Socket) => {
      if (!connectionManager.state.running) {
        socket.disconnect(true);
        return;
      }

      socket.on('disconnect', () => {
        connectionManager.disconnectSocket(socket.id);
        modelEventPublisher.disconnectSocket(socket.id);
        console.log('[HTTP Worker] Client socket disconnected');
      });

      socket.on('view', (data: any) => {
        const user: Tycoon = <Tycoon>(<express.Request> socket.request).user;
        const visa: TycoonVisa | null = caches.tycoonVisa.forTycoonId(user.id);
        if (visa && _.isInteger(data.viewX) && _.isInteger(data.viewY)) {
          modelEventPublisher.updateViewTarget(visa.id, data.viewX, data.viewY);
        }
      });

      const user: Tycoon = <Tycoon>(<express.Request> socket.request).user;
      const visa: TycoonVisa | null = caches.tycoonVisa.forTycoonId(user.id);
      if (!visa) {
        socket.disconnect(true);
        return;
      }

      const existingSocketId: string | null = caches.tycoonSocket.forId(user.id);
      if (existingSocketId) {
        connectionManager.disconnectSocket(socket.id);
        modelEventPublisher.disconnectSocket(existingSocketId);
      }
      modelEventPublisher.connectSocket(socket.id, user.id);
      connectionManager.connectSocket(socket.id, user.id);

      const planetCache: PlanetCache = caches.planet.withPlanetId(visa.planetId);
      socket.emit('initialize', {
        view: { x: visa.viewX ?? 256, y: visa.viewY ?? 256 },
        planet: {
          time: planetCache.planet.time.toISO()
        },
      });

      console.log('[HTTP Worker] Client socket connected');
    });
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
