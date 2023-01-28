import express from 'express';

import GalaxyManager, { CoreConfigurations } from '../galaxy-manager';


export default class MetadataApi {
  galaxyManager: GalaxyManager;

  constructor (galaxyManager: GalaxyManager) {
    this.galaxyManager = galaxyManager;
  }


  getBuildings (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.status(400);
      const buildingMetadata: any | null = this.galaxyManager.metadataBuildingForPlanet(req.planet.id);
      if (!buildingMetadata) return res.status(400);
      return res.json(buildingMetadata);
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
      const inventionMetadata: any | null = this.galaxyManager.metadataInventionForPlanet(req.planet.id);
      if (!inventionMetadata) return res.status(400);
      return res.json(inventionMetadata);
    };
  }

}
