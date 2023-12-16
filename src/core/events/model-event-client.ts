import _ from 'lodash';
import PQueue from 'p-queue';
import winston from 'winston';
import { Request } from 'zeromq';

import Tycoon from '../../tycoon/tycoon.js';
import TycoonVisa from '../../tycoon/tycoon-visa.js';

import Bookmark from '../../corporation/bookmark.js';
import Building from '../../building/building.js';
import BuildingConstruction from '../../building/construction/building-construction.js';
import Company from '../../company/company.js';
import Corporation from '../../corporation/corporation.js';
import GovernmentMetrics from '../../planet/government/government-metrics.js';
import GovernmentPolitics from '../../planet/government/government-politics.js';
import GovernmentTaxes from '../../planet/government/government-taxes.js';
import InventionSummary from '../../company/invention-summary.js';
import Mail from '../../corporation/mail.js';
import Planet from '../../planet/planet.js';
import Rankings from '../../corporation/rankings.js';
import Town from '../../planet/town.js';
import TycoonSettings from '../../tycoon/settings/tycoon-settings.js';
import BuildingSettings from '../../building/settings/building-settings.js';
import BuildingMetrics from '../../building/metrics/building-metrics.js';
import BuildingCloneSettings from '../../building/settings/building-clone-settings.js';
import BuildingConnection from '../../building/connections/building-connection.js';


const SYNC_API_PORT = 19165;


export default class ModelEventClient {
  logger: winston.Logger;
  running: boolean = false;

  requestQueue: PQueue;
  requestSocket: Request;

  constructor (logger: winston.Logger) {
    this.logger = logger;
    this.running = false;

    this.requestQueue = new PQueue({concurrency: 1});
    this.requestSocket = new Request();
  }

  start (): void {
    try {
      this.requestSocket.connect(`tcp://127.0.0.1:${SYNC_API_PORT}`);
      this.logger.info(`Model Event Client started on port ${SYNC_API_PORT}`);

      this.running = true;
    }
    catch (err) {
      if (this.running) {
        throw err;
      }
    }
  }

  stop () {
    this.running = false;
    this.logger.info('Stopping Model Event Client...');
    this.requestSocket.close();
    this.logger.info('Stopped Model Event Client');
  }


