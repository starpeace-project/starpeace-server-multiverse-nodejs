import _ from 'lodash';
import express from 'express';
import winston from 'winston';

import GalaxyManager from '../galaxy-manager';
import ModelEventClient from '../events/model-event-client';
import { ApiCaches } from './api-factory';

import Corporation from '../../corporation/corporation';
import Tycoon from '../../tycoon/tycoon';
import CorporationCache from '../../corporation/corporation-cache';
import CorporationIdentifier from '../../corporation/corporation-identifier';

export default class TycoonApi {
  logger: winston.Logger;
  galaxyManager: GalaxyManager;
  modelEventClient: ModelEventClient;
  caches: ApiCaches;

  constructor (logger: winston.Logger, galaxyManager: GalaxyManager, modelEventClient: ModelEventClient, caches: ApiCaches) {
    this.logger = logger;
    this.galaxyManager = galaxyManager;
    this.modelEventClient = modelEventClient;
    this.caches = caches;
  }

  getTycoon (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.params.tycoonId) return res.status(400);

      try {
        const tycoon: Tycoon | null = this.caches.tycoon.forId(req.params.tycoonId);
        if (!tycoon) return res.status(404);

        return res.json({
          id: tycoon.id,
          username: tycoon.username,
          name: tycoon.name
        });
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500);
      }
    };
  }

  getTycoonCorporations (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.params.tycoonId) return res.status(400);

      try {
        const tycoon: Tycoon | null = this.caches.tycoon.forId(req.params.tycoonId);
        if (!tycoon) return res.status(404);

        const identifiersJson = this.caches.corporation.entries().map(([planetId, cache]) => {
          const corporation: Corporation | null = cache.forTycoonId(tycoon.id);
          return corporation ? new CorporationIdentifier(corporation.id, corporation.name, planetId) : null;
        }).filter(c => !!c).map(c => c?.toJson());

        return res.json({
          identifiers: identifiersJson
        });
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500);
      }
    };
  }

  getSearch (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.status(400);

      const query: string = _.trim(req.query.query as string).toLowerCase();
      if (req.query.startsWithQuery && query.length < 1 || !req.query.startsWithQuery && query.length < 3) return res.status(400);

      try {
        const matchedTycoons: Tycoon[] = this.caches.tycoon.all().filter(tycoon => {
          if (req.query.startsWithQuery)
            return tycoon.name.toLowerCase().startsWith(query);
          else
            return tycoon.name.toLowerCase().includes(query);
        });

        const corporationCache: CorporationCache = this.caches.corporation.withPlanet(req.planet);
        return res.json(matchedTycoons.map(tycoon => {
          const corporation: Corporation | null = corporationCache.forTycoonId(tycoon.id);
          return !corporation ? null : {
            tycoonId: tycoon.id,
            tycoonName: tycoon.name,
            corporationId: corporation.id,
            corporationName: corporation.name
          };
        }).filter(j => !!j));
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500);
      }
    };
  }

}
