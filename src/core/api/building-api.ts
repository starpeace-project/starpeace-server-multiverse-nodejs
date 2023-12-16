import _ from 'lodash';
import express from 'express';
import Filter from 'bad-words';
import winston from 'winston';

import { BuildingDefinition, HeadquartersDefinition, ResourceType } from '@starpeace/starpeace-assets-types';

import GalaxyManager from '../galaxy-manager.js';
import ModelEventClient from '../events/model-event-client.js';
import { type ApiCaches } from './api-factory.js';

import Building from '../../building/building.js';
import Company from '../../company/company.js';
import Town from '../../planet/town.js';
import BuildingSettings, { ConnectionPosture, VALID_CONNECTON_POSTURES } from '../../building/settings/building-settings.js';
import BuildingCloneSettings from '../../building/settings/building-clone-settings.js';
import BuildingConnection from '../../building/connections/building-connection.js';


export default class BuildingApi {
  logger: winston.Logger;
  galaxyManager: GalaxyManager;
  modelEventClient: ModelEventClient;
  caches: ApiCaches;

  constructor (logger: winston.Logger, galaxyManager: GalaxyManager, modelEventClient: ModelEventClient, caches: ApiCaches) {
    this.logger = logger;
    this.galaxyManager = galaxyManager;
    this.modelEventClient = modelEventClient;
    this.caches = caches;
  }

