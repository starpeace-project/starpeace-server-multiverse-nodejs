import fs from 'fs-extra';
import { DateTime } from 'luxon';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import { BuildingImageDefinition, TownhallDefinition, TradeCenterDefinition } from '@starpeace/starpeace-assets-types';

import Building from "../building/building.js";
import Town from "../planet/town.js";
import Utils from "../utils/utils.js";

import { type SetupConfigurations } from '../setup.js';
import { type SetupPlanetStores } from './setup-planet.js';
import GovernmentMetrics, { Commerce, Employment, Housing, LABOR_RESOURCE_IDS, Population, Service } from '../planet/government/government-metrics.js';
import GovernmentPolitics, { CurrentTerm, NextTerm, Rating } from '../planet/government/government-politics.js';
import GovernmentTaxes, { Tax } from '../planet/government/government-taxes.js';
import BuildingSettings, { ConnectionPosture } from '../building/settings/building-settings.js';
import BuildingLaborMetrics from '../building/metrics/building-labor-metrics.js';
import BuildingLaborSettings from '../building/settings/building-labor-settings.js';
import BuildingOutputSettings from '../building/settings/building-output-settings.js';
import BuildingOutputMetrics from '../building/metrics/building-output-metrics.js';
import BuildingMetrics from '../building/metrics/building-metrics.js';

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

