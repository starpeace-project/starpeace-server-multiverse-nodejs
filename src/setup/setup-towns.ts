import fs from 'fs-extra';
import { DateTime } from 'luxon';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import { BuildingImageDefinition, TownhallDefinition, TradeCenterDefinition } from '@starpeace/starpeace-assets-types';

import Building from "../building/building.js";
import BuildingProduct from '../building/building-product.js';
import BuildingLabor from '../building/building-labor.js';
import Town from "../planet/town.js";
import Utils from "../utils/utils.js";

import { type SetupConfigurations } from '../setup.js';
import { type SetupPlanetStores } from './setup-planet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SEAL_TOWN_MAPPINGS: Record<string, any> = {
  'DIS': {
    townhall: 'dis.townhall',
    tradecenter: 'dis.tradecenter'
  },
  'MKO': {
    townhall: 'mko.townhall',
    tradecenter: 'mko.tradecenter'
  },
  'MOAB': {
    townhall: 'moab.townhall',
    tradecenter: 'moab.tradecenter'
  },
  'PGI': {
    townhall: 'pgi.townhall',
    tradecenter: 'pgi.tradecenter'
  }
};

export default class SetupTowns {
  stores: SetupPlanetStores;
  configurations: SetupConfigurations;
  seed: number;

  constructor (stores: SetupPlanetStores, configurations: SetupConfigurations, seed: number) {
    this.stores = stores;
    this.configurations = configurations;
    this.seed = seed ?? 0;
  }

  static planBuilding (seed: number, townhallPosition: number, townhallImage: BuildingImageDefinition, buildingPosition: number, buildingImage: BuildingImageDefinition) {
    const townhallDeltaX = townhallPosition == 1 || townhallPosition == 2;
    const townhallDeltaY = townhallPosition == 2 || townhallPosition == 3;

    const buildingDeltaX = buildingPosition == 1 || buildingPosition == 2;
    const buildingDeltaY = buildingPosition == 2 || buildingPosition == 3;

    let offsetX = 0;
    let offsetY = 0;

    if (townhallPosition == buildingPosition) {
      if (seed) {
        offsetX += townhallDeltaX ? buildingImage.tileWidth : -townhallImage.tileWidth;
      }
      else {
        offsetY += townhallDeltaY ? buildingImage.tileHeight : -townhallImage.tileHeight;
      }
    }
    else {
      if (townhallDeltaX && !buildingDeltaX) {
        offsetX += -1; // road
        offsetX += -townhallImage.tileWidth;
      }
      else if (!townhallDeltaX && buildingDeltaX) {
        offsetX += buildingImage.tileWidth;
        offsetX += 1; // road
      }

      if (townhallDeltaY && !buildingDeltaY) {
        offsetY += -1; // road
        offsetY += -townhallImage.tileHeight;
      }
      else if (!townhallDeltaY && buildingDeltaY) {
        offsetY += 1; // road
        offsetY += buildingImage.tileHeight;
      }
    }

    return [offsetX, offsetY];
  }


  planLayout (townhallImage: any, tradecenterImage: any, portalImage: any) {
    const townhallPosition = Math.floor(Math.random() * 4);
    const tradecenterPosition = Math.floor(Math.random() * 4);
    let portalPosition = Math.floor(Math.random() * 3);
    portalPosition = portalPosition + (portalPosition < tradecenterPosition ? 0 : 1);

    return {
      townhall: [0, 0],
      tradecenter: SetupTowns.planBuilding(this.seed, townhallPosition, townhallImage, tradecenterPosition, tradecenterImage),
      portal: SetupTowns.planBuilding(this.seed, townhallPosition, townhallImage, portalPosition, portalImage)
    };
  }

