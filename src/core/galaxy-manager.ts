import _ from 'lodash';
import fs from 'fs';
import winston from 'winston';

import {
  BuildingDefinition,
  BuildingImageDefinition,
  CityZone,
  CompanySeal,
  IndustryCategory,
  IndustryType,
  InventionDefinition,
  Level,
  ResidenceDefinition,
  ResourceType,
  ResourceUnit,
  ResourceVelocity,
  ResourceVelocityWeighted,
  SimulationDefinition,
  SimulationDefinitionParser,
  StorageQuantity,
  isSimulationWithInputs,
  isSimulationWithLabor,
  isSimulationWithOperations,
  isSimulationWithOutputs,
  isSimulationWithStorage
} from '@starpeace/starpeace-assets-types';

export interface GalaxySettings {
  port: number;
  privateKeyPath?: string | undefined;
  certificatePath?: string | undefined;
}

export interface GalaxyMetadata {
  id: string;
  name: string;
  visitorEnabled: boolean;
  tycoonEnabled: boolean;
  tycoonCreationEnabled: boolean;
  tycoonAuthentication: string;
  secretHash: string;
  settings: GalaxySettings;
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

export class BuildingConfigurations {
  definitions: Array<BuildingDefinition>;
  imageDefinitions: Array<BuildingImageDefinition>;
  simulationDefinitions: Array<SimulationDefinition>;

  definitionById: Record<string, BuildingDefinition>;
  imageById: Record<string, BuildingImageDefinition>;
  simulationById: Record<string, SimulationDefinition>;

  serviceResourceIdsBySealId: Record<string, Set<string>> = {};

  inputByDefinitionResourceId: Record<string, Record<string, ResourceVelocityWeighted>> = {};
  laborByDefinitionResourceId: Record<string, Record<string, ResourceVelocityWeighted>> = {};
  outputByDefinitionResourceId: Record<string, Record<string, ResourceVelocity>> = {};
  rentByDefinitionResourceId: Record<string, Record<string, ResourceVelocity>> = {};
  serviceByDefinitionResourceId: Record<string, Record<string, ResourceVelocityWeighted>> = {};
  storageByDefinitionResourceId: Record<string, Record<string, StorageQuantity>> = {};

  constructor (definitions: Array<BuildingDefinition>, imageDefinitions: Array<BuildingImageDefinition>, simulationDefinitions: Array<SimulationDefinition>) {
    this.definitions = definitions;
    this.imageDefinitions = imageDefinitions;
    this.simulationDefinitions = simulationDefinitions;

    this.definitionById = Object.fromEntries((definitions ?? []).map(d => [d.id, d]));
    this.imageById = Object.fromEntries((imageDefinitions ?? []).map(d => [d.id, d]));
    this.simulationById = Object.fromEntries((simulationDefinitions ?? []).map(d => [d.id, d]));

    for (const simulation of simulationDefinitions) {
      if (isSimulationWithInputs(simulation)) {
        this.inputByDefinitionResourceId[simulation.id] = {};
        for (const input of simulation.inputs) {
          this.inputByDefinitionResourceId[simulation.id][input.resourceId] = input;
        }
      }
      if (isSimulationWithLabor(simulation)) {
        this.laborByDefinitionResourceId[simulation.id] = {};
        for (const job of simulation.labor) {
          this.laborByDefinitionResourceId[simulation.id][job.resourceId] = job;
        }
      }
      if (isSimulationWithOperations(simulation)) {
        this.serviceByDefinitionResourceId[simulation.id] = {};
        for (const operation of simulation.operations) {
          this.serviceByDefinitionResourceId[simulation.id][operation.resourceId] = operation;

          const sealId = this.definitionById[simulation.id].sealId;
          if (!this.serviceResourceIdsBySealId[sealId]) {
            this.serviceResourceIdsBySealId[sealId] = new Set<string>();
          }
          this.serviceResourceIdsBySealId[sealId].add(operation.resourceId);
        }
      }
      if (isSimulationWithOutputs(simulation)) {
        this.outputByDefinitionResourceId[simulation.id] = {};
        for (const output of simulation.outputs) {
          this.outputByDefinitionResourceId[simulation.id][output.resourceId] = output;
        }
      }
      if (simulation instanceof ResidenceDefinition) {
        this.rentByDefinitionResourceId[simulation.id] = {};
        this.rentByDefinitionResourceId[simulation.id][simulation.residentType] = new ResourceVelocity(simulation.residentType, undefined, simulation.capacity);
      }
      if (isSimulationWithStorage(simulation)) {
        this.storageByDefinitionResourceId[simulation.id] = {};
        for (const storage of simulation.storage) {
          this.storageByDefinitionResourceId[simulation.id][storage.resourceId] = storage;
        }
      }
    }
  }

  imageForDefinitionId (definitionId: string): BuildingImageDefinition | null {
    return this.definitionById[definitionId] ? this.imageById[this.definitionById[definitionId].imageId] : null;
  }

  toJson (): any {
    return {
      definitions: this.definitions.map(d => d.toJson()),
      simulationDefinitions: this.simulationDefinitions.map(d => d.toJson()),
    }
  }
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

  resourceTypeById: Record<string, ResourceType>;
  sealById: Record<string, CompanySeal>;

