import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import winston from 'winston';

import GalaxyManager from '../galaxy-manager.js';
import ModelEventClient from '../events/model-event-client.js';
import { type ApiCaches } from './api-factory.js';

import Company from '../../company/company.js';
import Corporation from '../../corporation/corporation.js';
import Tycoon from '../../tycoon/tycoon.js';


export default class GalaxyApi {
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

  getMetadata (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      try {
        const tycoon: Tycoon | null = req.isAuthenticated() ? req.user as Tycoon : null;
        const planets: any[] = [];
        for (let planet of this.galaxyManager.planets) {
          planets.push({
            id: planet.id,
            name: planet.name,
            enabled: planet.enabled,
            planetType: planet.planetType,
            planetWidth: planet.planetWidth,
            planetHeight: planet.planetHeight,
            mapId: planet.mapId,
            population: 0,
            investmentValue: 0,
            corporationCount: this.caches.corporation.withPlanetId(planet.id).all()?.length ?? 0,
            onlineCount: this.caches.tycoonVisa.countForPlanet(planet.id)
          });
        }

        return res.json({
          id: this.galaxyManager.galaxyMetadata.id,
          name: this.galaxyManager.galaxyMetadata.name,
          visas: {
            visitor: {
              issue: this.galaxyManager.isVisitorIssueEnabled
            },
            tycoon: {
              issue: this.galaxyManager.isTycoonIssueEnabled,
              create: this.galaxyManager.isTycoonCreateEnabled
            }
          },
          settings: {
            authentication: this.galaxyManager.galaxyMetadata.settings.authentication,
            streamEncoding: this.galaxyManager.galaxyMetadata.settings.streamEncoding
          },
          planets: planets,
          tycoon: !tycoon ? null : {
            id: tycoon.id,
            username: tycoon.username,
            name: tycoon.name,
            corporations: this.caches.corporation.entries().map(([planetId, cache]) => {
              const corporation: Corporation | null = cache.forTycoonId(tycoon.id);
              return corporation?.toJsonApi(Array.from(corporation?.companyIds ?? []).map(id => this.caches.company.withPlanetId(planetId).forId(id)).filter(c => !!c) as Company[]);
            }).filter(c => !!c).flat(1),
            admin: tycoon.admin,
            gameMaster: tycoon.gameMaster
          }
        });
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  async loginUser (req: express.Request, res: express.Response, next: any, user: Tycoon, issueRefreshToken: boolean): Promise<express.Response> {
    try {
      await new Promise<void>((resolve, reject) => req.logIn(user, { session: false }, (err) => err ? reject(err) : resolve()));
    }
    catch (err) {
      return next(err);
    }

    try {
      const corporations = this.caches.corporation.entries().map(([planetId, cache]) => {
        const corporation: Corporation | null = cache.forTycoonId(user.id);
        return corporation?.toJsonApi(Array.from(corporation?.companyIds ?? []).map(id => this.caches.company.withPlanetId(planetId).forId(id)).filter(c => !!c) as Company[]);
      }).filter(c => !!c).flat(1);

      const accessToken = jwt.sign({ id: user.id }, this.galaxyManager.secret, { expiresIn: 3600 });
      if (!issueRefreshToken) {
        return res.json({
          id: user.id,
          username: user.username,
          name: user.name,
          accessToken: accessToken,
          corporations: corporations,
          admin: user.admin,
          gameMaster: user.gameMaster
        });
      }

      const token = await this.modelEventClient.issueToken(user);
      return res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        accessToken: accessToken,
        refreshToken: token,
        corporations: corporations,
        admin: user.admin,
        gameMaster: user.gameMaster
      });
    }
    catch (err) {
      this.logger.error(err);
      return res.status(500).json(err);
    }
  }

  create (): (req: express.Request, res: express.Response, next: any) => any {
    return async (req: express.Request, res: express.Response, next: any): Promise<express.Response> => {
      if (!req.body.username?.length || !req.body.password?.length) return res.sendStatus(400);
      return passport.authenticate('register', { session: false }, async (error: any, user: Tycoon | undefined, info: any) => {
        if (error) {
          if (error === 'INVALID_NAME' || error === 'USERNAME_CONFLICT') {
            return res.status(400).json({ code: error });
          }
          return res.sendStatus(500);
        }
        if (!user) return res.status(401).json({ code: info.message });
        return await this.loginUser(req, res, next, user, req.body.rememberMe);
      })(req, res, next);
    };
  }

  login (): (req: express.Request, res: express.Response, next: any) => any {
    return async (req: express.Request, res: express.Response, next: any) => {
      if (req.body.refreshToken) {
        try {
          const tycoon: Tycoon | null = await this.modelEventClient.loginToken(req.body.refreshToken);
          if (!tycoon || !!tycoon.bannedAt) return res.status(401).json({ code: 'INVALID_TOKEN' });
          return await this.loginUser(req, res, next, tycoon, true);
        }
        catch (err) {
          this.logger.error(err);
          return res.sendStatus(500);
        }
      }
      else {
        return passport.authenticate('login', { session: false }, async (err: any, user: Tycoon | undefined) => {
          if (err) {
            this.logger.error(err);
            return res.sendStatus(500);
          }
          if (!user) return res.status(401).json({ code: 'INVALID' });
          return await this.loginUser(req, res, next, user, req.body.rememberMe);
        })(req, res, next);
      }
    };
  }

  logout (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      try {
        if (req.visa) {
          await this.modelEventClient.destroyVisa(req.visa.id);
        }
        // TODO: may want to add JWT token to blocklist
        return res.sendStatus(200);
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

}