  async export (planetId: string, mapId: string) {
    const simulationTime: DateTime | undefined = (await this.stores.planet.get())?.time;
    if (!simulationTime) throw new Error('Unable to determine planet time');
    const towns: Town[] = await this.stores.town.all();

    if (!towns?.length) {
      console.log(`Configuring towns on planet ${planetId} with map ${mapId}`);
      const configPath = path.join(__dirname, `../../../node_modules/@starpeace/starpeace-assets/assets/maps/${mapId}.json`);
      if (!fs.existsSync(configPath)) throw `Unable to find map ${mapId} configuration`;

      const portalBuilding = this.configurations.building.definitions['generic.portal'];
      const portalImage = portalBuilding ? this.configurations.building.images[portalBuilding.imageId] : null;
      if (!portalBuilding || !portalImage) throw "Unable to find portal building or image";

      const config = JSON.parse(fs.readFileSync(configPath).toString());
      for (let townConfig of config.towns) {
        const mapping = SEAL_TOWN_MAPPINGS[townConfig.sealId];
        if (!mapping) throw `Unable to find town mapping for seal ${townConfig.sealId}`;

        const townhallBuilding = this.configurations.building.definitions[mapping.townhall];
        const tradecenterBuilding = this.configurations.building.definitions[mapping.tradecenter];

        const townhallDefinition = this.configurations.building.simulations[mapping.townhall] as TownhallDefinition;
        const tradecenterDefinition = this.configurations.building.simulations[mapping.tradecenter] as TradeCenterDefinition;

        const townhallImage = this.configurations.building.images[townhallBuilding.imageId];
        const tradecenterImage = this.configurations.building.images[tradecenterBuilding.imageId];

        if (!townhallBuilding || !townhallImage) throw `Unable to find townhall building or image for seal ${townConfig.sealId}`;
        if (!tradecenterBuilding || !tradecenterImage) throw `Unable to find tradecenter building or image for seal ${townConfig.sealId}`;

        const layout = this.planLayout(townhallImage, tradecenterImage, portalImage);

        const townX = 1000 - townConfig.mapY;
        const townY = 1000 - townConfig.mapX;

        const townId = Utils.uuid();
        const townhall = new Building(Utils.uuid(), 'IFEL', 'IFEL', 'IFEL', townhallBuilding.id, townId, null, townX + layout.townhall[0], townY + layout.townhall[1], 0, simulationTime, simulationTime);
        const tradecenter = new Building(Utils.uuid(), 'IFEL', 'IFEL', 'IFEL', tradecenterBuilding.id, townId, null, townX + layout.tradecenter[0], townY + layout.tradecenter[1], 0, simulationTime, simulationTime);
        const portal = new Building(Utils.uuid(), 'IFEL', 'IFEL', 'IFEL', portalBuilding.id, townId, null, townX + layout.portal[0], townY + layout.portal[1], 0, simulationTime, simulationTime);

        const town = new Town(
          townId,
          townConfig.name,
          townConfig.sealId,
          townConfig.color,
          townhall.id,
          townhall.mapX,
          townhall.mapY
        );

        this.stores.town.set(town);
        console.log(`Saved town ${town.name} to database`);

        this.stores.building.set(townhall);
        for (const labor of townhallDefinition.labor) {
          this.stores.building.setLabor(new BuildingLabor(Utils.uuid(), townhall.id, labor.resourceId, this.configurations.industry.resourceTypes[labor.resourceId].price, labor.maxVelocity, labor.weightEfficiency, labor.weightQuality));
        }
        console.log(`Saved townhall at (${townhall.mapX}, ${townhall.mapY}) with ${townhallDefinition.labor.length} labor to database`);

        this.stores.building.set(tradecenter)
        for (const labor of tradecenterDefinition.labor) {
          this.stores.building.setLabor(new BuildingLabor(Utils.uuid(), tradecenter.id, labor.resourceId, this.configurations.industry.resourceTypes[labor.resourceId].price, labor.maxVelocity, labor.weightEfficiency, labor.weightQuality));
        }
        for (const product of tradecenterDefinition.products) {
          this.stores.building.setProduct(new BuildingProduct(Utils.uuid(), tradecenter.id, product.resourceId, false, this.configurations.industry.resourceTypes[product.resourceId].price, .4, product.maxVelocity, product.weightEfficiency, product.weightQuality));
        }
        console.log(`Saved tradecenter at (${tradecenter.mapX}, ${tradecenter.mapY}) with ${tradecenterDefinition.labor.length} labor and ${tradecenterDefinition.products.length} products to database`);

        this.stores.building.set(portal)
        console.log(`Saved portal at (${portal.mapX}, ${portal.mapY}) to database`);
      }
    }
  }
}
