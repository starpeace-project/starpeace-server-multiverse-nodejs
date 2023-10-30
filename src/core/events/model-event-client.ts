import _ from 'lodash';
import PQueue from 'p-queue';
import winston from 'winston';
import { Request } from 'zeromq';

import Tycoon from '../../tycoon/tycoon';
import TycoonVisa from '../../tycoon/tycoon-visa';

import Bookmark from '../../corporation/bookmark';
import Building from '../../building/building';
import BuildingLabor from '../../building/building-labor';
import BuildingProduct from '../../building/building-product';
import Company from '../../company/company';
import Corporation from '../../corporation/corporation';
import Mail from '../../corporation/mail';
import Planet from '../../planet/planet';
import Rankings from '../../corporation/rankings';
import Town from '../../planet/town';
import InventionSummary from '../../company/invention-summary';


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

  async listBuildingLabors (planetId: string, buildingId: string): Promise<BuildingLabor[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING_LABOR:LIST', planetId: planetId, buildingId: buildingId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).labors ?? []).map(BuildingLabor.fromJson);
    });
  }
  async getBuildingLabor (planetId: string, id: string): Promise<BuildingLabor | undefined> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING_LABOR:GET', planetId: planetId, id: id }));
      const [result] = await this.requestSocket.receive();
      const json = JSON.parse(result.toString()).labor;
      return json ? BuildingLabor.fromJson(json) : undefined;
    });
  }
  async listBuildingProducts (planetId: string, buildingId: string): Promise<BuildingProduct[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING_PRODUCT:LIST', planetId: planetId, buildingId: buildingId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).products ?? []).map(BuildingProduct.fromJson);
    });
  }
  async getBuildingProduct (planetId: string, id: string): Promise<BuildingProduct | undefined> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BUILDING_PRODUCT:GET', planetId: planetId, id: id }));
      const [result] = await this.requestSocket.receive();
      const json = JSON.parse(result.toString()).product;
      return json ? BuildingProduct.fromJson(json) : undefined;
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
    });
  }

  async allRankings (planetId: string): Promise<Rankings[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'RANKINGS:LIST', planetId: planetId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).rankings ?? []).map(Rankings.fromJson);
    });
  }

}