  getBuildings (): (req: express.Request, res: express.Response) => any {
    return (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.query.chunkX || !req.query.chunkY) return res.sendStatus(400);
      try {
        const chunkX: number = _.parseInt(req.query.chunkX as string) ?? 0;
        const chunkY: number = _.parseInt(req.query.chunkY as string) ?? 0;
        // TODO: validate or verify chunk params?

        const buildings: Building[] = this.caches.building.withPlanet(req.planet).forChunk(chunkX, chunkY) ?? [];
        return res.json(buildings.map((b) => b.toJson()));
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  getBuilding (): (req: express.Request, res: express.Response) => any {
    return (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.buildingId) return res.sendStatus(400);
      try {
        const building: Building | undefined = this.caches.building.withPlanet(req.planet).forId(req.params.buildingId);
        if (!building) {
          return res.sendStatus(404);
        }
        return res.json(building.toJson());
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  getBuildingDetails (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.buildingId) return res.sendStatus(400);
      try {
        const building: Building | undefined = this.caches.building.withPlanet(req.planet).forId(req.params.buildingId);
        if (!building) return res.sendStatus(404);

        const buildingConfigurations = this.caches.buildingConfigurations[req.planet.id];
        const isConstructing: boolean = !building.constructed || building.upgrading;
        const [construction, metrics, settings] = await Promise.all([
          isConstructing ? this.modelEventClient.getBuildingConstruction(req.planet.id, building.id) : Promise.resolve(undefined),
          this.modelEventClient.getBuildingMetrics(req.planet.id, building.id),
          this.modelEventClient.getBuildingSettings(req.planet.id, building.id)
        ]);

        const definition = buildingConfigurations.definitionById[building.definitionId];
        const simulation = buildingConfigurations.simulationById[building.definitionId];
        const commonDetails = {
          id: req.params.buildingId,
          closed: settings?.closed ?? false,
          connectionPosture: settings?.connectionPosture ?? ConnectionPosture.ANYONE,
          allowIncomingSettings: settings?.allowIncomingSettings ?? false,
          level: building.level,
          requestedLevel: settings?.requestedLevel ?? building.level,
          maxLevel: simulation?.maxLevel,
        };

        if (isConstructing) {
          return res.json(_.merge(commonDetails, {
            inputs: (construction?.resources ?? []).map((r) => {
              return {
                resourceId: r.resourceId,
                maxPrice: r.maxPrice,
                minQuality: r.minQuality,
                mostRecentVelocity: r.mostRecentVelocity,
                mostRecentPrice: r.mostRecentPrice,
                mostRecentTotalQuality: r.mostRecentTotalQuality,
                connections: []
              };
            })
          }));
        }

        const inputMaxVelocityByResourceId = Object.fromEntries(Object.entries(buildingConfigurations.inputByDefinitionResourceId[building.definitionId] ?? buildingConfigurations.storageByDefinitionResourceId[building.definitionId] ?? {})
            .filter(([resourceId, _configuration]) => !settings?.storageByResourceId[resourceId] || !!settings?.storageByResourceId[resourceId]?.enabled)
            .map(([resourceId, configuration]) => [resourceId, configuration.maxVelocity ?? 0]));
        const outputMaxVelocityByResourceId = Object.fromEntries(Object.entries(buildingConfigurations.outputByDefinitionResourceId[building.definitionId] ?? buildingConfigurations.storageByDefinitionResourceId[building.definitionId] ?? {})
            .filter(([resourceId, _configuration]) => !settings?.storageByResourceId[resourceId] || !!settings?.storageByResourceId[resourceId]?.enabled)
            .map(([resourceId, configuration]) => [resourceId, configuration.maxVelocity ?? 0]));

        if (simulation instanceof HeadquartersDefinition) {
          for (const resourceId of (buildingConfigurations.serviceResourceIdsBySealId[definition.sealId] ?? [])) {
            if (metrics && (metrics?.inputByResourceId?.[resourceId]?.mostRecentVelocityMaximum ?? 0) > 0) {
              inputMaxVelocityByResourceId[resourceId] = metrics.inputByResourceId[resourceId].mostRecentVelocityMaximum;
            }
          }
        }

        return res.json(_.merge(commonDetails, {
          inputs: Object.entries(inputMaxVelocityByResourceId).map(([resourceId, maxVelocity]) => {
            return {
              resourceId: resourceId,
              maxVelocity: building.level * maxVelocity,
              maxPrice: settings?.inputByResourceId?.[resourceId]?.maxPrice ?? 0,
              minQuality: settings?.inputByResourceId?.[resourceId]?.minQuality ?? 0,
              mostRecentVelocity: metrics?.inputByResourceId?.[resourceId]?.mostRecentVelocity ?? 0,
              mostRecentPrice: metrics?.inputByResourceId?.[resourceId]?.mostRecentPrice ?? 0,
              mostRecentTotalQuality: metrics?.inputByResourceId?.[resourceId]?.mostRecentTotalQuality ?? 0
            };
          }),
          labors: Object.entries(buildingConfigurations.laborByDefinitionResourceId[building.definitionId] ?? {}).map(([resourceId, configuration]) => {
            return {
              resourceId: resourceId,
              maxVelocity: building.level * (configuration.maxVelocity ?? 0),
              price: settings?.laborByResourceId?.[resourceId]?.price ?? 0,
              mostRecentVelocity: metrics?.laborByResourceId?.[resourceId]?.mostRecentVelocity ?? 0,
              mostRecentTotalQuality: metrics?.laborByResourceId?.[resourceId]?.mostRecentTotalQuality ?? 0,
            };
          }),
          outputs: Object.entries(outputMaxVelocityByResourceId).map(([resourceId, maxVelocity]) => {
            return {
              resourceId: resourceId,
              maxVelocity: building.level * maxVelocity,
              price: settings?.outputByResourceId?.[resourceId]?.price ?? 0,
              mostRecentVelocity: metrics?.outputByResourceId?.[resourceId]?.mostRecentVelocity ?? 0,
              mostRecentTotalQuality: metrics?.outputByResourceId?.[resourceId]?.mostRecentTotalQuality ?? 0
            };
          }),
          rents: Object.entries(buildingConfigurations.rentByDefinitionResourceId[building.definitionId] ?? {}).map(([resourceId, configuration]) => {
            return {
              resourceId: resourceId,
              maxVelocity: building.level * (configuration.maxVelocity ?? 0),
              rentFactor: settings?.rentByResourceId?.[resourceId]?.rentFactor ?? 0,
              maintenanceFactor: settings?.rentByResourceId?.[resourceId]?.maintenanceFactor ?? 0,
              mostRecentVelocity: metrics?.rentByResourceId?.[resourceId]?.mostRecentVelocity ?? 0,
              mostRecentExtraBeauty: metrics?.rentByResourceId?.[resourceId]?.mostRecentExtraBeauty ?? 0,
              mostRecentCrimeResistance: metrics?.rentByResourceId?.[resourceId]?.mostRecentCrimeResistance ?? 0,
              mostRecentPollutionResistance: metrics?.rentByResourceId?.[resourceId]?.mostRecentPollutionResistance ?? 0,
              mostRecentExtraPrivacy: metrics?.rentByResourceId?.[resourceId]?.mostRecentExtraPrivacy ?? 0
            };
          }),
          services: Object.entries(buildingConfigurations.serviceByDefinitionResourceId[building.definitionId] ?? {}).map(([resourceId, configuration]) => {
            return {
              resourceId: resourceId,
              maxVelocity: building.level * (configuration.maxVelocity ?? 0),
              requestedVelocity: settings?.serviceByResourceId?.[resourceId]?.requestedVelocity ?? 0,
              mostRecentVelocity: metrics?.serviceByResourceId?.[resourceId]?.mostRecentVelocity ?? 0,
            };
          }),
          storages: Object.entries(buildingConfigurations.storageByDefinitionResourceId[building.definitionId] ?? {}).map(([resourceId, configuration]) => {
            return {
              resourceId: resourceId,
              enabled: settings?.storageByResourceId?.[resourceId]?.enabled ?? false,
              mostRecentCapacity: metrics?.storageByResourceId?.[resourceId]?.mostRecentCapacity ?? 0,
              mostRecentTotalQuality: metrics?.storageByResourceId?.[resourceId]?.mostRecentTotalQuality ?? 0,
              maxCapacity: building.level * (configuration.maxCapacity ?? 0),
            };
          }),
        }));
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  setBuildingDetails (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.visa || !req.visa.corporationId || !req.params.buildingId) return res.sendStatus(400);

      try {
        const building: Building | undefined = this.caches.building.withPlanet(req.planet).forId(req.params.buildingId);
        if (!building) return res.sendStatus(404);
        if (building.corporationId !== req.visa.corporationId) return res.sendStatus(403);

        const settings: BuildingSettings | undefined = await this.modelEventClient.getBuildingSettings(req.planet.id, building.id);
        if (!settings) return res.sendStatus(404);

        let buildingNameChanged = false;
        let settingsChanged = false;

        if (req.body.closed !== undefined) {
          settings.closed = !!req.body.closed;
          settingsChanged = true;
        }

        if (req.body.name !== undefined) {
          const name = _.trim(req.body.name);
          if (name?.length < 3 || new Filter().isProfane(name)) return res.status(400)
          building.name = name;
          buildingNameChanged = true;
        }

        if (req.body.connectionPosture !== undefined) {
          if (!VALID_CONNECTON_POSTURES.has(req.body.connectionPosture)) return res.sendStatus(404);
          settings.connectionPosture = req.body.connectionPosture;
          settingsChanged = true;
        }

        if (req.body.allowIncomingSettings !== undefined) {
          settings.allowIncomingSettings = !!req.body.allowIncomingSettings;
          settingsChanged = true;
        }

        if (req.body.requestedLevel !== undefined) {
          settings.requestedLevel = parseInt(req.body.requestedLevel);
          settingsChanged = true;
        }

        if (req.body.input?.resourceId) {
          if (!settings.inputByResourceId[req.body.input.resourceId]) return res.sendStatus(404);
          if (req.body.input.maxPrice !== undefined) {
            settings.inputByResourceId[req.body.input.resourceId].maxPrice = parseFloat(req.body.input.maxPrice);
            settingsChanged = true;
          }
          if (req.body.input.minQuality !== undefined) {
            settings.inputByResourceId[req.body.input.resourceId].minQuality = parseFloat(req.body.input.minQuality);
            settingsChanged = true;
          }
        }

        if (req.body.labor?.resourceId) {
          if (!settings.laborByResourceId[req.body.labor.resourceId]) return res.sendStatus(404);
          if (req.body.labor.price !== undefined) {
            settings.laborByResourceId[req.body.labor.resourceId].price = parseFloat(req.body.labor.price);
            settingsChanged = true;
          }
        }

        if (req.body.output?.resourceId) {
          if (!settings.outputByResourceId[req.body.output.resourceId]) return res.sendStatus(404);
          if (req.body.output.price !== undefined) {
            settings.outputByResourceId[req.body.output.resourceId].price = parseFloat(req.body.output.price);
            settingsChanged = true;
          }
        }

        if (req.body.rent?.resourceId) {
          if (!settings.rentByResourceId[req.body.rent.resourceId]) return res.sendStatus(404);
          if (req.body.rent.rentFactor !== undefined) {
            settings.rentByResourceId[req.body.rent.resourceId].rentFactor = parseFloat(req.body.rent.rentFactor);
            settingsChanged = true;
          }
          if (req.body.rent.maintenanceFactor !== undefined) {
            settings.rentByResourceId[req.body.rent.resourceId].maintenanceFactor = parseFloat(req.body.rent.maintenanceFactor);
            settingsChanged = true;
          }
        }

        if (req.body.service?.resourceId) {
          if (!settings.serviceByResourceId[req.body.service.resourceId]) return res.sendStatus(404);
          if (req.body.service.requestedVelocity !== undefined) {
            settings.serviceByResourceId[req.body.service.resourceId].requestedVelocity = parseFloat(req.body.service.requestedVelocity);
            settingsChanged = true;
          }
        }

        if (req.body.storage?.resourceId) {
          if (!settings.storageByResourceId[req.body.storage.resourceId]) return res.sendStatus(404);
          if (req.body.storage.enabled !== undefined) {
            settings.storageByResourceId[req.body.storage.resourceId].enabled = !!req.body.storage.enabled;
            settingsChanged = true;
          }
        }

        if (!buildingNameChanged && !settingsChanged) {
          return res.sendStatus(400);
        }

        await Promise.all([
          buildingNameChanged && building.name ? this.modelEventClient.renameBuilding(req.planet.id, building.id, building.name) : Promise.resolve(),
          settingsChanged ? this.modelEventClient.setBuildingSettings(req.planet.id, building.id, settings) : Promise.resolve()
        ]);

        return res.json({});
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  getBuildingConnections (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.buildingId || !req.query.type || !req.query.resourceId) return res.sendStatus(400);
      try {
        const buildingCache = this.caches.building.withPlanet(req.planet);
        const building: Building | undefined = buildingCache.forId(req.params.buildingId);
        if (!building) return res.sendStatus(404);

        const isInput = req.query.type === 'input';
        const isOutput = req.query.type === 'output';
        if (!isInput && !isOutput || isInput && isOutput) return res.sendStatus(400);

        const resource: ResourceType | undefined = this.caches.coreConfigurations[req.planet.id].resourceTypeById[req.query.resourceId as string];
        if (!resource) return res.sendStatus(400);

        const sourceBuildingId = isOutput ? building.id : undefined;
        const sinkBuildingId = isInput ? building.id : undefined;

        const connections = await this.modelEventClient.listBuildingConnections(req.planet.id, sourceBuildingId, sinkBuildingId, resource.id);

        const companyCache = this.caches.company.withPlanet(req.planet);
        return res.json({
          connections: connections.map((c: BuildingConnection) => {
            const sourceBuilding: Building | undefined = isOutput ? undefined : buildingCache.forId(c.sourceBuildingId);
            const sourceCompany: Company | undefined = sourceBuilding?.companyId && sourceBuilding.companyId !== 'IFEL' ? companyCache.forId(sourceBuilding.companyId) : undefined;

            const sinkBuilding: Building | undefined = isInput ? undefined : buildingCache.forId(c.sinkBuildingId);
            const sinkCompany: Company | undefined = sinkBuilding?.companyId && sinkBuilding.companyId !== 'IFEL' ? companyCache.forId(sinkBuilding.companyId) : undefined;

            return {
              id: c.id,
              sourceBuildingId: c.sourceBuildingId,
              sourceBuildingDefinitionId: sourceBuilding?.definitionId,
              sourceBuildingName: sourceBuilding?.name,
              sourceBuildingMapX: sourceBuilding?.mapX,
              sourceBuildingMapY: sourceBuilding?.mapY,
              sourceCompanyName: sourceBuilding?.companyId === 'IFEL' ? 'IFEL' : sourceCompany?.name,
              sinkBuildingId: c.sinkBuildingId,
              sinkBuildingDefinitionId: sinkBuilding?.definitionId,
              sinkBuildingName: sinkBuilding?.name,
              sinkBuildingMapX: sinkBuilding?.mapX,
              sinkBuildingMapY: sinkBuilding?.mapY,
              sinkCompanyName: sinkBuilding?.companyId === 'IFEL' ? 'IFEL' : sinkCompany?.name,
              resourceId: c.resourceId,
              connectedAt: c.connectedAt.toISO(),
              valid: true,
              mostRecentPrice: 0,
              mostRecentVelocity: 0,
              mostRecentQuality: 0,
              mostRecentTransportCost: 0
            };
          })
        });
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  createBuilding (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.visa || !req.visa.corporationId || !req.body.companyId || !req.body.definitionId) return res.sendStatus(400);

      const name = _.trim(req.body.name);
      if (!name.length || !_.isNumber(req.body.mapX) || !_.isNumber(req.body.mapY)) return res.sendStatus(400);

      try {
        const mapX = parseInt(req.body.mapX);
        const mapY = parseInt(req.body.mapY);

        const company: Company | undefined = this.caches.company.withPlanet(req.planet).forId(req.body.companyId);
        if (!company) return res.sendStatus(404);

        const definition: BuildingDefinition | undefined = this.galaxyManager.metadataBuildingForPlanet(req.planet.id)?.definitions?.find((b: any) => b.id === req.body.definitionId);
        if (!definition) return res.sendStatus(400);

        const town = this.caches.map.withPlanet(req.planet).findTown(mapX, mapY);
        if (!town) return res.sendStatus(400);

        const building: Building = await this.modelEventClient.constructBuilding(req.planet.id, req.visa.tycoonId, req.visa.corporationId, company.id, definition.id, town.id, name, mapX, mapY);

        if (!building) return res.sendStatus(404);
        return res.json(building.toJson());
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  demolishBuilding (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.visa || !req.visa.corporationId || !req.params.buildingId) return res.sendStatus(400);

      try {
        const originalBuilding: Building | undefined = this.caches.building.withPlanet(req.planet).forId(req.params.buildingId);
        if (!originalBuilding) return res.sendStatus(404);
        if (originalBuilding.corporationId !== req.visa.corporationId) return res.sendStatus(403);

        if (!!originalBuilding.condemnedAt) {
          return res.json(originalBuilding.toJson());
        }
        else {
          const building: Building = await this.modelEventClient.demolishBuilding(req.planet.id, originalBuilding.id);
          return res.json(building.toJson());
        }
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  cloneBuilding (): (req: express.Request, res: express.Response) => any {
    return async (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.visa || !req.visa.corporationId || !req.params.buildingId) return res.sendStatus(400);

      try {
        const building: Building | undefined = this.caches.building.withPlanet(req.planet).forId(req.params.buildingId);
        if (!building) return res.sendStatus(404);
        if (building.corporationId !== req.visa.corporationId) return res.sendStatus(403);

        if (!Array.isArray(req.body.cloneOptionIds) || !req.body.cloneOptionIds.length) return res.sendStatus(400);

        const settings = BuildingCloneSettings.fromArray(req.body.cloneOptionIds ?? []);
        const count: number = await this.modelEventClient.cloneBuildingSettings(req.planet.id, building.id, settings);

        return res.json({
          clonedCount: count
        });
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  getCompanyBuildings (): (req: express.Request, res: express.Response) => any {
    return (req: express.Request, res: express.Response) => {
      if (!req.planet || !req.params.companyId) return res.sendStatus(400);
      try {
        const company: Company | undefined = this.caches.company.withPlanet(req.planet).forId(req.params.companyId);
        if (!company) return res.sendStatus(404);
        const buildings: Building[] = this.caches.building.withPlanet(req.planet).forCompanyId(req.params.companyId) ?? [];
        return res.json(buildings.map((b) => b.toJson()));
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

  getTownBuildings (): (req: express.Request, res: express.Response) => any {
    return (req: express.Request, res: express.Response) => {
      if (!req.planet) return res.sendStatus(400);
      try {
        const town: Town | null = this.caches.town.withPlanet(req.planet).forId(req.params.townId);
        if (!town) return res.sendStatus(404);

        const buildingCache = this.caches.building.withPlanet(req.planet);
        const buildings: Building[] = buildingCache.forTownId(town.id) ?? [];

        return res.json(buildings.filter(b => {
          const definition = buildingCache.buildingConfigurations.definitionById[b.definitionId];
          return definition &&
              (!req.query.industryCategoryId || definition.industryCategoryId === req.query.industryCategoryId) &&
              (!req.query.industryTypeId || definition.industryTypeId === req.query.industryTypeId);
        }).map(b => b.toJson()));
      }
      catch (err) {
        this.logger.error(err);
        return res.sendStatus(500);
      }
    };
  }

}
