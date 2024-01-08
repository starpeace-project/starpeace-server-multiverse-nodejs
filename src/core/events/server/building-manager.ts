import { Publisher, Reply } from 'zeromq';

import { BuildingDefinition, BuildingImageDefinition, ConstructionQuantity, HeadquartersDefinition, ResidenceDefinition, SimulationDefinition, StorageDefinition, TradeCenterDefinition, isSimulationWithInputs, isSimulationWithLabor, isSimulationWithOperations, isSimulationWithOutputs, isSimulationWithStorage } from '@starpeace/starpeace-assets-types';

import Building from '../../../building/building.js';
import BuildingConstruction, { ConstructionResource } from '../../../building/construction/building-construction.js';
import InventionSummary from '../../../company/invention-summary.js';

import { ModelEventServerCaches } from '../model-event-server.js';
import Utils from '../../../utils/utils.js';
import BuildingLaborSettings from '../../../building/settings/building-labor-settings.js';
import BuildingLaborMetrics from '../../../building/metrics/building-labor-metrics.js';
import BuildingServiceMetrics from '../../../building/metrics/building-service-metrics.js';
import BuildingServiceSettings from '../../../building/settings/building-service-settings.js';
import BuildingInputMetrics from '../../../building/metrics/building-input-metrics.js';
import BuildingInputSettings from '../../../building/settings/building-input-settings.js';
import BuildingOutputMetrics from '../../../building/metrics/building-output-metrics.js';
import BuildingOutputSettings from '../../../building/settings/building-output-settings.js';
import BuildingMetrics from '../../../building/metrics/building-metrics.js';
import BuildingSettings, { ConnectionPosture } from '../../../building/settings/building-settings.js';
import BuildingRentMetrics from '../../../building/metrics/building-rent-metrics.js';
import BuildingRentSettings from '../../../building/settings/building-rent-settings.js';
import BuildingStorageSettings from '../../../building/settings/building-storage-settings.js';
import BuildingStorageMetrics from '../../../building/metrics/building-storage-metrics.js';
import Corporation from '../../../corporation/corporation.js';
import BuildingCloneSettings from '../../../building/settings/building-clone-settings.js';
import BuildingConnection from '../../../building/connections/building-connection.js';

export default class BuildingManager {

  replySocket: Reply;
  publisherSocket: Publisher;

  caches: ModelEventServerCaches;

  constructor (replySocket: Reply, publisherSocket: Publisher, caches: ModelEventServerCaches) {
    this.replySocket = replySocket;
    this.publisherSocket = publisherSocket;
    this.caches = caches;
  }


