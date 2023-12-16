import { isSimulationWithLabor } from '@starpeace/starpeace-assets-types';
import Building from '../../building/building.js';
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

  gatherGovernmentMetrics (towns: Array<Town>, buildings: Record<string, Building>): Array<GovernmentMetrics> {

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

    for (const building of Object.values(buildings)) {
      const definition = this.buildingConfigurations.simulationById[building.definitionId];
      if (isSimulationWithLabor(definition)) {
        jobsTotalByTownIdReourceId[building.townId] ||= {};
        jobsVacanciesByTownIdReourceId[building.townId] ||= {};

        for (const job of definition.labor) {
          jobsTotalByTownIdReourceId[building.townId][job.resourceId] ||= 0;
          jobsTotalByTownIdReourceId[building.townId][job.resourceId] += (building.level * job.maxVelocity);

          jobsVacanciesByTownIdReourceId[building.townId][job.resourceId] ||= 0;
          jobsVacanciesByTownIdReourceId[building.townId][job.resourceId] += (building.level * job.maxVelocity);
        }
      }
    }

    const metrics: Array<GovernmentMetrics> = [];
    for (const town of towns) {
      const services: Array<Service> = Service.TYPES.map((t) => new Service(t, 0));
      const commerce: Array<Commerce> = commerceIndustryTypeIds.map((t) => new Commerce(t, 0, 0, 0, 0, 0, 0, 0));

      const population: Array<Population> = [];
      const employment: Array<Employment> = [];
      const housing: Array<Housing> = [];

      for (const resourceId of LABOR_RESOURCE_IDS) {
        population.push(new Population(resourceId, 0, 0, 0));
        employment.push(new Employment(resourceId, jobsTotalByTownIdReourceId[town.id]?.[resourceId] ?? 0, jobsVacanciesByTownIdReourceId[town.id]?.[resourceId] ?? 0, 0, 1, 0));
        housing.push(new Housing(resourceId, 0, 0, 1, 0));
      }

      metrics.push(new GovernmentMetrics(town.id, 0, services, commerce, population, employment, housing));
    }
    return metrics;
  }
}