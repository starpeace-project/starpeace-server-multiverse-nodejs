import _ from 'lodash';
import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

import GalaxyManager from '../galaxy-manager';
import ModelEventClient from '../events/model-event-client';
import { ApiCaches } from './api-factory';

import Company from '../../company/company';
import Corporation from '../../corporation/corporation';
import Tycoon from '../../tycoon/tycoon';
import CorporationCache from '../../corporation/corporation-cache';

export default class TycoonApi {
  galaxyManager: GalaxyManager;
  modelEventClient: ModelEventClient;
  caches: ApiCaches;

  constructor (galaxyManager: GalaxyManager, modelEventClient: ModelEventClient, caches: ApiCaches) {
    this.galaxyManager = galaxyManager;
    this.modelEventClient = modelEventClient;
    this.caches = caches;
  }

  loginUser (req: express.Request, res: express.Response, next: any, user: Tycoon, issueRefreshToken: boolean): void {
    req.logIn(user, { session: false }, async (err: any) => {
      if (err) return next(err);

      try {
        const accessToken: string = jwt.sign({ id: user.id }, this.galaxyManager.secret, { expiresIn: 3600 });
        const response: object = { id: user.id, username: user.username, name: user.name, accessToken: accessToken };
        if (!issueRefreshToken) return res.json(response);

        const token: string = await this.modelEventClient.issueToken(user);
        return res.json(Object.assign(response, { refreshToken: token }));
      }
      catch (error) {
        console.error(error);
        return res.status(500).json(error);
      }
    });
  }

  create (): (req: express.Request, res: express.Response, next: any) => any {
    return async (req: express.Request, res: express.Response, next: any) => {
      if (!req.body.username?.length || !req.body.password?.length) return res.status(400);
      return passport.authenticate('register', { session: false }, (error: any, user: Tycoon, info: any) => {
        if (error) return res.status(500).json(error);
        if (!user) return res.status(401).json({message: info.message});
        return this.loginUser(req, res, next, user, req.body.rememberMe);
      })(req, res, next);
    };
  }

  login (): (req: express.Request, res: express.Response, next: any) => any {
    return async (req: express.Request, res: express.Response, next: any) => {
    if (req.body.refreshToken?.length) {
      this.modelEventClient.loginToken(req.body.refreshToken)
        .then((user: Tycoon) => this.loginUser(req, res, next, user, true))
        .catch((error) => {
          console.error(error);
          return res.status(500).json(error);
        });
    }
    else {
      passport.authenticate('login', { session: false }, (error, user, info) => {
        if (error) return res.status(500).json(error);
        if (!user) return res.status(401).json({message: info.message});
        return this.loginUser(req, res, next, user, req.body.rememberMe);
      })(req, res, next);
    }
    };
  }

  logout (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      await new Promise(resolve => req.logout(resolve));
      return res.status(200).json({});
    };
  }


  getTycoon (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.params.tycoonId) return res.status(400);

      try {
        const tycoon: Tycoon | null = this.caches.tycoon.forId(req.params.tycoonId);
        if (!tycoon) return res.status(404);

        // TODO: single planet?
        const corporationsJson = this.caches.corporation.entries().map(([planetId, cache]) => {
          const corporation: Corporation | null = cache.forTycoonId(tycoon.id);
          return corporation?.toJsonApi(Array.from(corporation?.companyIds ?? []).map(id => this.caches.company.withPlanetId(planetId).forId(id)).filter(c => !!c) as Company[]);
        }).filter(c => !!c).flat(1);

        return res.json({
          id: tycoon.id,
          username: tycoon.username,
          name: tycoon.name,
          corporations: corporationsJson
        });
      }
      catch (err) {
        console.error(err);
        return res.status(500).json(err ?? {});
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
        console.error(err);
        return res.status(500).json(err ?? {});
      }
    };
  }

}
