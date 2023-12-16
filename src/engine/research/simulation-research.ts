import { InventionDefinition } from '@starpeace/starpeace-assets-types';

import { SimulationCaches } from '../simulation.js';
import SimulationContext from '../simulation-context.js';
import SimulationFinancesFrame from '../finances/simulation-finances-frame.js';
import SimulationResearchFrame, { SimulationActiveResearch } from './simulation-research-frame.js';

import { InventionConfigurations } from '../../core/galaxy-manager.js';
import Company from '../../company/company.js';
import InventionSummary from '../../company/invention-summary.js';

export default class SimulationResearch {
  inventionConfigurations: InventionConfigurations;
  caches: SimulationCaches;
  context: SimulationContext;

  constructor (inventionConfigurations: InventionConfigurations, caches: SimulationCaches, context: SimulationContext) {
    this.inventionConfigurations = inventionConfigurations;
    this.caches = caches;
    this.context = context;
  }

  simulateResarch (companyById: Record<string, Company>, finances: SimulationFinancesFrame): SimulationResearchFrame {
    const deletedInventionIdsByCompanyId: Record<string, Set<string>> = {};
    const completedInventionIdByCompanyId: Record<string, string> = {};
    const activeResearchByCompanyId: Record<string, SimulationActiveResearch> = {};

    const companyIdsWithResearch: string[] = Array.from(this.context.companyIdsWithResearch);
    const companyIdsWithoutResearch: Set<string> = new Set();
    for (const companyId of companyIdsWithResearch) {
      const company: Company = companyById[companyId];
      const summary: InventionSummary = this.caches.inventionSummary.forCompanyId(companyId);
      if (summary.canceledIds.size > 0) {
        const deletedIds: Set<string> = new Set();
        let refund: number = 0;
        for (const inventionId of Array.from(summary.canceledIds)) {
          const definition: InventionDefinition | undefined = this.inventionConfigurations.definitionsById[inventionId];
          if (!definition) continue;
          // TODO: also validate nothing depends on research

          const pendingIndex: number = summary.pendingIds.indexOf(inventionId);
          if (summary.completedIds.has(inventionId)) {
            // TODO: handle rebates
            refund += <number> definition.properties.price ?? 0;
            summary.completedIds.delete(inventionId);
            deletedIds.add(inventionId);
          }
          else if (summary.activeId == inventionId) {
            refund += summary.activeInvestment;
            summary.activeId = null;
            summary.activeInvestment = 0;
            deletedIds.add(inventionId);
          }
          else if (pendingIndex >= 0) {
            summary.pendingIds.splice(pendingIndex, 1);
            deletedIds.add(inventionId);
          }
        }

        finances.adjustCompanyCashflow(company.corporationId, companyId, refund);
        deletedInventionIdsByCompanyId[companyId] = deletedIds;
        summary.canceledIds.clear();
      }
      else if (summary.activeId) {
        const definition: InventionDefinition | undefined = this.inventionConfigurations.definitionsById[summary.activeId];
        const totalCost: number = <number> definition?.properties?.price ?? 0;
        if (!definition) {
          deletedInventionIdsByCompanyId[companyId] = new Set([summary.activeId]);
          summary.activeId = null;
          summary.activeInvestment = 0;
        }
        else if (summary.isCompleted(summary.activeId) || summary.activeInvestment >= totalCost) {
          completedInventionIdByCompanyId[companyId] = summary.activeId;
          summary.completedIds.add(summary.activeId);
          summary.activeId = null;
          summary.activeInvestment = 0;
        }
        else {
          const cashAvailable: number = finances.corporationCashAvailable(company.corporationId);
          const costPerHour: number = totalCost / 48; // TODO: improve research length (dynamic?)
          const cost: number = Math.min(totalCost - summary.activeInvestment, costPerHour, cashAvailable);
          if (cost > 0) {
            summary.activeInvestment += cost;
            finances.adjustCompanyCashflow(company.corporationId, companyId, -cost);
            activeResearchByCompanyId[companyId] = new SimulationActiveResearch(summary.activeId, summary.activeInvestment);
          }
        }
      }
      else if (summary.pendingIds.length > 0) {
        summary.activeId = summary.pendingIds.splice(0, 1)[0];
        summary.activeInvestment = 0;
        activeResearchByCompanyId[companyId] = new SimulationActiveResearch(summary.activeId, summary.activeInvestment);
      }
      else {
        companyIdsWithoutResearch.add(companyId);
      }
    }

    this.context.completeResearch(companyIdsWithoutResearch);

    return new SimulationResearchFrame(
      deletedInventionIdsByCompanyId,
      completedInventionIdByCompanyId,
      activeResearchByCompanyId
    );
  }
}
