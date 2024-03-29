import _ from 'lodash';
import fs from 'fs-extra';
import { hash } from 'bcrypt';
import inquirer from 'inquirer';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';

import { BuildingDefinition, BuildingImageDefinition, CityZone, CompanySeal, IndustryCategory, IndustryType, InventionDefinition, Level, ResourceType, ResourceUnit, SimulationDefinition, SimulationDefinitionParser } from '@starpeace/starpeace-assets-types';

import Logger from './utils/logger.js';
import FileUtils from './utils/file-utils.js';
import Utils from './utils/utils.js';
import TycoonStore from './tycoon/tycoon-store.js';
import SetupPlanet from './setup/setup-planet.js';
import { type GalaxyMetadata, type PlanetMetadata } from './core/galaxy-manager.js';
import Tycoon from './tycoon/tycoon.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


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
  resourceTypes: Record<string, ResourceType>;
  resourceUnits: ResourceUnit[];
}
export interface SetupConfigurations {
  building: SetupBuildingConfigurations;
  industry: SetupIndustryConfigurations;
  inventions: InventionDefinition[];
  seals: CompanySeal[];
}


const logger = winston.createLogger({
  transports: [new winston.transports.Console({
    handleRejections: true,
    handleExceptions: true
  })],
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`)
  ),
  exitOnError: false
});


Logger.banner(logger);


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
        resourceTypes: _.keyBy(FileUtils.parseToJson(industryDir, ['resource-types.json'], []).map(ResourceType.fromJson), 'id'),
        resourceUnits: FileUtils.parseToJson(industryDir, ['resource-units.json'], []).map(ResourceUnit.fromJson),
      },
      inventions: FileUtils.parseToJson(inventionsDir, ['.json'], []).map(InventionDefinition.fromJson),
      seals: FileUtils.parseToJson(sealsDir, ['.json'], []).map(CompanySeal.fromJson)
    }
  };
}

const setupConfiguration = async ({ configurations }: any): Promise<any> => {
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
      "visas": {
        "visitor": false,
        "tycoon": {
          "issue": true,
          "create": true
        }
      },
      // "visitorEnabled": true,
      // "tycoonEnabled": true,
      // "tycoonCreationEnabled": true,
      "settings": {
        "authentication": "password",
        "secretHash": Utils.uuid(),
        "streamEncoding": "gzip",
        "port": 19160,
        "privateKeyPath": "./galaxy/ssl/privatekey.pem",
        "certificatePath": "./galaxy/ssl/certificate.pem"
      }
    };

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'Please enter a username for Admin account'
      },
      {
        type: 'password',
        name: 'password1',
        message: 'Please enter a password for Admin account'
      },
      {
        type: 'password',
        name: 'password2',
        message: 'Please confirm password for Admin account'
      }
    ]);

    if (answers.password1 !== answers.password2) {
      console.error("Admin passwords don't match");
      process.exit(1);
    }

    fs.writeFileSync('./galaxy/galaxy.config.json', JSON.stringify(galaxyMetadata, null, 2));
    return { configurations, galaxyMetadata, admin: { username: answers.username, password: answers.password1 } };
  }
};

const setupAdmin = async ({ configurations, galaxyMetadata, admin }: any): Promise<any> => {
  if (admin) {
    const passwordHash: string = await new Promise((resolve, reject) => {
      hash(admin.password, 10, (err: Error | undefined, pwHash: string) => {
        if (err) return reject(err);
        resolve(pwHash);
      });
    });

    const store = new TycoonStore(false);
    store.set(new Tycoon({
      id: Utils.uuid(),
      username: admin.username,
      name: admin.username,
      passwordHash: passwordHash,
      admin: true,
      gameMaster: false
    }));
    store.close();
  }

  return { configurations, galaxyMetadata };
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
  .then(setupAdmin)
  .then(loadPlanets)
  .then(async ({ configurations, galaxyMetadata, planets }: any) => {
    if (!planets.length) {
      const id = Utils.uuid();
      const planet = {
        id: id,
        name: "Ancoeus",
        enabled: true,
        planetType: "earth",
        planetWidth: 1000,
        planetHeight: 1000,
        mapId: "ancoeus",
        corporationInitialCash: 10000000000000
      };
      fs.mkdirSync(`./galaxy/${id}`, { recursive: true });
      fs.writeFileSync(`./galaxy/${id}/planet.config.json`, JSON.stringify(planet));
      planets.push(planet);
    }
    return { configurations, galaxyMetadata, planets };
  })
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
