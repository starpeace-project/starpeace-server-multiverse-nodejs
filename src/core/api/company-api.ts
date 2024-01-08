import _ from 'lodash';
import express from 'express';
import Filter from 'bad-words';
import winston from 'winston';

import GalaxyManager from '../galaxy-manager.js';
import ModelEventClient from '../events/model-event-client.js';
import { type ApiCaches } from './api-factory.js';

import Building from '../../building/building.js';
import Company from '../../company/company.js';
import CompanyCache from '../../company/company-cache.js';
import InventionSummary from '../../company/invention-summary.js';
import Town from '../../planet/town.js';


export default class CompanyApi {
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

  getCompany (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.companyId) return res.sendStatus(400);

      try {
        const company: Company | undefined = this.caches.company.withPlanet(req.planet).forId(req.params.companyId);
        if (!company) return res.sendStatus(404);
        return res.json(company.toJson());
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  createCompany (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.visa || !req.visa.corporationId) return res.sendStatus(400);

      const name = _.trim(req.body.name);
      if (name?.length < 3 || new Filter().isProfane(name)) return res.status(400).json({ code: 'INVALID_NAME' });

      const seal = this.galaxyManager.metadataCoreForPlanet(req.planet.id)?.sealById[req.body.sealId];
      if (!seal?.playable) return res.status(400).json({ code: 'INVALID_SEAL' });

      try {
        const tycoonId: string = req.visa.tycoonId;
        const companies: Company[] = this.caches.company.withPlanet(req.planet).all() ?? [];
        if (companies.filter(company => company.tycoonId == tycoonId).length > 25) return res.status(400).json({ code: 'TYCOON_LIMIT' });
        if (!!companies.find(company => company.name == name)) return res.status(400).json({ code: 'NAME_CONFLICT' });

        const company: Company = await this.modelEventClient.createCompany(req.planet.id, Company.create(tycoonId, req.visa.corporationId, seal.id, name));
        if (!company) return res.sendStatus(500);
        return res.json(company.toJson());
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  getTownCompanies (): (req: express.Request, res: express.Response) => any {
    return (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.townId) return res.sendStatus(400);
      try {
        const town: Town | undefined = this.caches.town.withPlanet(req.planet).forId(req.params.townId);
        if (!town) return res.sendStatus(404);

        const companyCache: CompanyCache = this.caches.company.withPlanetId(req.planet.id);
        const buildings: Building[] = this.caches.building.withPlanet(req.planet).forTownId(town.id) ?? [];
        const companyIds: string[] = Array.from(new Set(buildings.map(b => b.companyId)));
        const companies: Company[] = companyIds.map(id => companyCache.forId(id)).filter(c => !!c) as Company[];
        return res.json(companies.map(c => c.toJson()));
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  getInventions (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.companyId) return res.sendStatus(400);

      try {
        const company: Company | undefined = this.caches.company.withPlanet(req.planet).forId(req.params.companyId);
        if (!company) return res.sendStatus(404);
        if (!req.visa?.isTycoon || req.visa.corporationId !== company.corporationId) return res.sendStatus(403);

        return res.json(this.caches.inventionSummary.withPlanet(req.planet).forCompanyId(company.id).toJson());
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  researchInvention (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.companyId || !req.params.inventionId) return res.sendStatus(400);

      try {
        const company: Company | undefined = this.caches.company.withPlanet(req.planet).forId(req.params.companyId);
        if (!company) return res.sendStatus(404);
        if (!req.visa?.isTycoon || req.visa.corporationId !== company.corporationId) return res.sendStatus(403);

        const inventionMetadata: any = this.galaxyManager.metadataInventionForPlanet(req.planet.id)?.definitionsById?.[req.params.inventionId];
        if (!inventionMetadata) return res.sendStatus(404);

        const summary: InventionSummary = this.caches.inventionSummary.withPlanet(req.planet).forCompanyId(company.id);
        if (summary.isCompleted(req.params.inventionId) || summary.isActive(req.params.inventionId) || summary.isPending(req.params.inventionId) || summary.isCanceled(req.params.inventionId)) {
          return res.status(400).json({ code: 'INVENTION_CONFLICT' });
        }

        const updatedSummary: InventionSummary = await this.modelEventClient.startResearch(req.planet.id, company.id, inventionMetadata.id);
        return res.json(updatedSummary.toJson());
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  sellInvention (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.companyId || !req.params.inventionId) return res.sendStatus(400);

      try {
        const company: Company | undefined = this.caches.company.withPlanet(req.planet).forId(req.params.companyId);
        if (!company) return res.sendStatus(404);
        if (!req.visa?.isTycoon || req.visa.corporationId !== company.corporationId) return res.sendStatus(403);

        const inventionMetadata: any = this.galaxyManager.metadataInventionForPlanet(req.planet.id)?.definitionsById?.[req.params.inventionId];
        if (!inventionMetadata) return res.sendStatus(404);

        const summary: InventionSummary = this.caches.inventionSummary.withPlanet(req.planet).forCompanyId(company.id);
        if (!summary.isCompleted(req.params.inventionId) && !summary.isActive(req.params.inventionId) && !summary.isPending(req.params.inventionId)) {
          return res.status(400).json({ code: 'INVENTION_CONFLICT' });
        }

        const updatedSummary: InventionSummary = await this.modelEventClient.cancelResearch(req.planet.id, company.id, req.params.inventionId);
        return res.json(updatedSummary.toJson());
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

}
