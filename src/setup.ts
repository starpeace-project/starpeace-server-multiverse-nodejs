import _ from 'lodash';
import fs from 'fs-extra';
import path from 'path';

import { BuildingDefinition, BuildingImageDefinition, CityZone, CompanySeal, IndustryCategory, IndustryType, InventionDefinition, Level, ResourceType, ResourceUnit, SimulationDefinition, SimulationDefinitionParser } from '@starpeace/starpeace-assets-types';

import Logger from './utils/logger';
import FileUtils from './utils/file-utils';
import Utils from './utils/utils';
import SetupPlanet from './setup/setup-planet';
import { GalaxyMetadata, PlanetMetadata } from './core/galaxy-manager';


export interface SetupBuildingConfigurations {
  definitions: Record<string, BuildingDefinition>;
  simulations: Record<string, SimulationDefinition>;
  images: Record<string, BuildingImageDefinition>;
}
export interface SetupIndustryConfigurations {
  cityZones: CityZone[];
  industryCategories: IndustryCategory[];
  industryTypes: IndustryType[];
  levels: Level[];
  resourceTypes: ResourceType[];
  resourceUnits: ResourceUnit[];
}
export interface SetupConfigurations {
  building: SetupBuildingConfigurations;
  industry: SetupIndustryConfigurations;
  inventions: InventionDefinition[];
  seals: CompanySeal[];
}

// const determineAction = async () => {
//   return await inquirer.prompt([
//     {
//       type: 'rawlist',
//       name: 'action',
//       message: 'What do you want to do?',
//       choices: [
//         'Add planet',
//         'Remove planet',
//         'Exit'
//       ]
//     }
//   ])
// }


Logger.banner();

// bmp_path = path.join(__dirname, '../../node_modules/@starpeace/starpeace-assets/assets/maps/ancoeus.bmp')
// bmp_buffer = fs.readFileSync(bmp_path)
// console.log bmp_path

const loadConfigurations = async (): Promise<{ configurations: SetupConfigurations }> => {
  const buildingsDir = path.join(__dirname, "../../node_modules/@starpeace/starpeace-assets/assets/buildings");
  const industryDir = path.join(__dirname, "../../node_modules/@starpeace/starpeace-assets/assets/industry");
  const inventionsDir = path.join(__dirname, "../../node_modules/@starpeace/starpeace-assets/assets/inventions");
  const sealsDir = path.join(__dirname, "../../node_modules/@starpeace/starpeace-assets/assets/seals");

  return {
    configurations: {
      building: {
        definitions: _.keyBy(FileUtils.parseToJson(buildingsDir, ['.json'], ['-simulation.json', '-image.json']).map(BuildingDefinition.fromJson), 'id'),
        simulations: _.keyBy(FileUtils.parseToJson(buildingsDir, ['-simulation.json'], []).map(SimulationDefinitionParser.fromJson), 'id'),
        images: _.keyBy(FileUtils.parseToJson(buildingsDir, ['-image.json'], []).map(BuildingImageDefinition.fromJson), 'id')
      },
      industry: {
        cityZones: FileUtils.parseToJson(industryDir, ['city-zones.json'], []).map(CityZone.fromJson),
        industryCategories: FileUtils.parseToJson(industryDir, ['industry-categories.json'], []).map(IndustryCategory.fromJson),
        industryTypes: FileUtils.parseToJson(industryDir, ['industry-types.json'], []).map(IndustryType.fromJson),
        levels: FileUtils.parseToJson(industryDir, ['levels.json'], []).map(Level.fromJson),
        resourceTypes: FileUtils.parseToJson(industryDir, ['resource-types.json'], []).map(ResourceType.fromJson),
        resourceUnits: FileUtils.parseToJson(industryDir, ['resource-units.json'], []).map(ResourceUnit.fromJson),
      },
      inventions: FileUtils.parseToJson(inventionsDir, ['.json'], []).map(InventionDefinition.fromJson),
      seals: FileUtils.parseToJson(sealsDir, ['.json'], []).map(CompanySeal.fromJson)
    }
  };
}

const setupConfiguration = async ({ configurations }: any): Promise<{ configurations: SetupConfigurations, galaxyMetadata: GalaxyMetadata }> => {
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs', { recursive: true });
  }
  if (!fs.existsSync('galaxy')) {
    fs.mkdirSync('galaxy', { recursive: true });
  }

  if (fs.existsSync('./galaxy/galaxy.config.json')) {
    const galaxyMetadata: GalaxyMetadata = JSON.parse(fs.readFileSync('./galaxy/galaxy.config.json').toString());
    console.log(`Welcome back to starpeace-multiverse setup for ${galaxyMetadata.name}!`);
    console.log("Please shut down mutliverse server before using setup");
    return { configurations, galaxyMetadata };
  }
  else {
    console.log("Welcome to starpeace-multiverse setup!");
    console.log("Existing galaxy metadata not found; creating configuration");
    const galaxyMetadata: GalaxyMetadata = {
      "id": Utils.uuid(),
      "name": "Server name",
      "visitorEnabled": true,
      "tycoonEnabled": true,
      "tycoonCreationEnabled": true,
      "tycoonAuthentication": "password",
      "secretHash": Utils.uuid()
    };
    fs.writeFileSync('./galaxy/galaxy.config.json', JSON.stringify(galaxyMetadata))
    return { configurations, galaxyMetadata };
  }
};

const loadPlanets = async ({ configurations, galaxyMetadata }: any): Promise<{ configurations: SetupConfigurations, galaxyMetadata: GalaxyMetadata, planets: PlanetMetadata[] }> => {
  const planets: PlanetMetadata[] = [];
  for (let directoryName of fs.readdirSync('galaxy', { withFileTypes: true }).filter(f => f.isDirectory()).map(f => f.name)) {
    const configName = `galaxy/${directoryName}/planet.config.json`;
    if (fs.existsSync(configName)) {
      planets.push(<PlanetMetadata> JSON.parse(fs.readFileSync(configName)?.toString()));
    }
  }
  return { configurations, galaxyMetadata, planets };
};


loadConfigurations()
  .then(setupConfiguration)
  .then(loadPlanets)
  .then(async ({ configurations, galaxyMetadata, planets }: any) => {
    for (let planet of planets) {
      await new SetupPlanet(configurations, galaxyMetadata, planet).export();
    }
    return { configurations, galaxyMetadata, planets };
  })
  .then(() => {
    console.log('Finished planet setup');
  })
  .catch((err) => {
    console.error(err);
  });
