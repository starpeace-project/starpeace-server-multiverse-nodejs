import _ from 'lodash';
import express from 'express';
import Filter from 'bad-words';
import { DateTime } from 'luxon';
import winston from 'winston';

import GalaxyManager, { CoreConfigurations, PlanetMetadata } from '../galaxy-manager';
import ModelEventClient from '../events/model-event-client';
import { ApiCaches } from './api-factory';

import Bookmark from '../../corporation/bookmark';
import Company from '../../company/company';
import Corporation from '../../corporation/corporation';
import Mail from '../../corporation/mail';
import MailEntity from '../../corporation/mail-entity';
import Tycoon from '../../tycoon/tycoon';

import Utils from '../../utils/utils';
import CompanyCache from '../../company/company-cache';

export default class CorporationApi {
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

  getCorporation (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.corporationId) return res.status(400);

      try {
        const corporation: Corporation | null = this.caches.corporation.withPlanet(req.planet).forId(req.params.corporationId);
        if (!corporation) return res.status(404);

        const companyCache: CompanyCache = this.caches.company.withPlanet(req.planet);
        const companies: Company[] = Array.from(corporation.companyIds).map(id => companyCache.forId(id)).filter(c => !!c) as Company[];
        return res.json(corporation.toJsonApi(companies));
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500);
      }
    };
  }

  getPlanetCorporations (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.status(400);

      try {
        // TODO: add paging
        const corporations: Corporation[] = this.caches.corporation.withPlanet(req.planet).all();

        const companyCache: CompanyCache = this.caches.company.withPlanet(req.planet);
        return res.json(corporations.map((corporation) => {
          const companies: Company[] = Array.from(corporation.companyIds).map(id => companyCache.forId(id)).filter(c => !!c) as Company[];
          return corporation.toJsonApi(companies);
        }));
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
        const corporations: Corporation[] = (this.caches.corporation.withPlanet(req.planet).all() ?? []).filter(corporation => {
          const name = corporation.name.toLowerCase();
          return req.query.startsWithQuery ? name.startsWith(query) : name.includes(query);
        });

        return res.json(corporations.map(corporation => {
          const tycoon: Tycoon | null = this.caches.tycoon.forId(corporation.tycoonId);
          return !tycoon ? null : {
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

  createCorporation (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.visa) return res.status(400);

      const name: string = _.trim(req.body.name);
      if (name?.length < 3 || new Filter().isProfane(name)) return res.status(400).json({ code: 'INVALID_NAME' });

      try {
        const tycoonId: string = req.visa?.tycoonId;
        const corporations: Corporation[] = this.caches.corporation.withPlanet(req.planet).all() ?? [];
        if (corporations.find(corporation => corporation.tycoonId == tycoonId)) return res.status(400).json({ code: 'TYCOON_LIMIT' });
        if (corporations.find(corporation => corporation.name == name)) return res.status(400).json({ code: 'NAME_CONFLICT' });

        const planetMetadata: PlanetMetadata | null = this.galaxyManager.forPlanet(req.planet.id);
        const coreMetadata: CoreConfigurations | null = this.galaxyManager.metadataCoreForPlanet(req.planet.id);
        if (!planetMetadata || !coreMetadata || !coreMetadata.lowestLevel) {
          this.logger.error(`Unable to find metadata for planet #{req.planet.id}`);
          return res.status(500);
        }

        const corporation: Corporation = await this.modelEventClient.createCorporation(req.planet.id, new Corporation(Utils.uuid(), tycoonId, req.planet.id, name, coreMetadata.lowestLevel.id, null, 0, new Set(), planetMetadata.corporationInitialCash));
        await this.modelEventClient.saveVisa(req.visa.withCorporationId(corporation.id));

        return res.json(corporation.toJsonApi([]));
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500);
      }
    };
  }


  getBookmarks (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.corporationId) return res.status(400);
      if (!req.visa?.isTycoon || req.visa.corporationId !== req.params.corporationId) return res.status(403);

      try {
        const corporation: Corporation | null = this.caches.corporation.withPlanet(req.planet).forId(req.params.corporationId);
        if (!corporation) return res.status(404);

        // TODO: add paging
        const bookmarks: Bookmark[] = await this.modelEventClient.bookmarksForCorporation(req.planet.id, corporation.id);
        return res.json(bookmarks.map(b => b.toJson()));
      }
      catch (err) {
        console.error(err);
        return res.status(500);
      }
    };
  }

  createBookmark (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.corporationId) return res.status(400);
      if (!req.visa?.isTycoon || req.visa.corporationId !== req.params.corporationId) return res.status(403);
      if (req.body.type !== 'FOLDER' && req.body.type !== 'LOCATION' && req.body.type !== 'BUILDING') return res.status(400);
      if ((req.body.type == 'LOCATION' || req.body.type == 'BUILDING') && (!req.body.mapX || !req.body.mapY)) return res.status(400);
      if (req.body.type == 'BUILDING' && !req.body.buildingId?.length) return res.status(400);
      if (!req.body.parentId?.length || !_.isNumber(req.body.order)) return res.status(400);

      try {
        const corporation: Corporation | null = this.caches.corporation.withPlanet(req.planet).forId(req.params.corporationId);
        if (!corporation) return res.status(404);

        const bookmarks: Bookmark[] = await this.modelEventClient.saveBookmarks(req.planet.id, [new Bookmark(Utils.uuid(), corporation.id, req.body.type, req.body.parentId, req.body.order, req.body.name, req.body.mapX, req.body.mapY, req.body.buildingId)]);
        if (bookmarks.length < 1) return res.status(500);

        return res.json(bookmarks[0].toJson());
      }
      catch (err) {
        console.error(err);
        return res.status(500);
      }
    };
  }

  updateBookmarks (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.corporationId) return res.status(400);
      if (!req.body.deltas?.length) return res.status(400);
      if (!req.visa?.isTycoon || req.visa.corporationId !== req.params.corporationId) return res.status(403);

      try {
        const corporation: Corporation | null = this.caches.corporation.withPlanet(req.planet).forId(req.params.corporationId);
        if (!corporation) return res.status(404);

        // TODO: add paging, and/or improve approach
        const bookmarks: Bookmark[] = await this.modelEventClient.bookmarksForCorporation(req.planet.id, corporation.id);
        const bookmarksById: Record<string, Bookmark> = _.keyBy(bookmarks, 'id');

        const toSave: Bookmark[] = req.body.deltas.map((delta: any) => {
          if (!delta.id || !bookmarksById[delta.id]) return null;
          if (delta.parentId) bookmarksById[delta.id].parentId = delta.parentId;
          if (!_.isNil(delta.order)) bookmarksById[delta.id].order = delta.order;
          if (delta.name) bookmarksById[delta.id].name = delta.name;
          if (delta.mapX) bookmarksById[delta.id].mapX = delta.mapX;
          if (delta.mapY) bookmarksById[delta.id].mapY = delta.mapY;
          if (delta.buildingId) bookmarksById[delta.id].buildingId = delta.buildingId;
          return bookmarksById[delta.id];
        }).filter((b: Bookmark) => !!b) as Bookmark[];

        if (!toSave.length) return res.status(400);

        const savedBookmarks: Bookmark[] = await this.modelEventClient.saveBookmarks(req.planet.id, toSave);
        return res.json(savedBookmarks.map(b => b.toJson()));
      }
      catch (err) {
        console.error(err);
        return res.status(500);
      }
    };
  }

  getMail (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.corporationId) return res.status(400);
      if (!req.visa?.isTycoon || req.visa.corporationId !== req.params.corporationId) return res.status(403);

      try {
        const corporation: Corporation | null = this.caches.corporation.withPlanet(req.planet).forId(req.params.corporationId);
        if (!corporation) return res.status(404);

        // TODO: add paging
        const mails: Mail[] = await this.modelEventClient.mailForCorporation(req.planet.id, corporation.id);
        return res.json(mails.map(m => m.toJson()));
      }
      catch (err) {
        console.error(err);
        return res.status(500);
      }
    };
  }

  sendMail (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.corporationId) return res.status(400);
      if (!req.visa?.isTycoon || req.visa.corporationId !== req.params.corporationId) return res.status(403);

      const planetId: string = req.planet.id;
      const subject: string = _.trim(req.body.subject);
      const body: string = _.trim(req.body.body);
      if (!subject.length || !body.length) return res.status(400);

      try {
        const sourceCorporation: Corporation | null = this.caches.corporation.withPlanet(req.planet).forId(req.params.corporationId);
        if (!sourceCorporation) return res.status(404);
        const sourceTycoon: Tycoon | null = this.caches.tycoon.forId(sourceCorporation.tycoonId);
        if (!sourceTycoon) return res.status(404);

        const sentAt: DateTime = DateTime.utc();
        const planetSentAt: DateTime = this.caches.planet.withPlanet(req.planet).planet.time ?? sentAt;

        const targetTycoons: Tycoon[] = [];
        const tycoonCorporations: Record<string, Corporation> = {};
        const undeliverableNames: string[] = [];

        const targetNames: string[] = _.trim(req.body.to).split(';').map(t => _.toLower(_.trim(t)));
        for (let tycoonName of _.uniq(targetNames)) {
          const tycoon: Tycoon | undefined = this.caches.tycoon.all().find(t => t.name.toLowerCase() == tycoonName);
          const corporation: Corporation | null = !tycoon ? null : this.caches.corporation.withPlanet(req.planet).forTycoonId(tycoon.id);

          if (!tycoon || !corporation) {
            undeliverableNames.push(tycoonName);
          }
          else {
            targetTycoons.push(tycoon);
            tycoonCorporations[tycoon.id] = corporation;
          }
        }

        if (!targetTycoons.length && !undeliverableNames.length) return res.status(400);

        const tasks = [];
        if (targetTycoons.length) {
          tasks.push(...targetTycoons.map(t => {
            const targetCorporation: Corporation | null = tycoonCorporations[t.id];
            if (!targetCorporation) return null;
            return this.modelEventClient.sendMail(planetId, new Mail(Utils.uuid(), targetCorporation.id, false, sentAt, planetSentAt, new MailEntity(sourceTycoon.id, sourceTycoon.name), targetTycoons.map(t => new MailEntity(t.id, t.name)), subject, body));
          }).filter(t => !!t));
        }

        if (undeliverableNames.length) {
          tasks.push(this.modelEventClient.sendMail(planetId, new Mail(Utils.uuid(), sourceCorporation.id, false, sentAt, planetSentAt, new MailEntity('ifel', 'IFEL'), [sourceTycoon].map(t => new MailEntity(t.id, t.name)), `Mail Undeliverable: ${subject}`, `Unable to deliver mail to ${undeliverableNames.join(', ')}`)));
        }

        await Promise.all(tasks);
        return res.json({});
      }
      catch (err) {
        console.error(err);
        return res.status(500);
      }
    };
  }

  markMailRead (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.corporationId || !req.params.mailId) return res.status(400);
      if (!req.visa?.isTycoon || req.visa.corporationId !== req.params.corporationId) return res.status(403);

      try {
        const corporation: Corporation | null = this.caches.corporation.withPlanet(req.planet).forId(req.params.corporationId);
        if (!corporation) return res.status(404);

        const mailId: string = await this.modelEventClient.markReadMail(req.planet.id, req.params.mailId);
        if (mailId !== req.params.mailId) {
          return res.status(500);
        }
        return res.json({});
      }
      catch (err) {
        console.error(err);
        return res.status(500);
      }
    };
  }

  deleteMail (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.corporationId || !req.params.mailId) return res.status(400);
      if (!req.visa?.isTycoon || req.visa.corporationId !== req.params.corporationId) return res.status(403);

      try {
        const mailId: string = await this.modelEventClient.deleteMail(req.planet.id, req.params.mailId);
        if (mailId !== req.params.mailId) {
          return res.status(500);
        }
        return res.json({});
      }
      catch (err) {
        console.error(err);
        return res.status(500);
      }
    };
  }

}
