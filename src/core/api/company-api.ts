import _ from 'lodash';
import express from 'express';
import Filter from 'bad-words';
import winston from 'winston';

import GalaxyManager from '../galaxy-manager';
import ModelEventClient from '../events/model-event-client';
import { ApiCaches } from './api-factory';

import Building from '../../building/building';
import Company from '../../company/company';
import CompanyCache from '../../company/company-cache';
import InventionSummary from '../../company/invention-summary';
import Town from '../../planet/town';


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
      if (!req.planet || !req.params.companyId) return res.status(400);

      try {
        const company: Company | null = this.caches.company.withPlanet(req.planet).forId(req.params.companyId);
        if (!company) return res.status(404);
        return res.json(company.toJsonApi());
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500).json({});
      }
    };
  }

  createCompany (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.visa || !req.visa.corporationId) return res.status(400).json({});

      const name = _.trim(req.body.name);
      if (name?.length < 3 || new Filter().isProfane(name)) return res.status(400).json({ code: 'INVALID_NAME' });

      const seal = this.galaxyManager.metadataCoreForPlanet(req.planet.id)?.sealsById[req.body.sealId];
      if (!seal?.playable) return res.status(400).json({ code: 'INVALID_SEAL' });

      try {
        const tycoonId: string = req.visa.tycoonId;
        const companies: Company[] = this.caches.company.withPlanet(req.planet).all() ?? [];
        if (companies.filter(company => company.tycoonId == tycoonId).length > 25) return res.status(400).json({ code: 'TYCOON_LIMIT' });
        if (!!companies.find(company => company.name == name)) return res.status(400).json({ code: 'NAME_CONFLICT' });

        const company: Company = await this.modelEventClient.createCompany(req.planet.id, Company.create(req.planet.id, tycoonId, req.visa.corporationId, seal.id, name));
        if (!company) return res.status(500).json({});
        return res.json(company.toJsonApi());
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500).json({});
      }
    };
  }

  getTownCompanies (): (req: express.Request, res: express.Response) => any {
    return (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.townId) return res.status(400);
      try {
        const town: Town | null = this.caches.town.withPlanet(req.planet).forId(req.params.townId);
        if (!town) return res.status(404);

        const companyCache: CompanyCache = this.caches.company.withPlanetId(req.planet.id);
        const buildings: Building[] = this.caches.building.withPlanet(req.planet).forTownId(town.id) ?? [];
        const companyIds: string[] = Array.from(new Set(buildings.map(b => b.companyId)));
        const companies: Company[] = companyIds.map(id => companyCache.forId(id)).filter(c => !!c) as Company[];
        return res.json(companies.map(c => c.toJsonApi()));
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500);
      }
    };
  }

  getInventions (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.companyId) return res.status(400);

      try {
        const company: Company | null = this.caches.company.withPlanet(req.planet).forId(req.params.companyId);
        if (!company) return res.status(404);
        if (!req.visa?.isTycoon || req.visa.corporationId !== company.corporationId) return res.status(403);

        return res.json(this.caches.inventionSummary.withPlanet(req.planet).forCompanyId(company.id).toJson());
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500);
      }
    };
  }

  researchInvention (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.companyId || !req.params.inventionId) return res.status(400).json({});

      try {
        const company: Company | null = this.caches.company.withPlanet(req.planet).forId(req.params.companyId);
        if (!company) return res.status(404).json({});
        if (!req.visa?.isTycoon || req.visa.corporationId !== company.corporationId) return res.status(403).json({});

        const inventionMetadata: any = this.galaxyManager.metadataInventionForPlanet(req.planet.id)?.definitionsById?.[req.params.inventionId];
        if (!inventionMetadata) return res.status(404).json({});

        const summary: InventionSummary = this.caches.inventionSummary.withPlanet(req.planet).forCompanyId(company.id);
        if (summary.isCompleted(req.params.inventionId) || summary.isActive(req.params.inventionId) || summary.isPending(req.params.inventionId) || summary.isCanceled(req.params.inventionId)) {
          return res.status(400).json({ code: 'INVENTION_CONFLICT' });
        }

        const updatedSummary: InventionSummary = await this.modelEventClient.startResearch(req.planet.id, company.id, inventionMetadata.id);
        return res.json(updatedSummary.toJson());
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500).json({});
      }
    };
  }

  sellInvention (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.companyId || !req.params.inventionId) return res.status(400).json({});

      try {
        const company: Company | null = this.caches.company.withPlanet(req.planet).forId(req.params.companyId);
        if (!company) return res.status(404).json({});
        if (!req.visa?.isTycoon || req.visa.corporationId !== company.corporationId) return res.status(403).json({});

        const inventionMetadata: any = this.galaxyManager.metadataInventionForPlanet(req.planet.id)?.definitionsById?.[req.params.inventionId];
        if (!inventionMetadata) return res.status(404).json({});

        const summary: InventionSummary = this.caches.inventionSummary.withPlanet(req.planet).forCompanyId(company.id);
        if (!summary.isCompleted(req.params.inventionId) && !summary.isActive(req.params.inventionId) && !summary.isPending(req.params.inventionId)) {
          return res.status(400).json({ code: 'INVENTION_CONFLICT' });
        }

        const updatedSummary: InventionSummary = await this.modelEventClient.cancelResearch(req.planet.id, company.id, req.params.inventionId);
        return res.json(updatedSummary.toJson());
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500).json({});
      }
    };
  }

}
