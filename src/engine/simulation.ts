import winston from 'winston';

import SimulationEventPublisher from '../core/events/simulation-event-publisher';
import SimulationFrame, { SimulationActiveResearch, SimulationCorporationFinances, SimulationFinancesFrame, SimulationResearchFrame } from './simulation-frame';
import Logger from '../utils/logger';

import CompanyCache from '../company/company-cache';
import CorporationCache from '../corporation/corporation-cache';
import InventionSummaryCache from '../company/invention-summary-cache';
import Planet from '../planet/planet';
import PlanetCache from '../planet/planet-cache';
import TownCache from '../planet/town-cache';
import Corporation from '../corporation/corporation';
import Town from '../planet/town';
import Building from '../building/building';
import Company from '../company/company';
import Utils from '../utils/utils';
import TycoonCache from '../tycoon/tycoon-cache';
import BuildingCache from '../building/building-cache';
import RankingsCache from '../corporation/rankings-cache';
import SimulationContext from './simulation-context';
import InventionSummary from '../company/invention-summary';
import { InventionDefinition } from '@starpeace/starpeace-assets-types';
import { BuildingConfigurations, InventionConfigurations } from '../core/galaxy-manager';


const FRAME_DURATION_MS = 500;

export interface SimulationCaches {
  tycoon: TycoonCache;
  building: BuildingCache;
  company: CompanyCache;
  corporation: CorporationCache;
  inventionSummary: InventionSummaryCache;
  planet: PlanetCache;
  rankings: RankingsCache;
  town: TownCache;
}

export default class Simulation {
  logger: winston.Logger;
  simulationLogger: winston.Logger;
  eventPublisher: SimulationEventPublisher;

  planetId: string;
  buildingConfigurations: BuildingConfigurations;
  inventionConfigurations: InventionConfigurations;
  caches: SimulationCaches;

  context: SimulationContext;
  running: boolean = false;

  constructor (logger: winston.Logger, eventPublisher: SimulationEventPublisher, planetId: string, buildingConfigurations: BuildingConfigurations, inventionConfigurations: InventionConfigurations, caches: SimulationCaches, context: SimulationContext) {
    this.logger = logger;
    this.eventPublisher = eventPublisher;
    this.planetId = planetId;
    this.buildingConfigurations = buildingConfigurations;
    this.inventionConfigurations = inventionConfigurations;
    this.caches = caches;
    this.context = context;

    this.simulationLogger = Logger.createSimulationLogger();
  }

  start (): void {
    this.logger.info(`Starting simulation engine for planet ${this.planetId}`);
    this.running = true;
    this.setupContext();
    this.mainLoop();
  }

  stop (): void {
    this.logger.info('Stopping engine...');
    this.running = false;
  }

  setupContext (): void {
    const companies: Company[] = this.caches.company.all();
    for (const company of companies) {
      const summary = this.caches.inventionSummary.forCompanyId(company.id);
      if (summary.activeId?.length || summary.pendingIds.length || summary.canceledIds.size) {
        this.context.companyIdsWithResearch.add(company.id);
      }
    }
  }

  mainLoop (): void {
    if (!this.running) {
      this.logger.info('Engine stopped');
      return;
    }

    const startMs = Utils.currentMs();
    const frame: SimulationFrame = this.simulate();
    const endMs = Utils.currentMs();

    const durationMs = Math.round(endMs - startMs);
    const toWait = durationMs > FRAME_DURATION_MS ? 0 : Math.max(0, (FRAME_DURATION_MS - durationMs));

    this.eventPublisher.sendEvent(frame);
    setTimeout(() => this.mainLoop(), toWait);
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

        finances.financesByCorporationId[company.corporationId].cashflow += refund;
        finances.cashflowByCompanyId[companyId] += refund;
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
          const cashAvailable: number = Math.max(0, finances.financesByCorporationId[company.corporationId].cash + finances.financesByCorporationId[company.corporationId].cashflow);
          const costPerHour: number = totalCost / 48; // TODO: improve research length (dynamic?)
          const cost: number = Math.min(totalCost - summary.activeInvestment, costPerHour, cashAvailable);
          if (cost > 0) {
            summary.activeInvestment += cost;
            finances.financesByCorporationId[company.corporationId].cashflow -= cost;
            finances.cashflowByCompanyId[companyId] -= cost;
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

  simulate (): SimulationFrame {
    const planet: Planet = this.caches.planet.planet;
    planet.time = planet.time.plus({ hour: 1 });

    const corporations: Corporation[] = this.caches.corporation.all();
    const corporationById: Record<string, Corporation> = Object.fromEntries(corporations.map(c => [c.id, c]));
    const companies: Company[] = this.caches.company.all();
    const companyById: Record<string, Company> = Object.fromEntries(companies.map(c => [c.id, c]));
    const buildings: Building[] = [];
    const towns: Town[] = this.caches.town.all();

    this.simulationLogger.info("[%s] %d corporations, %d companies, %d towns, %d buildings", planet.planetTime, corporations.length, companies.length, towns.length, buildings.length);

    const financesByCorporationId: Record<string, SimulationCorporationFinances> = {};
    const cashflowByCompanyId: Record<string, number> = {};

    for (const corporation of corporations) {
      financesByCorporationId[corporation.id] = new SimulationCorporationFinances(corporation.cash, 0);
    }
    for (const company of companies) {
      cashflowByCompanyId[company.id] = 0;
    }

    const financesFrame: SimulationFinancesFrame = new SimulationFinancesFrame(financesByCorporationId, cashflowByCompanyId);
    const researchFrame: SimulationResearchFrame = this.simulateResarch(companyById, financesFrame);

    // update caches
    for (const [companyId, cashflow] of Object.entries(cashflowByCompanyId)) {
      companyById[companyId].cashflow = cashflow;
    }
    for (const [corporationId, finances] of Object.entries(financesByCorporationId)) {
      finances.cash += finances.cashflow;
      corporationById[corporationId].cash = finances.cash;
      corporationById[corporationId].cashflow = finances.cashflow;
    }

    return new SimulationFrame(this.planetId, planet, financesFrame, researchFrame);
  }

}
