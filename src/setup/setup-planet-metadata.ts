import _ from 'lodash';
import fs from 'fs-extra';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import { BuildingDefinition } from '@starpeace/starpeace-assets-types';

import { type SetupConfigurations } from '../setup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class SetupPlanetMetadata {
  configurations: SetupConfigurations;

  constructor (configurations: SetupConfigurations) {
    this.configurations = configurations;
  }

  createIndustryRankings (type: string, baseId: string, unit: string): any {
    const buildingsByCategoryId: Record<string, BuildingDefinition[]> = _.omit(_.groupBy(_.values(this.configurations.building.definitions), 'industryCategoryId'), ['NONE', 'CIVIC']);

    const rankings: any[] = [{
      id: `${baseId}-total`,
      parentId: baseId,
      type: type,
      categoryTotal: true,
      unit: unit,
      industryCategoryId: null,
      industryTypeId: null
    }];

    for (const [categoryId, buildings] of Object.entries(buildingsByCategoryId)) {
      const buildingTypeIds: string[] = _.without(_.uniq(buildings.map(b => b.industryTypeId)), 'HEADQUARTERS', 'MAUSOLEUM');
      for (const typeId of buildingTypeIds) {
        rankings.push({
          id: `${baseId}-${categoryId}-${typeId}`,
          parentId: `${baseId}-${categoryId}`,
          type: type,
          categoryTotal: false,
          unit: unit,
          industryCategoryId: categoryId,
          industryTypeId: typeId
        });
      }

      rankings.push({
        id: `${baseId}-${categoryId}`,
        parentId: baseId,
        type: 'FOLDER',
        categoryTotal: false,
        industryCategoryId: categoryId,
        industryTypeId: null
      });
      rankings.push({
        id: `${baseId}-${categoryId}-total`,
        parentId: `${baseId}-${categoryId}`,
        type: type,
        categoryTotal: true,
        unit: unit,
        industryCategoryId: categoryId,
        industryTypeId: null
      });
    }

    return rankings;
  }

  createRankings () {
    return [
      {
        id: 'corporation',
        type: 'CORPORATION',
        unit: 'COUNT',
        label: {
          'DE': 'Gesellschaft',
          'EN': 'Corporation',
          'ES': 'Corporación',
          'FR': 'Entreprise',
          'IT': 'Società',
          'PT': 'Corporação'
        }
      },
      {
        id: 'profit',
        type: 'FOLDER',
        label: {
          'DE': 'Profit',
          'EN': 'Profit',
          'ES': 'Lucro',
          'FR': 'Profit',
          'IT': 'Profitto',
          'PT': 'Lucro'
        }
      },
      {
        id: 'prestige',
        type: 'PRESTIGE',
        label: {
          'DE': 'Prestige',
          'EN': 'Prestige',
          'ES': 'Prestigio',
          'FR': 'Prestige',
          'IT': 'Prestigio',
          'PT': 'Prestígio'
        },
        unit: 'COUNT'
      },
      {
        id: 'wealth',
        type: 'WEALTH',
        unit: 'CURRENCY',
        label: {
          'DE': 'Reichtum',
          'EN': 'Wealth',
          'ES': 'Riqueza',
          'FR': 'Richesse',
          'IT': 'Ricchezza',
          'PT': 'Riqueza'
        }
      }
    ].concat(this.createIndustryRankings('PROFIT', 'profit', 'CURRENCY'))
  }

  export (planetId: string, mapId: string) {
    fs.writeFileSync(`./galaxy/${planetId}/metadata.building.json`, JSON.stringify({
      definitions: _.map(_.values(this.configurations.building.definitions), (i) => i.toJson()),
      simulationDefinitions: _.map(_.values(this.configurations.building.simulations), (i) => i.toJson()),
      imageDefinitions: _.map(_.values(this.configurations.building.images), (i) => i.toJson())
    }))

    fs.writeFileSync(`./galaxy/${planetId}/metadata.core.json`, JSON.stringify({
      cityZones: this.configurations.industry.cityZones.map(i => i.toJson()),
      industryCategories: this.configurations.industry.industryCategories.map(c => c.toJson()),
      industryTypes: this.configurations.industry.industryTypes.map(t => t.toJson()),
      levels: this.configurations.industry.levels.map(l => l.toJson()),
      rankingTypes: this.createRankings(),
      resourceTypes: Object.values(this.configurations.industry.resourceTypes).map(t => t.toJson()),
      resourceUnits: this.configurations.industry.resourceUnits.map(u => u.toJson()),
      seals: this.configurations.seals.map(s => s.toJson())
    }))

    fs.writeFileSync(`./galaxy/${planetId}/metadata.invention.json`, JSON.stringify({
      inventions: this.configurations.inventions.map(i => i.toJson())
    }));

    fs.copyFileSync(path.join(__dirname, `../../../node_modules/@starpeace/starpeace-assets/assets/maps/${mapId}.bmp`), `./galaxy/${planetId}/terrain.bmp`);
    fs.copyFileSync(path.join(__dirname, `../../../node_modules/@starpeace/starpeace-assets/assets/maps/${mapId}.towns.bmp`), `./galaxy/${planetId}/towns.bmp`);
  }
}
