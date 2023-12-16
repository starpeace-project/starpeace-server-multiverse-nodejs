import { DateTime } from 'luxon';

import { SimulationCaches } from '../simulation.js';
import SimulationBuildingFrame from './simulation-buildings-frame.js';
import SimulationContext from '../simulation-context.js';
import SimulationFinancesFrame from '../finances/simulation-finances-frame.js';

import Building from '../../building/building.js';
import BuildingConstruction, { ConstructionResource } from '../../building/construction/building-construction.js';

import { BuildingConfigurations, CoreConfigurations } from '../../core/galaxy-manager.js';
import { HeadquartersDefinition, SimulationDefinition, isSimulationWithLabor, isSimulationWithOperations } from '@starpeace/starpeace-assets-types';
import BuildingSettings from '../../building/settings/building-settings.js';
import BuildingLaborSettings from '../../building/settings/building-labor-settings.js';
import BuildingMetrics from '../../building/metrics/building-metrics.js';
import BuildingServiceSettings from '../../building/settings/building-service-settings.js';

export interface BuildingSimulationParameters {
  planetTime: DateTime;

  buildingById: Record<string, Building>;
  constructionById: Record<string, BuildingConstruction>;
  metricsById: Record<string, BuildingMetrics>;
  settingsById: Record<string, BuildingSettings>;

  finances: SimulationFinancesFrame;
}

export default class SimulationBuildings {
  coreConfigurations: CoreConfigurations;
  buildingConfigurations: BuildingConfigurations;
  caches: SimulationCaches;
  context: SimulationContext;

  constructor (coreConfigurations: CoreConfigurations, buildingConfigurations: BuildingConfigurations, caches: SimulationCaches, context: SimulationContext) {
    this.coreConfigurations = coreConfigurations;
    this.buildingConfigurations = buildingConfigurations;
    this.caches = caches;
    this.context = context;
  }

  resetConstruction (building: Building, construction: BuildingConstruction, forUpgrade: boolean): boolean {
    const previousResourceById = Object.fromEntries(construction.resources.map(r => [r.resourceId, r]));
    construction.resources = this.buildingConfigurations.simulationById[building.definitionId].constructionInputs.map(c => {
      const resourceType = this.coreConfigurations.resourceTypeById[c.resourceId];
      const maxPrice = previousResourceById?.[c.resourceId]?.maxPrice ?? (resourceType?.price ?? 0) * 4;
      const minQuality = previousResourceById?.[c.resourceId]?.minQuality ?? 0;
      return new ConstructionResource(c.resourceId, c.quantity / (forUpgrade ? 2 : 1), c.maxVelocity, maxPrice, minQuality, 0, 0, 0, 0, 0);
    });
    // TODO: optimize to only return when reset different
    return true;
  }

  simulateConstruction (building: Building, construction: BuildingConstruction, finances: SimulationFinancesFrame): boolean {
    let constructionUpdated = false;
    for (const resource of construction.resources) {
      const resourceType = this.coreConfigurations.resourceTypeById[resource.resourceId];
      const price = (resourceType?.price ?? 0) * 2.5;
      const remainingQuantity = Math.min(resource.maxVelocity, Math.max(0, resource.totalQuantity - resource.completedQuantity));

      const cashAvailable: number = finances.corporationCashAvailable(building.corporationId);
      const maxPurchasableQuantity: number = price <= 0 ? 0 : (cashAvailable / price);

      const toPurchase = Math.min(remainingQuantity, maxPurchasableQuantity);
      if (resourceType && toPurchase > 0) {
        const cost = toPurchase * price;
        finances.adjustBuildingCashflow(building.corporationId, building.companyId, building.id, -cost);

        resource.mostRecentVelocity = toPurchase;
        resource.mostRecentPrice = price;
        resource.mostRecentTotalQuality = toPurchase * .4;
        resource.completedQuantity += toPurchase;
        resource.completedQualityTotal += (toPurchase * .4);
        constructionUpdated = true;
      }
      else {
        if (resource.mostRecentVelocity > 0 || resource.mostRecentTotalQuality > 0) {
          constructionUpdated = true;
        }
        resource.mostRecentVelocity = 0;
        resource.mostRecentPrice = 0;
        resource.mostRecentTotalQuality = 0;
      }
    }

    return constructionUpdated;
  }

