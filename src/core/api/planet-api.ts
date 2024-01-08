import express from 'express';
import winston from 'winston';

import GalaxyManager, { type PlanetMetadata } from '../galaxy-manager.js';
import ModelEventClient from '../events/model-event-client.js';
import { type ApiCaches } from './api-factory.js';

import Corporation from '../../corporation/corporation.js';
import Rankings from '../../corporation/rankings.js';
import Tycoon from '../../tycoon/tycoon.js';
import TycoonVisa, { VISA_IDLE_EXPIRATION_IN_MS } from '../../tycoon/tycoon-visa.js';
import Town from '../../planet/town.js';

import Utils from '../../utils/utils.js';
import CorporationCache from '../../corporation/corporation-cache.js';
import TycoonSettings from '../../tycoon/settings/tycoon-settings.js';


export default class PlanetApi {
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

  registerVisa (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      const isVisitor: boolean = req.body.identityType == 'visitor';
      const isTycoon: boolean = req.body.identityType == 'tycoon';

      if (!isVisitor && !isTycoon) return res.sendStatus(400);
      if (isVisitor && !this.galaxyManager.isVisitorIssueEnabled) return res.sendStatus(400);
      if (isTycoon && !this.galaxyManager.isTycoonIssueEnabled) return res.sendStatus(400);
      if (isTycoon && !req.isAuthenticated()) return res.sendStatus(401);
      if (!req.planet) return res.sendStatus(400);

      try {
        const tycoonId: string = isTycoon ? (<Tycoon> req.user).id : 'random-visitor';
        const corporation: Corporation | undefined = isTycoon ? this.caches.corporation.withPlanet(req.planet).forTycoonId(tycoonId) : undefined;
        if (corporation && !!corporation.bannedAt) return res.sendStatus(400);

        const tycoonSettings: TycoonSettings | undefined = isTycoon ? (await this.modelEventClient.getTycoonSettings(req.planet.id, tycoonId)) : undefined;
        const towns: Town[] = this.caches.town.withPlanet(req.planet).all() ?? [];
        const town: Town | null = towns.length ? towns[Math.floor(Math.random() * towns.length)] : null;
        const viewX: number = tycoonSettings?.viewX ?? town?.mapX ?? 500;
        const viewY: number = tycoonSettings?.viewY ?? town?.mapY ?? 500;

        const visa: TycoonVisa = await this.modelEventClient.saveVisa(new TycoonVisa(Utils.uuid(), req.body.identityType, tycoonId, req.planet.id, corporation?.id, new Date().getTime() + VISA_IDLE_EXPIRATION_IN_MS, viewX, viewY));
        if (!visa) return res.sendStatus(500);
        return res.json(visa.toJson());
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  verifyVisa (requireTycoon: boolean): (req: express.Request, res: express.Response, next: any) => any {
    return async (req: express.Request, res: express.Response, next: any) => {
      try {
        const visaId = req.header('VisaId');
        if (!visaId) {
          if (Tycoon.isPrivileged(req.user)) {
            return next();
          }
          else {
            return res.status(401).json({message: 'MISSING_VISA'});
          }
        }

        const visa: TycoonVisa | null = this.caches.tycoonVisa.forId(visaId);
        if (!visa) return res.status(401).json({message: 'UNKNOWN_VISA'});
        if (!req.planet || visa.planetId !== req.planet.id) return res.status(403).json({message: 'INVALID_VISA_PLANET'});
        if (requireTycoon) {
          if (!visa.isTycoon) return res.status(403).json({message: 'INVALID_VISA'});
          if (!req.isAuthenticated() || visa.tycoonId !== (<Tycoon> req.user).id) return res.status(403).json({message: 'INVALID_VISA'});
        }

        req.visa = visa;
        return next();
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  verifyPlanet (): (req: express.Request, res: express.Response, next: any) => any {
    return async (req: express.Request, res: express.Response, next: any) => {
      try {
        const planetId = req.header('PlanetId');
        if (!planetId) return res.status(404).json({message: 'MISSING_PLANET'});

        const planet: PlanetMetadata | null = this.galaxyManager.forPlanet(planetId);
        if (!planet) return res.status(404).json({message: 'UNKNOWN_PLANET'});

        req.planet = planet;
        return next();
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  getPlanetFinances (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.sendStatus(400);

      const cache = this.caches.cashflow.withPlanet(req.planet);
      return res.json({
        towns: this.caches.town.withPlanet(req.planet).all().map(t => {
          return {
            id: t.id,
            cash: t.cash
          };
        }),
        corporations: this.caches.corporation.withPlanet(req.planet).all().map(c => {
          return {
            id: c.id,
            cash: c.cash,
            cashflow: cache.byCorporationId[c.id] ?? 0
          };
        }),
        companies: Object.entries(cache.byCompanyId).map(([id, cashflow]) => {
          return {
            id: id,
            cashflow: cashflow
          };
        }),
        buildings: Object.entries(cache.byBuildingId).map(([id, cashflow]) => {
          return {
            id: id,
            cashflow: cashflow
          };
        })
      });
    };
  }

  getPlanetDetails (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.sendStatus(400);

      const [metrics, politics, taxes] = await Promise.all([
        this.modelEventClient.governmentMetricsForTownId(req.planet.id, 'PLANET'),
        this.modelEventClient.governmentPoliticsForTownId(req.planet.id, 'PLANET'),
        this.modelEventClient.governmentTaxesForTownId(req.planet.id, 'PLANET')
      ]);

      return res.json({
        id: req.planet.id,
        qol: metrics?.qualityOfLife,
        services: (metrics?.services ?? []).map(s => s.toJson()),
        commerce: (metrics?.commerce ?? []).map(c => c.toJson()),
        taxes: (taxes?.taxes ?? []).map(t => t.toJson()),
        population: (metrics?.population ?? []).map(p => p.toJson()),
        employment: (metrics?.employment ?? []).map(e => e.toJson()),
        housing: (metrics?.housing ?? []).map(h => h.toJson()),
        currentTerm: politics?.currentTerm?.toJson(),
        nextTerm: politics?.nextTerm?.toJson()
      });
    };
  }

  getTownDetails (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.townId) return res.sendStatus(400);

      try {
        const town: Town | undefined = this.caches.town.withPlanet(req.planet).forId(req.params.townId);
        if (!town) return res.sendStatus(404);

        const [metrics, politics, taxes] = await Promise.all([
          this.modelEventClient.governmentMetricsForTownId(req.planet.id, town.id),
          this.modelEventClient.governmentPoliticsForTownId(req.planet.id, town.id),
          this.modelEventClient.governmentTaxesForTownId(req.planet.id, town.id)
        ]);

        return res.json({
          id: req.params.townId,
          qol: metrics?.qualityOfLife,
          budget: {
            cash: town.cash
          },
          services: (metrics?.services ?? []).map(s => s.toJson()),
          commerce: (metrics?.commerce ?? []).map(c => c.toJson()),
          taxes: (taxes?.taxes ?? []).map(t => t.toJson()),
          population: (metrics?.population ?? []).map(p => p.toJson()),
          employment: (metrics?.employment ?? []).map(e => e.toJson()),
          housing: (metrics?.housing ?? []).map(h => h.toJson()),
          currentTerm: politics?.currentTerm?.toJson(),
          nextTerm: politics?.nextTerm?.toJson()
        });
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }


  getOnline (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.sendStatus(400);

      try {
        const corporationCache: CorporationCache = this.caches.corporation.withPlanet(req.planet);
        const onlineVisas: TycoonVisa[] = this.caches.tycoonVisa.forPlanetId(req.planet.id);
        return res.json(onlineVisas.map((visa: TycoonVisa) => {
          const tycoon: Tycoon | null = visa.isTycoon ? this.caches.tycoon.forId(visa.tycoonId) : null;
          const corporation: Corporation | undefined = tycoon && visa.corporationId ? corporationCache.forId(visa.corporationId) : undefined;
          const item: Record<string, string> = {
            type: visa.type
          };

          if (tycoon) {
            item.tycoonId = tycoon.id;
            item.tycoonName = tycoon.name;
          }
          if (corporation) {
            item.corporationId = corporation.id;
            item.corporationName = corporation.name;
          }

          return item;
        }));
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  getOverlay (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.sendStatus(400);

      // TODO: verify typeId is allowed, else 404

      try {
        const data: Uint8Array = new Uint8Array(20 * 20)
        // return res.send(new Buffer(data, 'binary'))
        return res.send(Buffer.from(data));
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  getRoads (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.sendStatus(400);

      try {
        const data: Uint8Array = new Uint8Array(20 * 20 * .5);
        return res.send(Buffer.from(data)); //new Buffer(data, 'binary'));
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  getRankings (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.rankingTypeId) return res.sendStatus(400);

      try {
        const corporationCache: CorporationCache = this.caches.corporation.withPlanet(req.planet);
        const rankings: Rankings | null = this.caches.rankings.withPlanet(req.planet).forTypeId(req.params.rankingTypeId);
        return res.json((rankings?.rankings ?? []).map(ranking => {
          const tycoon: Tycoon | null = this.caches.tycoon.forId(ranking.tycoonId);
          const corporation: Corporation | undefined = corporationCache.forId(ranking.corporationId);
          if (!tycoon || !corporation) return null;
          return {
            rank: ranking.rank,
            value: ranking.value,
            tycoonId: tycoon.id,
            tycoonName: tycoon.name,
            corporationId: corporation.id,
            corporationName: corporation.name
          };
        }).filter(r => !!r));
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  getTowns (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.sendStatus(400);

      try {
        const towns: Town[] = this.caches.town.withPlanet(req.planet).all() ?? [];
        return res.json(towns.map(t => t.toJson()));
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

}
