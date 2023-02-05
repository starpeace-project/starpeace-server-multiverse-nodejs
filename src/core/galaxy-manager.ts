import _ from 'lodash';
import fs from 'fs';

import { CityZone, CompanySeal, IndustryCategory, IndustryType, Level, ResourceType, ResourceUnit } from '@starpeace/starpeace-assets-types';
import Invention from '../company/invention';


export interface GalaxyMetadata {
  id: string;
  name: string;
  visitorEnabled: boolean;
  tycoonEnabled: boolean;
  tycoonCreationEnabled: boolean;
  tycoonAuthentication: string;
  secretHash: string;
}

export interface PlanetMetadata {
  id: string;
  name: string;
  enabled: boolean;
  planetType: boolean;
  planetWidth: number;
  planetHeight: number;
  mapId: string;
  corporationInitialCash: number;
}

export class CoreConfigurations {
  cityZones: Array<CityZone>;
  industryCategories: Array<IndustryCategory>;
  industryTypes: Array<IndustryType>;
  levels: Array<Level>;
  rankingTypes: any;
  resourceTypes: Array<ResourceType>;
  resourceUnits: Array<ResourceUnit>;
  seals: Array<CompanySeal>;

  constructor (cityZones: Array<CityZone>, industryCategories: Array<IndustryCategory>, industryTypes: Array<IndustryType>, levels: Array<Level>, rankingTypes: any, resourceTypes: Array<ResourceType>, resourceUnits: Array<ResourceUnit>, seals: Array<CompanySeal>) {
    this.cityZones = cityZones;
    this.industryCategories = industryCategories;
    this.industryTypes = industryTypes;
    this.levels = levels;
    this.rankingTypes = rankingTypes;
    this.resourceTypes = resourceTypes;
    this.resourceUnits = resourceUnits;
    this.seals = seals;
  }

  get sealsById (): Record<string, CompanySeal> { return _.keyBy(this.seals, 'id'); }
  get lowestLevel (): Level | null { return _.first(_.orderBy(this.levels, ['level'], ['asc'])) ?? null; }

  toJson (): any {
    return {
      cityZones: this.cityZones.map(z => z.toJson()),
      industryCategories: this.industryCategories.map(i => i.toJson()),
      industryTypes: this.industryTypes.map(i => i.toJson()),
      levels: this.levels.map(l => l.toJson()),
      rankingTypes: this.rankingTypes,
      resourceTypes: this.resourceTypes.map(r => r.toJson()),
      resourceUnits: this.resourceUnits,
      seals: this.seals.map(s => s.toJson())
    };
  }
}

export class InventionConfigurations {
  inventions: Array<Invention>;

  constructor (inventions: Array<Invention>) {
    this.inventions = inventions;
  }

  get inventionsById () { return _.keyBy(this.inventions, 'id'); }
}

interface Configurations {
  building: any;
  core: CoreConfigurations;
  invention: InventionConfigurations;
}

export default class GalaxyManager {
  galaxyMetadata: GalaxyMetadata;
  planetMetadataById: Record<string, PlanetMetadata>;

  configurationsByPlanetId: Record<string, Configurations>;

  constructor (galaxyMetadata: GalaxyMetadata, planetMetadataById: Record<string, PlanetMetadata>, configurationsByPlanetId: Record<string, Configurations>) {
    this.galaxyMetadata = galaxyMetadata;
    this.planetMetadataById = planetMetadataById;
    this.configurationsByPlanetId = configurationsByPlanetId;
  }

  get planets (): PlanetMetadata[] { return Object.values(this.planetMetadataById); }
  get secret (): string { return this.galaxyMetadata.secretHash; }

  forPlanet (planetId: string): PlanetMetadata | null { return this.planetMetadataById[planetId]; }

  metadataBuildingForPlanet (planetId: string): any | null { return this.configurationsByPlanetId[planetId]?.building; }
  metadataCoreForPlanet (planetId: string): CoreConfigurations | null { return this.configurationsByPlanetId[planetId]?.core; }
  metadataInventionForPlanet (planetId: string): InventionConfigurations | null { return this.configurationsByPlanetId[planetId]?.invention; }

  static deserializeCoreConfigurations (json: any): CoreConfigurations {
    return new CoreConfigurations(
      _.map(json.cityZones, CityZone.fromJson),
      _.map(json.industryCategories, IndustryCategory.fromJson),
      _.map(json.industryTypes, IndustryType.fromJson),
      _.map(json.levels, Level.fromJson),
      json.rankingTypes,
      _.map(json.resourceTypes, ResourceType.fromJson),
      _.map(json.resourceUnits, ResourceUnit.fromJson),
      _.map(json.seals, CompanySeal.fromJson)
    );
  }

  static deserializeInventionConfigurations (json: any): InventionConfigurations {
    return new InventionConfigurations(
      _.map(json.inventions, Invention.fromJson)
    );
  }


  static create (): GalaxyManager {
    const metadata: GalaxyMetadata = JSON.parse(fs.readFileSync('./galaxy/galaxy.config.json')?.toString());

    const planetMetadatas: Array<PlanetMetadata> = [];
    const configurationsByPlanetId: Record<string, Configurations> = {};
    for (let directoryName of fs.readdirSync('./galaxy')) {
      const configName = `galaxy/${directoryName}/planet.config.json`;
      if (fs.existsSync(configName)) {
        const planetMetadata = JSON.parse(fs.readFileSync(configName)?.toString());
        if (!planetMetadata?.id) {
          continue;
        }

        if (!fs.existsSync(`./galaxy/${planetMetadata.id}/metadata.building.json`)) {
          console.log("Unable to find planet metadata.${planetMetadata.id}.building.json; will omit planet (try re-running setup)");
          continue;
        }
        if (!fs.existsSync(`./galaxy/${planetMetadata.id}/metadata.invention.json`)) {
          console.log("Unable to find planet metadata.${planetMetadata.id}.invention.json; will omit planet (try re-running setup)");
          continue;
        }
        if (!fs.existsSync(`./galaxy/${planetMetadata.id}/metadata.core.json`)) {
          console.log("Unable to find planet metadata.${planetMetadata.id}.core.json; will omit planet (try re-running setup)");
          continue;
        }

        planetMetadatas.push(planetMetadata);
        configurationsByPlanetId[planetMetadata.id] = {
          building: JSON.parse(fs.readFileSync(`./galaxy/${planetMetadata.id}/metadata.building.json`).toString()),
          core: GalaxyManager.deserializeCoreConfigurations(JSON.parse(fs.readFileSync(`./galaxy/${planetMetadata.id}/metadata.core.json`).toString())),
          invention: GalaxyManager.deserializeInventionConfigurations(JSON.parse(fs.readFileSync(`./galaxy/${planetMetadata.id}/metadata.invention.json`).toString()))
        };
      }
    }

    return new GalaxyManager(metadata, _.keyBy(planetMetadatas, 'id'), configurationsByPlanetId);
  }
}
