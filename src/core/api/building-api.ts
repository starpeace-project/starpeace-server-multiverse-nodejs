import _ from 'lodash';
import express from 'express';

import GalaxyManager from '../galaxy-manager';
import ModelEventClient from '../events/model-event-client';
import { ApiCaches } from './api-factory';

import Building from '../../building/building';
import Company from '../../company/company';
import Town from '../../planet/town';

export default class BuildingApi {
  galaxyManager: GalaxyManager;
  modelEventClient: ModelEventClient;
  caches: ApiCaches;

  constructor (galaxyManager: GalaxyManager, modelEventClient: ModelEventClient, caches: ApiCaches) {
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
        console.error(err);
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
        console.error(err);
        return res.status(500);
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
        console.error(err);
        return res.status(500);
      }
    };
  }

  getTownBuildings (): (req: express.Request, res: express.Response) => any {
    return (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.status(400);
      try {
        const town: Town | null = this.caches.town.withPlanet(req.planet).forId(req.params.townId);
        if (!town) return res.status(404);
        const buildings: Building[] = this.caches.building.withPlanet(req.planet).forTownId(town.id) ?? [];
        return res.json(buildings.map((b) => b.toJson()));
      }
      catch (err) {
        console.error(err);
        return res.status(500);
      }
    };
  }

}