  async createBuilding (request: any): Promise<void> {
    const building: Building = new Building({
      id: Utils.uuid(),
      tycoonId: request.tycoonId,
      corporationId: request.corporationId,
      companyId: request.companyId,
      definitionId: request.definitionId,
      townId: request.townId,
      name: request.name ?? undefined,
      mapX: request.mapX,
      mapY: request.mapY,
      level: 1,
      upgrading: false,
      constructionStartedAt: undefined,
      constructionFinishedAt: undefined,
      condemnedAt: undefined
    });

    const planetCache = this.caches.planet.withPlanetId(request.planetId);
    const buildingCache = this.caches.building.withPlanetId(request.planetId);
    const definition: BuildingDefinition | undefined = buildingCache.buildingConfigurations.definitionById[building.definitionId];
    const simulationDefinition: SimulationDefinition | undefined = buildingCache.buildingConfigurations.simulationById[building.definitionId];
    const imageDefinition: BuildingImageDefinition | undefined = definition ? buildingCache.buildingConfigurations.imageById[definition.imageId] : undefined;
    if (!definition || !simulationDefinition || !imageDefinition) {
      this.replySocket.send(JSON.stringify({ error: 'INVALID_DEFINITION' }));
      return;
    }

    const summary: InventionSummary = this.caches.inventionSummary.withPlanetId(request.planetId).forCompanyId(building.companyId);
    if (definition.requiredInventionIds.length && !definition.requiredInventionIds.every(id => summary.completedIds.has(id))) {
      await this.replySocket.send(JSON.stringify({ error: 'MISSING_RESEARCH' }));
      return;
    }

    if (buildingCache.isPositionOccupied(building.mapX, building.mapY, imageDefinition.tileWidth, imageDefinition.tileHeight)) {
      await this.replySocket.send(JSON.stringify({ error: 'POSITION_OCCUPIED' }));
      return;
    }

    // TODO: check roads

    const construction: BuildingConstruction | undefined = simulationDefinition.constructionInputs.length ? new BuildingConstruction(building.id, simulationDefinition.constructionInputs.map((q: ConstructionQuantity) => {
      const resourceType = this.caches.coreConfigurations[request.planetId].resourceTypeById[q.resourceId];
      const maxPrice = (resourceType?.price ?? 0) * 4;
      return new ConstructionResource(q.resourceId, q.quantity, q.maxVelocity, maxPrice, 0, 0, 0, 0, 0, 0);
    })) : undefined;
    if (construction) {
      this.caches.buildingConstruction.withPlanetId(request.planetId).update(construction);
    }
    else {
      building.level = 1;
      building.constructionStartedAt = planetCache.planet.time;
      building.constructionFinishedAt = planetCache.planet.time;
    }

    const laborMetricsByResourceId: Record<string, BuildingLaborMetrics> = {};
    const laborSettingsByResourceId: Record<string, BuildingLaborSettings> = {};
    if (isSimulationWithLabor(simulationDefinition)) {
      for (const job of simulationDefinition.labor) {
        const price = this.caches.coreConfigurations[request.planetId]?.resourcePrice(job.resourceId) ?? 0;
        laborMetricsByResourceId[job.resourceId] = new BuildingLaborMetrics(job.resourceId, 0, 0, 0);
        laborSettingsByResourceId[job.resourceId] = new BuildingLaborSettings(job.resourceId, price * 1.5);
      }
    }

    const serviceMetricsByResourceId: Record<string, BuildingServiceMetrics> = {};
    const serviceSettingsByResourceId: Record<string, BuildingServiceSettings> = {};
    if (isSimulationWithOperations(simulationDefinition)) {
      for (const operation of simulationDefinition.operations) {
        serviceMetricsByResourceId[operation.resourceId] = new BuildingServiceMetrics(operation.resourceId, 0);
        serviceSettingsByResourceId[operation.resourceId] = new BuildingServiceSettings(operation.resourceId, 0);
      }
    }

    const inputMetricsByResourceId: Record<string, BuildingInputMetrics> = {};
    const inputSettingsByResourceId: Record<string, BuildingInputSettings> = {};
    if (isSimulationWithInputs(simulationDefinition)) {
      for (const input of simulationDefinition.inputs) {
        const price = this.caches.coreConfigurations[request.planetId]?.resourcePrice(input.resourceId) ?? 0;
        inputMetricsByResourceId[input.resourceId] = new BuildingInputMetrics(input.resourceId, 0, 0, 0, 0);
        inputSettingsByResourceId[input.resourceId] = new BuildingInputSettings(input.resourceId, price * 4, 0);
      }
    }

    const outputMetricsByResourceId: Record<string, BuildingOutputMetrics> = {};
    const outputSettingsByResourceId: Record<string, BuildingOutputSettings> = {};
    if (isSimulationWithOutputs(simulationDefinition)) {
      for (const output of simulationDefinition.outputs) {
        const price = this.caches.coreConfigurations[request.planetId]?.resourcePrice(output.resourceId) ?? 0;
        outputMetricsByResourceId[output.resourceId] = new BuildingOutputMetrics(output.resourceId, 0, 0);
        outputSettingsByResourceId[output.resourceId] = new BuildingOutputSettings(output.resourceId, price * 3);
      }
    }

    const rentMetricsByResourceId: Record<string, BuildingRentMetrics> = {};
    const rentSettingsByResourceId: Record<string, BuildingRentSettings> = {};
    if (simulationDefinition instanceof ResidenceDefinition) {
      const rsourceId = simulationDefinition.residentType;
      rentMetricsByResourceId[rsourceId] = new BuildingRentMetrics(rsourceId, 0, 0, 0, 0, 0);
      rentSettingsByResourceId[rsourceId] = new BuildingRentSettings(rsourceId, 1, 1);
    }

    const storageMetricsByResourceId: Record<string, BuildingStorageMetrics> = {};
    const storageSettingsByResourceId: Record<string, BuildingStorageSettings> = {};
    if (isSimulationWithStorage(simulationDefinition)) {
      for (const storage of simulationDefinition.storage) {
        storageMetricsByResourceId[storage.resourceId] = new BuildingStorageMetrics(storage.resourceId, 0, 0);
        storageSettingsByResourceId[storage.resourceId] = new BuildingStorageSettings(storage.resourceId, false);

        const price = this.caches.coreConfigurations[request.planetId]?.resourcePrice(storage.resourceId) ?? 0;
        inputMetricsByResourceId[storage.resourceId] = new BuildingInputMetrics(storage.resourceId, 0, 0, 0, 0);
        inputSettingsByResourceId[storage.resourceId] = new BuildingInputSettings(storage.resourceId, price * 4, 0);

        outputMetricsByResourceId[storage.resourceId] = new BuildingOutputMetrics(storage.resourceId, 0, 0);
        outputSettingsByResourceId[storage.resourceId] = new BuildingOutputSettings(storage.resourceId, price * 3);
      }
    }

    if (simulationDefinition instanceof HeadquartersDefinition) {
      for (const resourceId of Array.from(buildingCache.buildingConfigurations.serviceResourceIdsBySealId[definition.sealId] ?? [])) {
        const price = this.caches.coreConfigurations[request.planetId]?.resourcePrice(resourceId) ?? 0;
        inputMetricsByResourceId[resourceId] = new BuildingInputMetrics(resourceId, 0, 0, 0, 0);
        inputSettingsByResourceId[resourceId] = new BuildingInputSettings(resourceId, price * 4, 0);
      }
    }

    const connections = [];
    const tradeCenter = buildingCache.forTownId(building.townId).find(b => buildingCache.buildingConfigurations.simulationById[b.definitionId] instanceof TradeCenterDefinition);
    if (tradeCenter && !(simulationDefinition instanceof StorageDefinition)) {
      for (const resourceId of Object.keys(inputSettingsByResourceId)) {
        connections.push(new BuildingConnection(Utils.uuid(), tradeCenter.id, building.id, resourceId, planetCache.planet.time));
      }
    }

    const settings = new BuildingSettings({
      buildingId: building.id,
      inputByResourceId: inputSettingsByResourceId,
      laborByResourceId: laborSettingsByResourceId,
      outputByResourceId: outputSettingsByResourceId,
      rentByResourceId: rentSettingsByResourceId,
      serviceByResourceId: serviceSettingsByResourceId,
      storageByResourceId: storageSettingsByResourceId,
      closed: false,
      connectionPosture: ConnectionPosture.ANYONE,
      allowIncomingSettings: true,
      requestedLevel: 1
    });

    const metrics = new BuildingMetrics({
      buildingId: building.id,
      inputByResourceId: inputMetricsByResourceId,
      laborByResourceId: laborMetricsByResourceId,
      outputByResourceId: outputMetricsByResourceId,
      rentByResourceId: rentMetricsByResourceId,
      serviceByResourceId: serviceMetricsByResourceId,
      storageByResourceId: storageMetricsByResourceId
    });

    buildingCache.update(building);
    this.caches.buildingMetrics.withPlanetId(request.planetId).update(metrics);
    this.caches.buildingSettings.withPlanetId(request.planetId).update(settings);
    if (connections.length) {
      this.caches.buildingConnection.withPlanetId(request.planetId).update(connections);
    }

    await this.replySocket.send(JSON.stringify({ building: building.toJson() }));
    await this.publisherSocket.send(['BUILDING:UPDATE', JSON.stringify({ planetId: request.planetId, building: building.toJson() })]);
    await this.publisherSocket.send(['BUILDING_METRICS:UPDATE', JSON.stringify({ planetId: request.planetId, metrics: metrics.toJson() })]);
    await this.publisherSocket.send(['BUILDING_SETTINGS:UPDATE', JSON.stringify({ planetId: request.planetId, settings: settings.toJson() })]);
    if (construction) {
      await this.publisherSocket.send(['BUILDING_CONSTRUCTION:UPDATE', JSON.stringify({ planetId: request.planetId, construction: construction.toJson() })]);
    }
  }