  constructor (cityZones: Array<CityZone>, industryCategories: Array<IndustryCategory>, industryTypes: Array<IndustryType>, levels: Array<Level>, rankingTypes: any, resourceTypes: Array<ResourceType>, resourceUnits: Array<ResourceUnit>, seals: Array<CompanySeal>) {
    this.cityZones = cityZones;
    this.industryCategories = industryCategories;
    this.industryTypes = industryTypes;
    this.levels = levels;
    this.rankingTypes = rankingTypes;
    this.resourceTypes = resourceTypes;
    this.resourceUnits = resourceUnits;
    this.seals = seals;

    this.resourceTypeById = Object.fromEntries((resourceTypes ?? []).map(s => [s.id, s]));
    this.sealById = Object.fromEntries((seals ?? []).map(s => [s.id, s]));
  }

  get lowestLevel (): Level | null {
    return _.first(_.orderBy(this.levels, ['level'], ['asc'])) ?? null;
  }

  resourcePrice (resourceId: string): number {
    return this.resourceTypeById[resourceId]?.price ?? 0;
  }

  toJson (): any {
    return {
      cityZones: this.cityZones.map(z => z.toJson()),
      industryCategories: this.industryCategories.map(i => i.toJson()),
      industryTypes: this.industryTypes.map(i => i.toJson()),
      levels: this.levels.map(l => l.toJson()),
      rankingTypes: this.rankingTypes,
      resourceTypes: this.resourceTypes.map(r => r.toJson()),
      resourceUnits: this.resourceUnits.map(r => r.toJson()),
      seals: this.seals.map(s => s.toJson())
    };
  }
}

export class InventionConfigurations {
  inventions: Array<InventionDefinition>;
  definitionsById: Record<string, InventionDefinition>;

  constructor (inventions: Array<InventionDefinition>) {
    this.inventions = inventions;
    this.definitionsById = Object.fromEntries((inventions || []).map(i => [i.id, i]));
  }

  toJson (): any {
    return {
      inventions: this.inventions.map(i => i.toJson())
    }
  }
}

interface Configurations {
  building: BuildingConfigurations;
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

  get planets (): PlanetMetadata[] {
    return Object.values(this.planetMetadataById);
  }
  get secret (): string {
    return this.galaxyMetadata.secretHash;
  }

  forPlanet (planetId: string): PlanetMetadata | null { return this.planetMetadataById[planetId]; }
  forPlanetRequired (planetId: string): PlanetMetadata {
    if (!this.planetMetadataById[planetId]) throw "Unknown planet id";
    return this.planetMetadataById[planetId];
  }

  metadataBuildingForPlanet (planetId: string): BuildingConfigurations | null { return this.configurationsByPlanetId[planetId]?.building; }
  metadataCoreForPlanet (planetId: string): CoreConfigurations | null { return this.configurationsByPlanetId[planetId]?.core; }
  metadataInventionForPlanet (planetId: string): InventionConfigurations | null { return this.configurationsByPlanetId[planetId]?.invention; }

  static deserializeBuildingConfigurations (json: any): BuildingConfigurations {
    return new BuildingConfigurations(
      (json.definitions ?? []).map(BuildingDefinition.fromJson),
      (json.imageDefinitions ?? []).map(BuildingImageDefinition.fromJson),
      (json.simulationDefinitions ?? []).map(SimulationDefinitionParser.fromJson)
    );
  }

  static deserializeCoreConfigurations (json: any): CoreConfigurations {
    return new CoreConfigurations(
      (json.cityZones ?? []).map(CityZone.fromJson),
      (json.industryCategories ?? []).map(IndustryCategory.fromJson),
      (json.industryTypes ?? []).map(IndustryType.fromJson),
      (json.levels ?? []).map(Level.fromJson),
      json.rankingTypes,
      (json.resourceTypes ?? []).map(ResourceType.fromJson),
      (json.resourceUnits ?? []).map(ResourceUnit.fromJson),
      (json.seals ?? []).map(CompanySeal.fromJson)
    );
  }

  static deserializeInventionConfigurations (json: any): InventionConfigurations {
    return new InventionConfigurations(
      (json.inventions ?? []).map(InventionDefinition.fromJson)
    );
  }


  static create (logger: winston.Logger): GalaxyManager {
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
          logger.error("Unable to find planet metadata.${planetMetadata.id}.building.json; will omit planet (try re-running setup)");
          continue;
        }
        if (!fs.existsSync(`./galaxy/${planetMetadata.id}/metadata.invention.json`)) {
          logger.error("Unable to find planet metadata.${planetMetadata.id}.invention.json; will omit planet (try re-running setup)");
          continue;
        }
        if (!fs.existsSync(`./galaxy/${planetMetadata.id}/metadata.core.json`)) {
          logger.error("Unable to find planet metadata.${planetMetadata.id}.core.json; will omit planet (try re-running setup)");
          continue;
        }

        planetMetadatas.push(planetMetadata);
        configurationsByPlanetId[planetMetadata.id] = {
          building: GalaxyManager.deserializeBuildingConfigurations(JSON.parse(fs.readFileSync(`./galaxy/${planetMetadata.id}/metadata.building.json`).toString())),
          core: GalaxyManager.deserializeCoreConfigurations(JSON.parse(fs.readFileSync(`./galaxy/${planetMetadata.id}/metadata.core.json`).toString())),
          invention: GalaxyManager.deserializeInventionConfigurations(JSON.parse(fs.readFileSync(`./galaxy/${planetMetadata.id}/metadata.invention.json`).toString()))
        };
      }
    }

    return new GalaxyManager(metadata, _.keyBy(planetMetadatas, 'id'), configurationsByPlanetId);
  }
}
