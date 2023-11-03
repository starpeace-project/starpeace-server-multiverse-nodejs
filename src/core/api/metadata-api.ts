import express from 'express';
import winston from 'winston';

import GalaxyManager, { BuildingConfigurations, CoreConfigurations, InventionConfigurations } from '../galaxy-manager.js';


export default class MetadataApi {
  logger: winston.Logger;
  galaxyManager: GalaxyManager;

  constructor (logger: winston.Logger, galaxyManager: GalaxyManager) {
    this.logger = logger;
    this.galaxyManager = galaxyManager;
  }


  getBuildings (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.status(400);
      const buildingMetadata: BuildingConfigurations | null = this.galaxyManager.metadataBuildingForPlanet(req.planet.id);
      if (!buildingMetadata) return res.status(400);
      return res.json(buildingMetadata.toJson());
    };
  }

  getCore (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.status(400);
      const coreMetadata: CoreConfigurations | null = this.galaxyManager.metadataCoreForPlanet(req.planet.id);
      if (!coreMetadata) return res.status(400);
      return res.json(coreMetadata.toJson());
    };
  }

  getInventions (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.status(400);
      const inventionMetadata: InventionConfigurations | null = this.galaxyManager.metadataInventionForPlanet(req.planet.id);
      if (!inventionMetadata) return res.status(400);
      return res.json(inventionMetadata.toJson());
    };
  }

}