  async renameBuilding (request: any): Promise<void> {
    const building: Building | undefined = this.caches.building.withPlanetId(request.planetId).forId(request.buildingId);
    if (!building) {
      await this.replySocket.send(JSON.stringify({ error: 'UNKNOWN_BUILDING' }));
      return;
    }

    if ((request.name?.length ?? 0) > 3) {
      building.name = request.name;
      this.caches.building.withPlanetId(request.planetId).update(building);
    }

    await this.replySocket.send(JSON.stringify({ building: building.toJson() }));
    await this.publisherSocket.send(['BUILDING:UPDATE', JSON.stringify({ planetId: request.planetId, building: building.toJson() })]);
  }

  async demolishBuilding (request: any): Promise<void> {
    const building: Building | undefined = this.caches.building.withPlanetId(request.planetId).forId(request.buildingId);
    if (!building) {
      await this.replySocket.send(JSON.stringify({ error: 'UNKNOWN_BUILDING' }));
      return;
    }

    if (!building.condemnedAt || building.condemnedAt > this.caches.planet.withPlanetId(request.planetId).planet.time) {
      building.condemnedAt = this.caches.planet.withPlanetId(request.planetId).planet.time;
      this.caches.building.withPlanetId(request.planetId).update(building);
    }

    await this.replySocket.send(JSON.stringify({ building: building.toJson() }));
    await this.publisherSocket.send(['BUILDING:UPDATE', JSON.stringify({ planetId: request.planetId, building: building.toJson() })]);
  }