  async allTycoons (): Promise<Tycoon[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'TYCOON:LIST' }));
      const [result] = await this.requestSocket.receive();
      return _.map(JSON.parse(result.toString()).tycoons, Tycoon.fromJson);
    }, { throwOnTimeout: true });
  }
  async createTycoon (tycoon: Tycoon): Promise<Tycoon> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'TYCOON:CREATE', tycoon: tycoon.toJson() }));
      const [result] = await this.requestSocket.receive();
      return Tycoon.fromJson(JSON.parse(result.toString()).tycoon);
    }, { throwOnTimeout: true });
  }
  async tycoon (tycoonId: string): Promise<Tycoon> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'TYCOON:GET', tycoonId: tycoonId }));
      const [result] = await this.requestSocket.receive();
      return Tycoon.fromJson(JSON.parse(result.toString()).tycoon);
    }, { throwOnTimeout: true });
  }

  async getTycoonSettings (planetId: string, tycoonId: string): Promise<TycoonSettings | undefined> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'TYCOON_SETTINGS:GET', planetId: planetId, tycoonId: tycoonId }));
      const [response] = await this.requestSocket.receive();
      const settings = JSON.parse(response.toString()).settings;
      return settings ? TycoonSettings.fromJson(settings) : undefined;
    }, { throwOnTimeout: true });
  }

  async issueToken (tycoon: Tycoon): Promise<string> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'TOKEN:ISSUE', tycoonId: tycoon.id }));
      const [result] = await this.requestSocket.receive();
      return JSON.parse(result.toString()).token;
    }, { throwOnTimeout: true });
  }
  async loginToken (token: string): Promise<Tycoon> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'TOKEN:LOGIN', tokenId: token }));
      const [result] = await this.requestSocket.receive();
      return Tycoon.fromJson(JSON.parse(result.toString()).tycoon);
    }, { throwOnTimeout: true });
  }

  async allTycoonVisas (): Promise<TycoonVisa[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'VISA:LIST' }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).visas ?? []).map(TycoonVisa.fromJson);
    });
  }
  async saveVisa (visa: TycoonVisa): Promise<TycoonVisa> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'VISA:SAVE', visa: visa.toJson() }));
      const [result] = await this.requestSocket.receive();
      return TycoonVisa.fromJson(JSON.parse(result.toString()).visa);
    }, { throwOnTimeout: true });
  }
  async destroyVisa (visaId: string): Promise<void> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'VISA:DESTROY', visaId: visaId }));
      await this.requestSocket.receive();
    }, { throwOnTimeout: true });
  }

  async allCorporations (planetId: string): Promise<Corporation[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'CORPORATION:LIST', planetId: planetId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).corporations ?? []).map(Corporation.fromJson);
    });
  }
  async createCorporation (planetId: string, corporation: Corporation): Promise<Corporation> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'CORPORATION:CREATE', planetId: planetId, corporation: corporation.toJson() }));
      const [result] = await this.requestSocket.receive();
      return Corporation.fromJson(JSON.parse(result.toString()).corporation);
    }, { throwOnTimeout: true });
  }

  async allCompanies (planetId: string): Promise<Company[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'COMPANY:LIST', planetId: planetId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).companies ?? []).map(Company.fromJson);
    });
  }
  async createCompany (planetId: string, company: Company): Promise<Company> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'COMPANY:CREATE', planetId: planetId, company: company.toJson() }));
      const [result] = await this.requestSocket.receive();
      return Company.fromJson(JSON.parse(result.toString()).company);
    }, { throwOnTimeout: true });
  }

  async bookmarksForCorporation (planetId: string, corporationId: string): Promise<Bookmark[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BOOKMARK:LIST', planetId: planetId, corporationId: corporationId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).bookmarks ?? []).map(Bookmark.fromJson);
    });
  }
  async saveBookmarks (planetId: string, bookmarks: Bookmark[]): Promise<Bookmark[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BOOKMARK:SAVE', planetId: planetId, bookmarks: _.map(bookmarks, (bookmark) => bookmark.toJson()) }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).bookmarks ?? []).map(Bookmark.fromJson);
    });
  }

  async listTownBuildings (planetId: string, townId: string): Promise<Building[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING:LIST', planetId: planetId, townId: townId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).buildings ?? []).map(Building.fromJson);
    });
  }
  async constructBuilding (planetId: string, tycoonId: string, corporationId: string, companyId: string, definitionId: string, townId: string, name: string | undefined, mapX: number, mapY: number): Promise<Building> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING:CREATE', planetId, tycoonId, corporationId, companyId, definitionId, townId, name, mapX, mapY }));
      const [result] = await this.requestSocket.receive();
      const jsonResult = JSON.parse(result.toString());
      if (jsonResult.error) {
        throw jsonResult.error;
      }
      else {
        return Building.fromJson(jsonResult.building);
      }
    }, { throwOnTimeout: true });
  }
  async renameBuilding (planetId: string, buildingId: string, name: string): Promise<Building> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING:RENAME', planetId, buildingId, name }));
      const [result] = await this.requestSocket.receive();
      const jsonResult = JSON.parse(result.toString());
      if (jsonResult.error) {
        throw jsonResult.error;
      }
      else {
        return Building.fromJson(jsonResult.building);
      }
    }, { throwOnTimeout: true });
  }
  async demolishBuilding (planetId: string, buildingId: string): Promise<Building> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING:DEMOLISH', planetId, buildingId }));
      const [result] = await this.requestSocket.receive();
      const jsonResult = JSON.parse(result.toString());
      if (jsonResult.error) {
        throw jsonResult.error;
      }
      else {
        return Building.fromJson(jsonResult.building);
      }
    }, { throwOnTimeout: true });
  }

  async listBuildingConstructions (planetId: string): Promise<Array<BuildingConstruction>> {
    return await (this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING_CONSTRUCTION:LIST', planetId: planetId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).constructions ?? []).map(BuildingConstruction.fromJson);
    }));
  }
  async getBuildingConstruction (planetId: string, buildingId: string): Promise<BuildingConstruction | undefined> {
    return await (this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING_CONSTRUCTION:GET', planetId: planetId, buildingId: buildingId }));
      const [result] = await this.requestSocket.receive();
      const json = JSON.parse(result.toString()).construction;
      return json ? BuildingConstruction.fromJson(json) : undefined;
    }) as Promise<BuildingConstruction | undefined>);
  }

  async listBuildingSettings (planetId: string): Promise<BuildingSettings[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING_SETTINGS:LIST', planetId: planetId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).settings ?? []).map(BuildingSettings.fromJson);
    });
  }
  async getBuildingSettings (planetId: string, buildingId: string): Promise<BuildingSettings | undefined> {
    return await (this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING_SETTINGS:GET', planetId: planetId, buildingId: buildingId }));
      const [result] = await this.requestSocket.receive();
      const json = JSON.parse(result.toString()).settings;
      return json ? BuildingSettings.fromJson(json) : undefined;
    }) as Promise<BuildingSettings | undefined>);
  }
  async setBuildingSettings (planetId: string, buildingId: string, settings: BuildingSettings): Promise<BuildingSettings | undefined> {
    return await (this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING_SETTINGS:SET', planetId: planetId, buildingId: buildingId, settings: settings.toJson() }));
      const [result] = await this.requestSocket.receive();
      const json = JSON.parse(result.toString()).settings;
      return json ? BuildingSettings.fromJson(json) : undefined;
    }) as Promise<BuildingSettings | undefined>);
  }
  async cloneBuildingSettings (planetId: string, buildingId: string, settings: BuildingCloneSettings): Promise<number> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING_SETTINGS:CLONE', planetId, buildingId, settings: settings.toJson() }));
      const [result] = await this.requestSocket.receive();
      const jsonResult = JSON.parse(result.toString());
      if (jsonResult.error) {
        throw jsonResult.error;
      }
      else {
        return jsonResult.count;
      }
    }, { throwOnTimeout: true });
  }

  async listBuildingMetrics (planetId: string): Promise<BuildingMetrics[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING_METRICS:LIST', planetId: planetId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).metrics ?? []).map(BuildingMetrics.fromJson);
    });
  }
  async getBuildingMetrics (planetId: string, buildingId: string): Promise<BuildingMetrics | undefined> {
    return await (this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING_METRICS:GET', planetId: planetId, buildingId: buildingId }));
      const [result] = await this.requestSocket.receive();
      const json = JSON.parse(result.toString()).metrics;
      return json ? BuildingMetrics.fromJson(json) : undefined;
    }) as Promise<BuildingMetrics | undefined>);
  }

  async listBuildingConnections (planetId: string, sourceBuildingId: string | undefined, sinkBuildingId: string | undefined, resourceId: string): Promise<BuildingConnection[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING_CONNECTIONS:LIST', planetId: planetId, sourceBuildingId: sourceBuildingId, sinkBuildingId: sinkBuildingId, resourceId: resourceId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).connections ?? []).map(BuildingConnection.fromJson);
    });
  }

  async getCompanyInventionSummary (planetId: string, companyId: string): Promise<InventionSummary> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'RESEARCH:SUMMARY', planetId: planetId, companyId: companyId }));
      const [result] = await this.requestSocket.receive();
      return InventionSummary.fromJson(JSON.parse(result.toString()).summary);
    }, { throwOnTimeout: true });
  }
  async startResearch (planetId: string, companyId: string, inventionId: string): Promise<InventionSummary> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'RESEARCH:START', planetId: planetId, companyId: companyId, inventionId: inventionId }));
      const [result] = await this.requestSocket.receive();
      return InventionSummary.fromJson(JSON.parse(result.toString()).summary);
    }, { throwOnTimeout: true });
  }
  async cancelResearch (planetId: string, companyId: string, inventionId: string): Promise<InventionSummary> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'RESEARCH:CANCEL', planetId: planetId, companyId: companyId, inventionId: inventionId }));
      const [result] = await this.requestSocket.receive();
      return InventionSummary.fromJson(JSON.parse(result.toString()).summary);
    }, { throwOnTimeout: true });
  }

  async mailForCorporation (planetId: string, corporationId: string): Promise<Mail[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'MAIL:LIST', planetId: planetId, corporationId: corporationId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).mails ?? []).map(Mail.fromJson);
    });
  }
  async sendMail (planetId: string, mail: Mail): Promise<Mail> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'MAIL:SEND', planetId: planetId, mail: mail.toJson() }));
      const [result] = await this.requestSocket.receive();
      const json = JSON.parse(result.toString());
      if (json.error || !json.mail) {
        throw Error(json.error ?? 'Unable to send mail');
      }
      return Mail.fromJson(json.mail);
    }, { throwOnTimeout: true });
  }
  async markReadMail (planetId: string, mailId: string): Promise<string> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'MAIL:MARK_READ', planetId: planetId, mailId: mailId }));
      const [result] = await this.requestSocket.receive();
      return JSON.parse(result.toString()).mailId;
    });
  }
  async deleteMail (planetId: string, mailId: string): Promise<string> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'MAIL:DELETE', planetId: planetId, mailId: mailId }));
      const [result] = await this.requestSocket.receive();
      return JSON.parse(result.toString()).mailId;
    });
  }

  async planet (planetId: string): Promise<Planet> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'PLANET:GET', planetId: planetId }));
      const [result] = await this.requestSocket.receive();
      return Planet.fromJson(JSON.parse(result.toString()).planet);
    }, { throwOnTimeout: true });
  }

  async allTowns (planetId: string): Promise<Town[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'TOWN:LIST', planetId: planetId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).towns ?? []).map(Town.fromJson);
    }, { throwOnTimeout: true });
  }

  async allRankings (planetId: string): Promise<Rankings[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'RANKINGS:LIST', planetId: planetId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).rankings ?? []).map(Rankings.fromJson);
    }, { throwOnTimeout: true });
  }

  async governmentMetricsForTownId (planetId: string, townId: string): Promise<GovernmentMetrics | undefined> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'GOVERNMENT_METRICS:GET', planetId: planetId, townId: townId }));
      const [result] = await this.requestSocket.receive();
      const metrics = JSON.parse(result.toString()).metrics;
      return metrics ? GovernmentMetrics.fromJson(metrics) : undefined;
    }, { throwOnTimeout: true });
  }

  async governmentPoliticsForTownId (planetId: string, townId: string): Promise<GovernmentPolitics | undefined> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'GOVERNMENT_POLITICS:GET', planetId: planetId, townId: townId }));
      const [result] = await this.requestSocket.receive();
      const politics = JSON.parse(result.toString()).politics;
      return politics ? GovernmentPolitics.fromJson(politics) : undefined;
    }, { throwOnTimeout: true });
  }

  async governmentTaxesForTownId (planetId: string, townId: string): Promise<GovernmentTaxes | undefined> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'GOVERNMENT_TAXES:GET', planetId: planetId, townId: townId }));
      const [result] = await this.requestSocket.receive();
      const taxes = JSON.parse(result.toString()).taxes;
      return taxes ? GovernmentTaxes.fromJson(taxes) : undefined;
    }, { throwOnTimeout: true });
  }
}