const RATING_TYPES = Service.TYPES.concat(['TAX_REVENUE', 'EMPLOYMENT', 'POPULATION_GROWTH', 'ECONOMIC_GROWTH']);

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

  static createMetrics (townId: string, commerceIndustryTypeIds: Array<string>): GovernmentMetrics {
    return new GovernmentMetrics(
      townId,
      0,
      Service.TYPES.map((t) => new Service(t, 0)),
      commerceIndustryTypeIds.map((t) => new Commerce(t, 0, 0, 0, 0, 0, 0, 0)),
      LABOR_RESOURCE_IDS.map((id) => new Population(id, 0, 0, 0)),
      LABOR_RESOURCE_IDS.map((id) => new Employment(id, 0, 0, 0, 1, 0)),
      LABOR_RESOURCE_IDS.map((id) => new Housing(id, 0, 0, 1, 0))
    );
  }

  static createPolitics (townId: string, simulationTime: DateTime): GovernmentPolitics {
    return new GovernmentPolitics(
      townId,
      new CurrentTerm(
        simulationTime,
        simulationTime.plus({ years: 1000 }),
        1000,
        undefined,
        0,
        RATING_TYPES.map((t) => new Rating(t, 0, 0))
      ),
      new NextTerm(
        simulationTime.plus({ years: 1000 }),
        simulationTime.plus({ years: 2000 }),
        1000,
        []
      )
    );
  }

  static createTaxes (townId: string, taxTypes: Array<any>): GovernmentTaxes {
    return new GovernmentTaxes(townId, taxTypes.map((t) => new Tax(t.c, t.t, 0.05, 0)));
  }

  async export (planetId: string, mapId: string) {
    const typesByCategorieId: Record<string, Set<string>> = {};
    for (const definition of Object.values(this.configurations.building.definitions)) {
      if (!Commerce.TAX_CATEGORY_IDS.has(definition.industryCategoryId)) {
        continue;
      }
      if (Commerce.TAX_EXCLUDED_INDUSTRY_IDS.has(definition.industryTypeId)) {
        continue;
      }

      if (!typesByCategorieId[definition.industryCategoryId]) {
        typesByCategorieId[definition.industryCategoryId] = new Set();
      }
      typesByCategorieId[definition.industryCategoryId].add(definition.industryTypeId);
    }

    const commerceIndustryTypeIds = Array.from(typesByCategorieId['COMMERCE'] ?? []);
    const taxTypes = [];
    for (const [category, types] of Object.entries(typesByCategorieId)) {
      for (const type of Array.from(types)) {
        taxTypes.push({ c: category, t: type });
      }
    }

    const simulationTime: DateTime | undefined = (await this.stores.planet.get())?.time;
    if (!simulationTime) throw new Error('Unable to determine planet time');
    const towns: Town[] = await this.stores.town.all();

    await this.stores.government.setPlanetMetrics(SetupTowns.createMetrics('PLANET', commerceIndustryTypeIds));
    await this.stores.government.setPlanetPolitcs(SetupTowns.createPolitics('PLANET', simulationTime));
    await this.stores.government.setPlanetTaxes(SetupTowns.createTaxes('PLANET', taxTypes));
    console.log(`Saved planet metrics, politics, and taxes to database`);

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
        const townhall = new Building({
          id: Utils.uuid(),
          tycoonId: 'IFEL',
          corporationId: 'IFEL',
          companyId: 'IFEL',
          definitionId: townhallBuilding.id,
          townId,
          name: undefined,
          mapX: townX + layout.townhall[0],
          mapY: townY + layout.townhall[1],
          level: 1,
          upgrading: false,
          constructionStartedAt: simulationTime,
          constructionFinishedAt: simulationTime,
          condemnedAt: undefined
        });
        const tradecenter = new Building({
          id: Utils.uuid(),
          tycoonId: 'IFEL',
          corporationId: 'IFEL',
          companyId: 'IFEL',
          definitionId: tradecenterBuilding.id,
          townId,
          name: undefined,
          mapX: townX + layout.tradecenter[0],
          mapY: townY + layout.tradecenter[1],
          level: 1,
          upgrading: false,
          constructionStartedAt: simulationTime,
          constructionFinishedAt: simulationTime,
          condemnedAt: undefined
        });
        const portal = new Building({
          id: Utils.uuid(),
          tycoonId: 'IFEL',
          corporationId: 'IFEL',
          companyId: 'IFEL',
          definitionId: portalBuilding.id,
          townId,
          name: undefined,
          mapX: townX + layout.portal[0],
          mapY: townY + layout.portal[1],
          level: 1,
          upgrading: false,
          constructionStartedAt: simulationTime,
          constructionFinishedAt: simulationTime,
          condemnedAt: undefined
        });

        const town = new Town(
          townId,
          townConfig.name,
          townConfig.sealId,
          townConfig.color,
          townhall.id,
          townhall.mapX,
          townhall.mapY
        );

        await this.stores.town.set(town);
        console.log(`Saved town ${town.name} to database`);

        await this.stores.government.setTownMetrics(townId, SetupTowns.createMetrics(townId, commerceIndustryTypeIds));
        await this.stores.government.setTownPolitics(townId, SetupTowns.createPolitics(townId, simulationTime));
        await this.stores.government.setTownTaxes(townId, SetupTowns.createTaxes(townId, taxTypes));
        console.log(`Saved town ${town.name} metrics, politics, and taxes to database`);

        const townhallLaborMetricsByResourceId: Record<string, BuildingLaborMetrics> = {};
        const townhallLaborSettingsByResourceId: Record<string, BuildingLaborSettings> = {};
        for (const job of townhallDefinition.labor) {
          const price = this.configurations.industry.resourceTypes[job.resourceId]?.price ?? 0;
          townhallLaborMetricsByResourceId[job.resourceId] = new BuildingLaborMetrics(job.resourceId, 0, 0);
          townhallLaborSettingsByResourceId[job.resourceId] = new BuildingLaborSettings(job.resourceId, price * 1.5);
        }

        await this.stores.building.set(townhall);
        await this.stores.buildingMetrics.set(new BuildingMetrics({
          buildingId: townhall.id,
          laborByResourceId: townhallLaborMetricsByResourceId
        }));
        await this.stores.buildingSettings.set(new BuildingSettings({
          buildingId: townhall.id,
          laborByResourceId: townhallLaborSettingsByResourceId,
          closed: false,
          connectionPosture: ConnectionPosture.ANYONE,
          allowIncomingSettings: false,
          requestedLevel: 1
        }));
        console.log(`Saved townhall at (${townhall.mapX}, ${townhall.mapY}) with ${townhallDefinition.labor.length} labor to database`);

        const tradecenterLaborMetricsByResourceId: Record<string, BuildingLaborMetrics> = {};
        const tradecenterLaborSettingsByResourceId: Record<string, BuildingLaborSettings> = {};
        for (const job of tradecenterDefinition.labor) {
          const price = this.configurations.industry.resourceTypes[job.resourceId]?.price ?? 0;
          tradecenterLaborMetricsByResourceId[job.resourceId] = new BuildingLaborMetrics(job.resourceId, 0, 0);
          tradecenterLaborSettingsByResourceId[job.resourceId] = new BuildingLaborSettings(job.resourceId, price * 1.5);
        }
        const tradecenterOutputMetricsByResourceId: Record<string, BuildingOutputMetrics> = {};
        const tradecenterOutputSettingsByResourceId: Record<string, BuildingOutputSettings> = {};
        for (const output of tradecenterDefinition.outputs) {
          const price = this.configurations.industry.resourceTypes[output.resourceId]?.price ?? 0;
          tradecenterOutputMetricsByResourceId[output.resourceId] = new BuildingOutputMetrics(output.resourceId, 0, 0);
          tradecenterOutputSettingsByResourceId[output.resourceId] = new BuildingOutputSettings(output.resourceId, price * 2.5);
        }

        await this.stores.building.set(tradecenter)
        await this.stores.buildingMetrics.set(new BuildingMetrics({
          buildingId: tradecenter.id,
          inputByResourceId: {},
          outputByResourceId: tradecenterOutputMetricsByResourceId,
          laborByResourceId: tradecenterLaborMetricsByResourceId,
          serviceByResourceId: {}
        }));
        await this.stores.buildingSettings.set(new BuildingSettings({
          buildingId: tradecenter.id,
          inputByResourceId: {},
          outputByResourceId: tradecenterOutputSettingsByResourceId,
          laborByResourceId: tradecenterLaborSettingsByResourceId,
          serviceByResourceId: {},
          closed: false,
          connectionPosture: ConnectionPosture.ANYONE,
          allowIncomingSettings: false,
          requestedLevel: 1
        }));
        console.log(`Saved tradecenter at (${tradecenter.mapX}, ${tradecenter.mapY}) with ${tradecenterDefinition.labor.length} labor and ${tradecenterDefinition.outputs.length} products to database`);

        await this.stores.building.set(portal)
        console.log(`Saved portal at (${portal.mapX}, ${portal.mapY}) to database`);
      }
    }
  }
}