  async cloneBuilding (request: any): Promise<void> {
    const buildingCache = this.caches.building.withPlanetId(request.planetId);
    const buildingSettingsCache = this.caches.buildingSettings.withPlanetId(request.planetId);

    const building: Building | undefined = buildingCache.forId(request.buildingId);
    const corporation: Corporation | undefined = building?.corporationId ? this.caches.corporation.withPlanetId(request.planetId).forId(building.corporationId) : undefined;
    const settings: BuildingSettings | undefined = buildingSettingsCache.forBuildingId(request.buildingId);

    if (!building || !corporation || !settings) {
      await this.replySocket.send(JSON.stringify({ count: 0 }));
    }
    else {
      const cloneSettings: BuildingCloneSettings = BuildingCloneSettings.fromJson(request.settings);

      const promises = [];
      let buildingsUpdated = 0;
      for (const companyId of corporation.companyIds) {
        if (cloneSettings.sameCompany && companyId !== building.companyId) {
          continue;
        }

        for (const companyBuilding of buildingCache.forCompanyId(companyId)) {
          if (companyBuilding.id === building.id || companyBuilding.definitionId !== building.definitionId || !companyBuilding.constructed || cloneSettings.sameTown && companyBuilding.townId !== building.townId) {
            continue;
          }

          const companySettings: BuildingSettings | undefined = buildingSettingsCache.forBuildingId(companyBuilding.id);
          if (!companySettings || !companySettings.allowIncomingSettings) {
            continue;
          }

          let buildingUpdated = false;
          let settingsUpdated = false;

          if (cloneSettings.cloneName) {
            if (companyBuilding.name !== building.name) {
              companyBuilding.name = building.name;
              buildingUpdated = true;
            }
          }

          if (cloneSettings.cloneConnectionPosture) {
            if (companySettings.connectionPosture !== settings.connectionPosture) {
              companySettings.connectionPosture = settings.connectionPosture;
              settingsUpdated = true;
            }
          }

          if (cloneSettings.cloneSalaries) {
            for (const [resourceId, labor] of Object.entries(settings.laborByResourceId)) {
              if (companySettings.laborByResourceId[resourceId] && companySettings.laborByResourceId[resourceId].price !== labor.price) {
                companySettings.laborByResourceId[resourceId].price = labor.price;
                settingsUpdated = true;
              }
            }
          }

          if (cloneSettings.clonePrice) {
            for (const [resourceId, output] of Object.entries(settings.outputByResourceId)) {
              if (companySettings.outputByResourceId[resourceId] && companySettings.outputByResourceId[resourceId].price !== output.price) {
                companySettings.outputByResourceId[resourceId].price = output.price;
                settingsUpdated = true;
              }
            }
          }

          if (cloneSettings.cloneSupplies) {
            for (const [resourceId, output] of Object.entries(settings.inputByResourceId)) {
              if (companySettings.inputByResourceId[resourceId] && companySettings.inputByResourceId[resourceId].maxPrice !== output.maxPrice) {
                companySettings.inputByResourceId[resourceId].maxPrice = output.maxPrice;
                settingsUpdated = true;
              }
              if (companySettings.inputByResourceId[resourceId] && companySettings.inputByResourceId[resourceId].minQuality !== output.minQuality) {
                companySettings.inputByResourceId[resourceId].minQuality = output.minQuality;
                settingsUpdated = true;
              }
            }

            // TODO: need to clone connections too
          }

          if (cloneSettings.cloneServices) {
            for (const [resourceId, service] of Object.entries(settings.serviceByResourceId)) {
              if (companySettings.serviceByResourceId[resourceId] && companySettings.serviceByResourceId[resourceId].requestedVelocity !== service.requestedVelocity) {
                companySettings.serviceByResourceId[resourceId].requestedVelocity = service.requestedVelocity;
                settingsUpdated = true;
              }
            }
          }

          if (cloneSettings.cloneRent) {
            for (const [resourceId, rent] of Object.entries(settings.rentByResourceId)) {
              if (companySettings.rentByResourceId[resourceId] && companySettings.rentByResourceId[resourceId].rentFactor !== rent.rentFactor) {
                companySettings.rentByResourceId[resourceId].rentFactor = rent.rentFactor;
                settingsUpdated = true;
              }
            }
          }
          if (cloneSettings.cloneMaintenance) {
            for (const [resourceId, rent] of Object.entries(settings.rentByResourceId)) {
              if (companySettings.rentByResourceId[resourceId] && companySettings.rentByResourceId[resourceId].maintenanceFactor !== rent.maintenanceFactor) {
                companySettings.rentByResourceId[resourceId].maintenanceFactor = rent.maintenanceFactor;
                settingsUpdated = true;
              }
            }
          }

          if (buildingUpdated) {
            buildingCache.update(companyBuilding);
            promises.push(this.publisherSocket.send(['BUILDING:UPDATE', JSON.stringify({ planetId: request.planetId, building: companyBuilding.toJson() })]));
          }
          if (settingsUpdated) {
            buildingSettingsCache.update(companySettings);
            promises.push(this.publisherSocket.send(['BUILDING_SETTINGS:UPDATE', JSON.stringify({ planetId: request.planetId, settings: companySettings.toJson() })]));
          }

          buildingsUpdated += (buildingUpdated || settingsUpdated ? 1 : 0);
        }
      }

      await this.replySocket.send(JSON.stringify({ count: buildingsUpdated }));
      if (promises.length) {
        await Promise.all(promises);
      }
    }
  }
}
