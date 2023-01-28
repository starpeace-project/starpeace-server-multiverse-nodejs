import _ from 'lodash';
import express from 'express';
import { DateTime } from 'luxon';

import GalaxyManager from '../galaxy-manager';
import ModelEventClient from '../events/model-event-client';
import { ApiCaches } from './api-factory';

import Building from '../../building/building';
import Company from '../../company/company';
import Invention from '../../company/invention';
import Town from '../../planet/town';

import Utils from '../../utils/utils';
import CompanyCache from '../../company/company-cache';

export default class CompanyApi {
  galaxyManager: GalaxyManager;
  modelEventClient: ModelEventClient;
  caches: ApiCaches;

  constructor (galaxyManager: GalaxyManager, modelEventClient: ModelEventClient, caches: ApiCaches) {
    this.galaxyManager = galaxyManager;
    this.modelEventClient = modelEventClient;
    this.caches = caches;
  }

  createCompany (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.visa || !req.visa.corporationId) return res.status(400);

      const name = _.trim(req.body.name);
      if (!name?.length) return res.status(400).json({ code: 'INVALID_NAME' });

      const seal = this.galaxyManager.metadataCoreForPlanet(req.planet.id)?.sealsById[req.body.sealId];
      if (!seal?.playable) return res.status(400).json({ code: 'INVALID_SEAL' });

      try {
        const tycoonId: string = req.visa.tycoonId;
        const companies: Company[] = this.caches.company.withPlanet(req.planet).all() ?? [];
        if (companies.filter(company => company.tycoonId == tycoonId).length > 25) return res.status(400).json({ code: 'TYCOON_LIMIT' });
        if (!companies.find(company => company.name == name)) return res.status(400).json({ code: 'NAME_CONFLICT' });

        const company: Company = await this.modelEventClient.createCompany(new Company(Utils.uuid(), req.planet.id, tycoonId, req.visa.corporationId, seal.id, name));
        if (!company) return res.status(500);
        return res.json(company.toJsonApi());
      }
      catch (err) {
        console.error(err);
        return res.status(500).json(err ?? {});
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
        console.error(err);
        return res.status(500).json(err ?? {});
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

        const completedIds: string[] = [];
        const pendingInventions: any[] = [];
        // TODO: add paging
        const inventions: Invention[] = await this.modelEventClient.listCompanyInventions(req.planet.id, company.id);
        for (let invention of _.orderBy(inventions, ['createdAt'], ['asc'])) {
          if (invention.status == 'DONE') {
            completedIds.push(invention.id);
          }
          else {
            pendingInventions.push({
              id: invention.id,
              order: pendingInventions.length,
              progress: invention.progress
            });
          }
        }

        return res.json({
          companyId: company.id,
          pendingInventions: pendingInventions,
          completedIds: completedIds
        })
      }
      catch (err) {
        console.error(err);
        return res.status(500).json(err ?? {});
      }
    };
  }

  researchInvention (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.companyId || !req.params.inventionId) return res.status(400);

      try {
        const company: Company | null = this.caches.company.withPlanet(req.planet).forId(req.params.companyId);
        if (!company) return res.status(404);
        if (!req.visa?.isTycoon || req.visa.corporationId !== company.corporationId) return res.status(403);

        const inventionMetadata: any = this.galaxyManager.metadataInventionForPlanet(req.planet.id)?.inventionsById?.[req.params.inventionId];
        if (!inventionMetadata) return res.status(404);

        const existingInvention: Invention = await this.modelEventClient.findInvention(req.planet.id, company.id, req.params.inventionId);
        if (existingInvention) return res.status(400).json({ code: 'INVENTION_CONFLICT' });

        const invention: Invention = await this.modelEventClient.startResearch(req.planet.id, new Invention(inventionMetadata.id, company.id, 'RESEARCHING', 0, 0, 0, 0, DateTime.now()));
        return res.json(invention.toJson());
      }
      catch (err) {
        console.error(err);
        return res.status(500).json(err ?? {})
      }
    };
  }

  sellInvention (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.companyId || !req.params.inventionId) return res.status(400);

      try {
        const company: Company | null = this.caches.company.withPlanet(req.planet).forId(req.params.companyId);
        if (!company) return res.status(404);
        if (!req.visa?.isTycoon || req.visa.corporationId !== company.corporationId) return res.status(403);

        const invention: Invention = await this.modelEventClient.findInvention(req.planet.id, company.id, req.params.inventionId);
        if (!invention) return res.status(404);
        if (!(invention.status == 'RESEARCHING' || invention.status == 'DONE')) return res.status(400);

        const inventionId: string = await this.modelEventClient.sellResearch(req.planet.id, company.id, req.params.inventionId);
        return res.json({ inventionId: inventionId });
      }
      catch (err) {
        console.error(err);
        return res.status(500).json(err ?? {});
      }
    };
  }

}
