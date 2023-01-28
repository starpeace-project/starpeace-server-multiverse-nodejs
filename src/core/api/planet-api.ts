import express from 'express';

import GalaxyManager, { PlanetMetadata } from '../galaxy-manager';
import ModelEventClient from '../events/model-event-client';
import { ApiCaches } from './api-factory';

import Corporation from '../../corporation/corporation';
import Rankings from '../../corporation/rankings';
import Tycoon from '../../tycoon/tycoon';
import TycoonVisa from '../../tycoon/tycoon-visa';
import Town from '../../planet/town';

import Utils from '../../utils/utils';
import CorporationCache from '../../corporation/corporation-cache';

const FIFTEEN_MINUTES = 900000;

export default class PlanetApi {
  galaxyManager: GalaxyManager;
  modelEventClient: ModelEventClient;
  caches: ApiCaches;

  constructor (galaxyManager: GalaxyManager, modelEventClient: ModelEventClient, caches: ApiCaches) {
    this.galaxyManager = galaxyManager;
    this.modelEventClient = modelEventClient;
    this.caches = caches;
  }

  registerVisa (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      const isVisitor: boolean = req.body.identityType == 'visitor';
      const isTycoon: boolean = req.body.identityType == 'tycoon';

      if (!isVisitor && !isTycoon) return res.status(400);
      if (isVisitor && !this.galaxyManager.galaxyMetadata.visitorEnabled) return res.status(400);
      if (isTycoon && !this.galaxyManager.galaxyMetadata.tycoonEnabled) return res.status(400);
      if (isTycoon && !req.isAuthenticated()) return res.status(401);
      if (!req.planet) return res.status(400);

      try {
        const tycoonId: string = isTycoon ? (<Tycoon> req.user).id : 'random-visitor';
        const corporation: Corporation | null = isTycoon ? this.caches.corporation.withPlanet(req.planet).forTycoonId(tycoonId) : null;

        const towns: Town[] = this.caches.town.withPlanet(req.planet).all() ?? [];
        const town: Town | null = towns.length ? towns[Math.floor(Math.random() * towns.length)] : null;
        // TODO: initialize to headquarters (or save to tycoon planet-specific metadata?)
        const viewX: number = town?.mapX ?? 500;
        const viewY: number = town?.mapY ?? 500;

        const visa: TycoonVisa = await this.modelEventClient.saveVisa(new TycoonVisa(Utils.uuid(), req.body.identityType, tycoonId, req.planet.id, corporation?.id, new Date().getTime() + FIFTEEN_MINUTES, viewX, viewY));
        if (!visa) return res.status(500);
        return res.json(visa.toJson());
      }
      catch (err) {
        console.error(err);
        return res.status(500).json(err ?? {});
      }
    };
  }

  verifyVisa (requireTycoon: boolean): (req: express.Request, res: express.Response, next: any) => any {
    return async (req: express.Request, res: express.Response, next: any) => {
      try {
        const visaId = req.header('VisaId');
        if (!visaId) return res.status(401).json({message: 'MISSING_VISA'});

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
        console.error(err);
        return res.status(500).json(err ?? {});
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
        console.error(err);
        return res.status(500).json(err ?? {});
      }
    };
  }

  getPlanetDetails (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.status(400);

      // FIXME: TODO: hookup details
      return res.json({
        id: req.planet.id,
        qol: 0,
        services: [],
        commerce: [],
        taxes: [],
        population: [],
        employment: [],
        housing: [],
        currentTerm: { },
        nextTerm: { }
      });
    };
  }

  getTownDetails (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.townId) return res.status(400);

      try {
        const town: Town | null = this.caches.town.withPlanet(req.planet).forId(req.params.townId);
        if (!town) return res.status(404);

        // FIXME: TODO: hookup details
        return res.json({
          id: req.params.townId,
          qol: 0,
          services: [],
          commerce: [],
          taxes: [],
          population: [],
          employment: [],
          housing: [],
          currentTerm: { },
          nextTerm: { }
        });
      }
      catch (err) {
        console.error(err);
        return res.status(500).json(err ?? {});
      }
    };
  }


  getOnline (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.status(400);

      try {
        const corporationCache: CorporationCache = this.caches.corporation.withPlanet(req.planet);
        const onlineVisas: TycoonVisa[] = this.caches.tycoonVisa.forPlanetId(req.planet.id);
        return res.json(onlineVisas.map((visa: TycoonVisa) => {
          const tycoon: Tycoon | null = visa.isTycoon ? this.caches.tycoon.forId(visa.tycoonId) : null;
          const corporation: Corporation | null = tycoon && visa.corporationId ? corporationCache.forId(visa.corporationId) : null;
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
        console.error(err);
        return res.status(500).json(err ?? {});
      }
    };
  }

  getOverlay (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.status(400);

      // TODO: verify typeId is allowed, else 404

      try {
        const data: Uint8Array = new Uint8Array(20 * 20)
        // return res.send(new Buffer(data, 'binary'))
        return res.send(Buffer.from(data));
      }
      catch (err) {
        console.error(err);
        return res.status(500).json(err ?? {});
      }
    };
  }

  getRoads (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.status(400);

      try {
        const data: Uint8Array = new Uint8Array(20 * 20 * .5);
        return res.send(Buffer.from(data)); //new Buffer(data, 'binary'));
      }
      catch (err) {
        console.error(err);
        return res.status(500).json(err ?? {});
      }
    };
  }

  getRankings (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.rankingTypeId) return res.status(400);

      try {
        const corporationCache: CorporationCache = this.caches.corporation.withPlanet(req.planet);
        const rankings: Rankings = this.caches.rankings.withPlanet(req.planet).forTypeId(req.params.rankingTypeId);
        return res.json(rankings.rankings.map(ranking => {
          const tycoon: Tycoon | null = this.caches.tycoon.forId(ranking.tycoonId);
          const corporation: Corporation | null = corporationCache.forId(ranking.corporationId);
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
        console.error(err);
        return res.status(500).json(err ?? {});
      }
    };
  }

  getTowns (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.status(400);

      try {
        const towns: Town[] = this.caches.town.withPlanet(req.planet).all() ?? [];
        return res.json(towns.map(t => t.toJson()));
      }
      catch (err) {
        console.error(err);
        return res.status(500).json(err ?? {});
      }
    };
  }

}
