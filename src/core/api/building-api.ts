import _ from 'lodash';
import express from 'express';
import winston from 'winston';

import { BuildingDefinition } from '@starpeace/starpeace-assets-types';

import GalaxyManager from '../galaxy-manager.js';
import ModelEventClient from '../events/model-event-client.js';
import { type ApiCaches } from './api-factory.js';

import Building from '../../building/building.js';
import BuildingLabor from '../../building/building-labor.js';
import BuildingProduct from '../../building/building-product.js';
import Company from '../../company/company.js';
import Town from '../../planet/town.js';


export default class BuildingApi {
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

  getBuildings (): (req: express.Request, res: express.Response) => any {
    return (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.query.chunkX || !req.query.chunkY) return res.status(400);
      try {
        const chunkX: number = _.parseInt(req.query.chunkX as string) ?? 0;
        const chunkY: number = _.parseInt(req.query.chunkY as string) ?? 0;
        // TODO: validate or verify chunk params?

        const buildings: Building[] = this.caches.building.withPlanet(req.planet).forChunk(chunkX, chunkY) ?? [];
        return res.json(buildings.map((b) => b.toJson()));
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500);
      }
    };
  }

  getBuilding (): (req: express.Request, res: express.Response) => any {
    return (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.buildingId) return res.status(400);
      try {
        const building: Building | null = this.caches.building.withPlanet(req.planet).forId(req.params.buildingId);
        if (!building) return res.status(404);
        return res.json(building.toJson());
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500);
      }
    };
  }

  getBuildingDetails (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.buildingId) return res.status(400);
      try {
        const building: Building | null = this.caches.building.withPlanet(req.planet).forId(req.params.buildingId);
        if (!building) return res.status(404);

        const labors: BuildingLabor[] = await this.modelEventClient.listBuildingLabors(req.planet.id, building.id);
        const products: BuildingProduct[] = await this.modelEventClient.listBuildingProducts(req.planet.id, building.id);

        return res.json({
          id: req.params.buildingId,
          labors: labors.map((l) => {
            return {
              resourceId: l.resourceId,
              price: l.price,
              maxVelocity: l.maxVelocity,
              mostRecentVelocity: 0,
              quality: 0
            };
          }),
          products: products.map((p) => {
            return {
              resourceId: p.resourceId,
              price: p.price,
              totalVelocity: 0,
              quality: p.quality,
              connections: []
            };
          }),
        });
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500);
      }
    };
  }

  createBuilding (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.visa || !req.visa.corporationId || !req.body.companyId || !req.body.definitionId) return res.status(400).json({});

      const name = _.trim(req.body.name);
      if (!name.length || !_.isNumber(req.body.mapX) || !_.isNumber(req.body.mapY)) return res.status(400).json({});

      try {
        const mapX = parseInt(req.body.mapX);
        const mapY = parseInt(req.body.mapY);

        const company: Company | null = this.caches.company.withPlanet(req.planet).forId(req.body.companyId);
        if (!company) return res.status(404).json({});

        const definition: BuildingDefinition | undefined = this.galaxyManager.metadataBuildingForPlanet(req.planet.id)?.definitions?.find((b: any) => b.id === req.body.definitionId);
        if (!definition) return res.status(400).json({});

        const town = this.caches.map.withPlanet(req.planet).findTown(mapX, mapY);
        if (!town) return res.status(400).json({});

        const building: Building = await this.modelEventClient.constructBuilding(req.planet.id, req.visa.tycoonId, req.visa.corporationId, company.id, definition.id, town.id, name, mapX, mapY);

        if (!building) return res.status(404).json({});
        return res.json(building.toJson());
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500).json({});
      }
    };
  }


  getCompanyBuildings (): (req: express.Request, res: express.Response) => any {
    return (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.companyId) return res.status(400);
      try {
        const company: Company | null = this.caches.company.withPlanet(req.planet).forId(req.params.companyId);
        if (!company) return res.status(404);
        const buildings: Building[] = this.caches.building.withPlanet(req.planet).forCompanyId(req.params.companyId) ?? [];
        return res.json(buildings.map((b) => b.toJson()));
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500);
      }
    };
  }

  getTownBuildings (): (req: express.Request, res: express.Response) => any {
    return (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.status(400).json({});
      try {
        const town: Town | null = this.caches.town.withPlanet(req.planet).forId(req.params.townId);
        if (!town) return res.status(404).json({});

        const buildingCache = this.caches.building.withPlanet(req.planet);
        const buildings: Building[] = buildingCache.forTownId(town.id) ?? [];

        return res.json(buildings.filter(b => {
          const definition = buildingCache.buildingConfigurations.definitionById[b.definitionId];
          return definition &&
              (!req.query.industryCategoryId || definition.industryCategoryId === req.query.industryCategoryId) &&
              (!req.query.industryTypeId || definition.industryTypeId === req.query.industryTypeId);
        }).map(b => b.toJson()));
      }
      catch (err) {
        this.logger.error(err);
        return res.status(500).json({});
      }
    };
  }

}