  // pullInputs ()  {
    // let capacity = 0;
    // // if (noMoney) capacity = 0;

    // for (let connection of []) { // inputs
    //   connection.sinkCapacity = capacity;
    //   connection.velocity = Math.min(capacity, connection.sourceCapacity);

    //   if (connection.velocity > 0) {
    //     // lower source storage
    //     // raise sink storage, with quality
    //     // raise source money
    //     // lower sink money
    //     capacity -= connection.velocity;
    //   }
    // }
  // }
  // doAction () {
    // let sinkCapacity: number = 0
    // for (let connection of []) { // outputs
    //   sinkCapacity += connection.sinkCapacity;
    // }

    // let freeSpace: number = 0;
    // let maxVelocity: number = 0;
    // let capacity: number = _.min([freeSpace, sinkCapacity, maxVelocity]);

    // for (let connection of []) { // outputs
    //   connection.sourceCapacity = capacity
    //   connection.resourceQuality = 0

    //   let velocity = Math.min(capacity, connection.sinkCapacity)
    //   if (velocity > 0) {
    //     capacity -= velocity;
    //   }
    // }
  // }

  simulationBuilding (parameters: BuildingSimulationParameters): SimulationBuildingFrame {
    const updatedConstructions: Array<BuildingConstruction> = [];
    const addedBuildingIds = new Set<string>();
    const deletedBuildingIds = new Set<string>();
    const updatedBuildings: Array<Building> = [];
    const updatedMetricsByBuildingId: Map<string, BuildingMetrics> = new Map();

    const serviceDemandByCompanyIdResourceId: Record<string, Record<string, number>> = {};
    const headquartersByCompanyId: Record<string, Building> = {};

    for (const building of Object.values(parameters.buildingById)) {
      const definition: SimulationDefinition | undefined = this.buildingConfigurations.simulationById[building.definitionId];
      const construction = parameters.constructionById[building.id];
      const settings = parameters.settingsById[building.id];
      const metrics = parameters.metricsById[building.id];

      if (!!building.condemnedAt && building.condemnedAt < parameters.planetTime) {
        deletedBuildingIds.add(building.id);

        if (metrics?.clear()) {
          updatedMetricsByBuildingId.set(building.id, metrics);
        }
      }
      else if (settings?.closed) {
        if (metrics?.clear()) {
          updatedMetricsByBuildingId.set(building.id, metrics);
        }
      }
      else if (!building.constructionFinishedAt) {
        if (!construction) {
          // TODO: log or do something?
        }
        else if (construction.completed) {
          if (!building.constructionStartedAt) {
            building.constructionStartedAt = parameters.planetTime;
            addedBuildingIds.add(building.id);
          }

          building.constructionFinishedAt = parameters.planetTime;
          updatedBuildings.push(building);
        }
        else {
          if (this.simulateConstruction(building, construction, parameters.finances)) {
            updatedConstructions.push(construction);
          }

          if (!building.constructionStartedAt) {
            building.constructionStartedAt = parameters.planetTime;
            addedBuildingIds.add(building.id);
            updatedBuildings.push(building);
          }
        }

        if (metrics?.clear()) {
          updatedMetricsByBuildingId.set(building.id, metrics);
        }
      }
      else if (building.upgrading && (!settings || settings.requestedLevel === building.level)) {
        building.upgrading = false;
        updatedBuildings.push(building);

        if (metrics?.clear()) {
          updatedMetricsByBuildingId.set(building.id, metrics);
        }
      }
      else if (settings && settings.requestedLevel < building.level) {
        // TODO: refunds?
        building.level = settings.requestedLevel;
        updatedBuildings.push(building);
      }
      else if (settings && settings.requestedLevel > building.level) {
        if (!building.upgrading) {
          building.upgrading = true;
          updatedBuildings.push(building);

          if (building.upgrading && this.resetConstruction(building, construction, true)) {
            updatedConstructions.push(construction);
          }
        }
        else if (construction.completed) {
          building.level++;
          building.upgrading = settings && settings.requestedLevel > building.level;
          updatedBuildings.push(building);

          if (building.upgrading && this.resetConstruction(building, construction, true)) {
            updatedConstructions.push(construction);
          }
        }
        else {
          if (this.simulateConstruction(building, construction, parameters.finances)) {
            updatedConstructions.push(construction);
          }
        }

        if (metrics?.clear()) {
          updatedMetricsByBuildingId.set(building.id, metrics);
        }
      }
      else if (!!building.constructionFinishedAt && definition) {
        let updated = false;

        if (isSimulationWithLabor(definition) && definition.labor?.length) {
          if (definition.labor?.length !== Object.keys(settings?.laborByResourceId ?? {}).length) {
            // unexpected, but clear out edge-case metrics
            // TODO: should we log or do more?
            metrics?.clearLabor();
          }

          for (const labor of definition.labor) {
            const laborSettings: BuildingLaborSettings | undefined = settings?.laborByResourceId[labor.resourceId];

            const resourceType = this.coreConfigurations.resourceTypeById[labor.resourceId];
            const price = laborSettings?.price ?? ((resourceType?.price ?? 0) * 2.5);

            const cashAvailable: number = parameters.finances.corporationCashAvailable(building.corporationId);
            const maxHirableQuantity: number = price <= 0 ? 0 : (cashAvailable / price);

            const toHireQuantity = Math.max(labor.minVelocity ?? 0, Math.min(building.level * labor.maxVelocity, maxHirableQuantity));
            if (toHireQuantity > 0) {
              const cost = toHireQuantity * price;
              parameters.finances.adjustBuildingCashflow(building.corporationId, building.companyId, building.id, -cost);
            }

            updated = metrics?.updateLabor(labor.resourceId, toHireQuantity, 0) || updated;
          }
        }
        else {
          updated = metrics?.clearLabor() || updated;
        }

        if (isSimulationWithOperations(definition) && definition.operations?.length) {
          for (const service of definition.operations) {
            const serviceSettings: BuildingServiceSettings | undefined = settings?.serviceByResourceId[service.resourceId];
            const requested = Math.max(0, Math.min(serviceSettings.requestedVelocity, building.level * service.maxVelocity));
            if (requested > 0) {
              serviceDemandByCompanyIdResourceId[building.companyId] ||= {}
              serviceDemandByCompanyIdResourceId[building.companyId][service.resourceId] ||= 0;
              serviceDemandByCompanyIdResourceId[building.companyId][service.resourceId] += requested;
            }
          }
        }

        if (updated && metrics) {
          updatedMetricsByBuildingId.set(building.id, metrics);
        }

        if (definition instanceof HeadquartersDefinition) {
          headquartersByCompanyId[building.companyId] = building;
        }
      }
    }

    for (const [companyId, building] of Object.entries(headquartersByCompanyId)) {
      const metrics = parameters.metricsById[building.id];
      let updated = false;
      for (const [resourceId, demand] of Object.entries(serviceDemandByCompanyIdResourceId[companyId] ?? {})) {
        updated = metrics?.updateInput(resourceId, demand, 0, 0, 0) || updated;
      }
      if (updated && metrics) {
        updatedMetricsByBuildingId.set(building.id, metrics);
      }
    }

    return new SimulationBuildingFrame(updatedConstructions, addedBuildingIds, deletedBuildingIds, updatedBuildings, Array.from(updatedMetricsByBuildingId.values()));
  }
}
