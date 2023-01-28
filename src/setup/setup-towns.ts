import fs from 'fs-extra';
import path from 'path';

import { BuildingImageDefinition } from '@starpeace/starpeace-assets-types';

import Building from "../building/building";
import BuildingStore from "../building/building-store";
import Town from "../planet/town";
import TownStore from "../planet/town-store";
import Utils from "../utils/utils";

import { SetupConfigurations } from '../setup';


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

const createBuilding = (mapX: number, mapY: number, offsetX: number, offsetY: number, buildingDefinition: any, townId: string) => {
  return new Building(
    Utils.uuid(),
    'IFEL',
    'IFEL',
    'IFEL',
    buildingDefinition.id,
    townId,
    null,
    mapX + offsetX,
    mapY + offsetY,
    0
  );
}


export default class SetupTowns {
  configurations: SetupConfigurations;
  seed: number;

  constructor (configurations: SetupConfigurations, seed: number) {
    this.configurations = configurations;
    this.seed = seed ?? 0;
  }

  planBuilding (townhallPosition: number, townhallImage: BuildingImageDefinition, buildingPosition: number, buildingImage: BuildingImageDefinition) {
    const townhallDeltaX = townhallPosition == 1 || townhallPosition == 2;
    const townhallDeltaY = townhallPosition == 2 || townhallPosition == 3;

    const buildingDeltaX = buildingPosition == 1 || buildingPosition == 2;
    const buildingDeltaY = buildingPosition == 2 || buildingPosition == 3;

    let offsetX = 0;
    let offsetY = 0;

    if (townhallPosition == buildingPosition) {
      if (this.seed) {
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
      tradecenter: this.planBuilding(townhallPosition, townhallImage, tradecenterPosition, tradecenterImage),
      portal: this.planBuilding(townhallPosition, townhallImage, portalPosition, portalImage)
    };
  }

  async export (planetId: string, mapId: string) {
    const buildingStore = new BuildingStore(false, planetId);
    const townStore = new TownStore(false, planetId);
    const towns: Town[] = await townStore.all();

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

        const townhallImage = this.configurations.building.images[townhallBuilding.imageId];
        const tradecenterImage = this.configurations.building.images[tradecenterBuilding.imageId];

        if (!townhallBuilding || !townhallImage) throw `Unable to find townhall building or image for seal ${townConfig.sealId}`;
        if (!tradecenterBuilding || !tradecenterImage) throw `Unable to find tradecenter building or image for seal ${townConfig.sealId}`;

        const layout = this.planLayout(townhallImage, tradecenterImage, portalImage);

        const townX = 1000 - townConfig.mapY;
        const townY = 1000 - townConfig.mapX;

        const townId = Utils.uuid();
        const townhall = createBuilding(townX, townY, layout.townhall[0], layout.townhall[1], townhallBuilding, townId);
        const tradecenter = createBuilding(townX, townY, layout.tradecenter[0], layout.tradecenter[1], tradecenterBuilding, townId);
        const portal = createBuilding(townX, townY, layout.portal[0], layout.portal[1], portalBuilding, townId);

        const town = new Town(
          townId,
          townConfig.name,
          townConfig.sealId,
          townConfig.color,
          townhall.id,
          townhall.mapX,
          townhall.mapY
        );

        townStore.set(town);
        console.log(`Saved town ${town.name} to database`);

        buildingStore.set(townhall);
        console.log(`Saved townhall at (${townhall.mapX}, ${townhall.mapY}) to database`);
        buildingStore.set(tradecenter)
        console.log(`Saved tradecenter at (${tradecenter.mapX}, ${tradecenter.mapY}) to database`);
        buildingStore.set(portal)
        console.log(`Saved portal at (${portal.mapX}, ${portal.mapY}) to database`);
      }
    }

    await buildingStore.close()
    await townStore.close()
  }
}
