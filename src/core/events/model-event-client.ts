import _ from 'lodash';
import EventEmitter from 'events';
import PQueue from 'p-queue';
import { Request } from 'zeromq';

import Tycoon from '../../tycoon/tycoon';
import TycoonVisa from '../../tycoon/tycoon-visa';

import Bookmark from '../../corporation/bookmark';
import Building from '../../building/building';
import Company from '../../company/company';
import Corporation from '../../corporation/corporation';
import Invention from '../../company/invention';
import Mail from '../../corporation/mail';
import Planet from '../../planet/planet';
import Rankings from '../../corporation/rankings';
import Town from '../../planet/town';


const SYNC_API_PORT = 19165;


export default class ModelEventClient {
  running: boolean = false;
  events: EventEmitter;

  requestQueue: PQueue;
  requestSocket: Request;

  constructor () {
    this.running = false;
    this.events = new EventEmitter();

    this.requestQueue = new PQueue({concurrency: 1});
    this.requestSocket = new Request();
  }

  start (): void {
    try {
      this.requestSocket.connect(`tcp://127.0.0.1:${SYNC_API_PORT}`);
      console.log(`[Model Event Client] API Requester started on port ${SYNC_API_PORT}`);

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
    console.log('[Model Event Client] Stopping...');
    this.requestSocket.close();
    console.log('[Model Event Client] Stopped');
  }


  async allTycoons (): Promise<Tycoon[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'TYCOON:LIST' }));
      const [result] = await this.requestSocket.receive();
      return _.map(JSON.parse(result.toString()).tycoons, Tycoon.fromJson);
    });
  }
  async createTycoon (tycoon: Tycoon): Promise<Tycoon> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'TYCOON:CREATE', tycoon: tycoon.toJson() }));
      const [result] = await this.requestSocket.receive();
      return Tycoon.fromJson(JSON.parse(result.toString()).tycoon);
    });
  }
  async tycoon (tycoonId: string): Promise<Tycoon> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'TYCOON:GET', tycoonId: tycoonId }));
      const [result] = await this.requestSocket.receive();
      return Tycoon.fromJson(JSON.parse(result.toString()).tycoon);
    });
  }

  async issueToken (tycoon: Tycoon): Promise<string> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'TOKEN:ISSUE', tycoonId: tycoon.id }));
      const [result] = await this.requestSocket.receive();
      return JSON.parse(result.toString()).token;
    });
  }
  async loginToken (token: string): Promise<Tycoon> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'TOKEN:LOGIN', tokenId: token }));
      const [result] = await this.requestSocket.receive();
      return Tycoon.fromJson(JSON.parse(result.toString()).tycoon);
    });
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
    });
  }
  async destroyVisa (visaId: string): Promise<void> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'VISA:DESTROY', visaId: visaId }));
      await this.requestSocket.receive();
    });
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
    });
  }

  async allCompanies (planetId: string): Promise<Company[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'COMPANY:LIST', planetId: planetId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).companies ?? []).map(Company.fromJson);
    });
  }
  async createCompany (company: Company): Promise<Company> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'COMPANY:CREATE', company: company.toJson() }));
      const [result] = await this.requestSocket.receive();
      return Company.fromJson(JSON.parse(result.toString()).company);
    });
  }

  async bookmarksForCorporation (planetId: string, corporationId: string): Promise<Bookmark[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'BOOKMARK:GET', planetId: planetId, corporationId: corporationId }));
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

  async listCompanyInventions (planetId: string, companyId: string): Promise<Invention[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'RESEARCH:LIST', planetId: planetId, companyId: companyId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).inventions ?? []).map(Invention.fromJson);
    });
  }
  async findInvention (planetId: string, companyId: string, inventionId: string): Promise<Invention> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'RESEARCH:GET', planetId: planetId, companyId: companyId, inventionId: inventionId }));
      const [result] = await this.requestSocket.receive();
      return Invention.fromJson(JSON.parse(result.toString()).invention);
    });
  }
  async startResearch (planetId: string, invention: Invention): Promise<Invention> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'RESEARCH:START', planetId: planetId, invention: invention.toJson() }));
      const [result] = await this.requestSocket.receive();
      return Invention.fromJson(JSON.parse(result.toString()).invention);
    });
  }
  async sellResearch (planetId: string, companyId: string, inventionId: string): Promise<string> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'RESEARCH:SELL', planetId: planetId, companyId: companyId, inventionId: inventionId }));
      const [result] = await this.requestSocket.receive();
      return JSON.parse(result.toString()).inventionId;
    });
  }

  async mailForCorporation (planetId: string, corporationId: string): Promise<Mail[]> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'MAIL:GET', planetId: planetId, corporationId: corporationId }));
      const [result] = await this.requestSocket.receive();
      return (JSON.parse(result.toString()).mails ?? []).map(Mail.fromJson);
    });
  }
  async sendMail (planetId: string, mail: Mail): Promise<Mail> {
    return await this.requestQueue.add(async () => {
      await this.requestSocket.send(JSON.stringify({ type: 'MAIL:SEND', planetId: planetId, mail: mail.toJson() }));
      const [result] = await this.requestSocket.receive();
      return Mail.fromJson(JSON.parse(result.toString()).mail);
    });
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
    });
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
