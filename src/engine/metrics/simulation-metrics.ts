import { isSimulationWithLabor } from '@starpeace/starpeace-assets-types';

import Building from '../../building/building.js';
import BuildingMetrics from '../../building/metrics/building-metrics.js';

import { BuildingConfigurations, CoreConfigurations } from '../../core/galaxy-manager.js';
import GovernmentMetrics, { Commerce, Employment, Housing, LABOR_RESOURCE_IDS, Population, Service } from '../../planet/government/government-metrics.js';
import Town from '../../planet/town.js';

export default class SimulationMetrics {

  coreConfigurations: CoreConfigurations;
  buildingConfigurations: BuildingConfigurations;

  constructor (coreConfigurations: CoreConfigurations, buildingConfigurations: BuildingConfigurations) {
    this.coreConfigurations = coreConfigurations;
    this.buildingConfigurations = buildingConfigurations;
  }

  gatherGovernmentMetrics (townById: Record<string, Town>, buildings: Record<string, Building>, buildingMetricsById: Record<string, BuildingMetrics>): Array<GovernmentMetrics> {
    const typesByCategorieId: Record<string, Set<string>> = {};
    for (const definition of this.buildingConfigurations.definitions) {
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

    const jobsTotalByTownIdReourceId: Record<string, Record<string, number>> = {};
    const jobsVacanciesByTownIdReourceId: Record<string, Record<string, number>> = {};
    const jobsTotalWagesByTownIdReourceId: Record<string, Record<string, number>> = {};

    for (const building of Object.values(buildings)) {
      const definition = this.buildingConfigurations.simulationById[building.definitionId];
      if (isSimulationWithLabor(definition)) {
        jobsTotalByTownIdReourceId[building.townId] ||= {};
        jobsVacanciesByTownIdReourceId[building.townId] ||= {};
        jobsTotalWagesByTownIdReourceId[building.townId] ||= {};

        for (const job of definition.labor) {
          const buildingMetrics = buildingMetricsById[building.id]?.laborByResourceId?.[job.resourceId];
          const totalJobs = building.level * job.maxVelocity;
          const occupiedJobs = buildingMetrics?.mostRecentVelocity ?? 0;

          jobsTotalByTownIdReourceId[building.townId][job.resourceId] ||= 0;
          jobsTotalByTownIdReourceId[building.townId][job.resourceId] += (totalJobs);

          jobsVacanciesByTownIdReourceId[building.townId][job.resourceId] ||= 0;
          jobsVacanciesByTownIdReourceId[building.townId][job.resourceId] += Math.max(0, totalJobs - occupiedJobs);

          jobsTotalWagesByTownIdReourceId[building.townId][job.resourceId] ||= 0;
          jobsTotalWagesByTownIdReourceId[building.townId][job.resourceId] += (buildingMetrics?.mostRecentTotalWages ?? 0);
        }
      }
    }

    const metrics: Array<GovernmentMetrics> = [];
    for (const town of Object.values(townById)) {
      const services: Array<Service> = Service.TYPES.map((t) => new Service(t, 0));
      const commerce: Array<Commerce> = commerceIndustryTypeIds.map((t) => new Commerce(t, 0, 0, 0, 0, 0, 0, 0));

      const population: Array<Population> = [];
      const employment: Array<Employment> = [];
      const housing: Array<Housing> = [];

      for (const resourceId of LABOR_RESOURCE_IDS) {
        const totalJobs = jobsTotalByTownIdReourceId[town.id]?.[resourceId] ?? 0;
        const vacantJobs = jobsVacanciesByTownIdReourceId[town.id]?.[resourceId] ?? 0;
        const occupiedJobs = Math.max(0, totalJobs - vacantJobs);

        population.push(new Population(resourceId, 0, 0, 0));
        employment.push(new Employment(resourceId,
          totalJobs,
          vacantJobs,
          occupiedJobs == 0 ? 0 : ((jobsTotalWagesByTownIdReourceId[town.id]?.[resourceId] ?? 0) / occupiedJobs),
          0));
        housing.push(new Housing(resourceId, 0, 0, 1, 0));
      }

      metrics.push(new GovernmentMetrics(town.id, 0, services, commerce, population, employment, housing));
    }
    return metrics;
  }
}