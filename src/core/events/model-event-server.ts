import _ from 'lodash';
import winston from 'winston';
import { Publisher, Reply, Subscriber } from 'zeromq';

import Tycoon from '../../tycoon/tycoon.js';
import TycoonCache from '../../tycoon/tycoon-cache.js';
import TycoonStore from '../../tycoon/tycoon-store.js';
import TycoonTokenStore from '../../tycoon/tycoon-token-store.js';
import TycoonVisa from '../../tycoon/tycoon-visa.js';
import TycoonVisaCache from '../../tycoon/tycoon-visa-cache.js';

import Bookmark from '../../corporation/bookmark.js';
import BookmarkStore from '../../corporation/bookmark-store.js';
import Building from '../../building/building.js';
import BuildingCache from '../../building/building-cache.js';
import BuildingConnectionCache from '../../building/connections/building-connection-cache.js';
import BuildingConstruction from '../../building/construction/building-construction.js';
import BuildingConstructionCache from '../../building/construction/building-construction-cache.js';
import BuildingManager from './server/building-manager.js';
import BuildingMetrics from '../../building/metrics/building-metrics.js';
import BuildingMetricsCache from '../../building/metrics/building-metrics-cache.js';
import BuildingSettings from '../../building/settings/building-settings.js';
import BuildingSettingsCache from '../../building/settings/building-settings-cache.js';
import BuildingStore from '../../building/building-store.js';
import CashflowCache from '../../finances/cashflow-cache.js';
import Corporation from '../../corporation/corporation.js';
import CorporationCache from '../../corporation/corporation-cache.js';
import Company from '../../company/company.js';
import CompanyCache from '../../company/company-cache.js';
import GovernmentCache from '../../planet/government/government-cache.js';
import GovernmentMetrics from '../../planet/government/government-metrics.js';
import GovernmentPolitics from '../../planet/government/government-politics.js';
import GovernmentTaxes from '../../planet/government/government-taxes.js';
import InventionSummary from '../../company/invention-summary.js';
import InventionSummaryCache from '../../company/invention-summary-cache.js';
import Mail from '../../corporation/mail.js';
import MailStore from '../../corporation/mail-store.js';
import PlanetCache from '../../planet/planet-cache.js';
import Rankings from '../../corporation/rankings.js';
import RankingsCache from '../../corporation/rankings-cache.js';
import Town from '../../planet/town.js';
import TownCache from '../../planet/town-cache.js';
import TycoonSettings from '../../tycoon/settings/tycoon-settings.js';
import TycoonSettingsCache from '../../tycoon/settings/tycoon-settings-cache.js';

import CacheByPlanet from '../../planet/cache-by-planet.js';
import Utils from '../../utils/utils.js';
import { BuildingConfigurations, CoreConfigurations, InventionConfigurations } from '../galaxy-manager.js';
import BuildingConnection from '../../building/connections/building-connection.js';


const SYNC_API_PORT = 19165;
const ASYNC_SERVER_TO_CLIENT_PORT = 19166;
const ASYNC_CLIENT_TO_SERVER_PORT = 19167;

const SOCKET_SUBSCRIBER_TOPICS = [
  'SOCKET:CONNECT', 'SOCKET:DISCONNECT',
  'VISA:TOUCH', 'VISA:VIEW'
];


export interface ModelEventServerStores {
  tycoon: TycoonStore;
  tycoonToken: TycoonTokenStore;

  bookmarkByPlanet: Record<string, BookmarkStore>;
  buildingByPlanet: Record<string, BuildingStore>;
  mailByPlanet: Record<string, MailStore>;
}

export interface ModelEventServerCaches {
  buildingConfigurations: Record<string, BuildingConfigurations>;
  coreConfigurations: Record<string, CoreConfigurations>;
  inventionConfigurations: Record<string, InventionConfigurations>;

  tycoon: TycoonCache;
  tycoonVisa: TycoonVisaCache;

  building: CacheByPlanet<BuildingCache>;
  buildingConnection: CacheByPlanet<BuildingConnectionCache>;
  buildingConstruction: CacheByPlanet<BuildingConstructionCache>;
  buildingMetrics: CacheByPlanet<BuildingMetricsCache>;
  buildingSettings: CacheByPlanet<BuildingSettingsCache>;
  cashflow: CacheByPlanet<CashflowCache>;
  company: CacheByPlanet<CompanyCache>;
  corporation: CacheByPlanet<CorporationCache>;
  inventionSummary: CacheByPlanet<InventionSummaryCache>;
  government: CacheByPlanet<GovernmentCache>;
  planet: CacheByPlanet<PlanetCache>;
  rankings: CacheByPlanet<RankingsCache>;
  town: CacheByPlanet<TownCache>;
  tycoonSettings: CacheByPlanet<TycoonSettingsCache>;
}

export default class ModelEventServer {
  logger: winston.Logger;
  running: boolean = false;

  replySocket: Reply;
  publisherSocket: Publisher;
  subscriberSocket: Subscriber;

  stores: ModelEventServerStores;
  caches: ModelEventServerCaches;

  buildingManager: BuildingManager;

  constructor (logger: winston.Logger, stores: ModelEventServerStores, caches: ModelEventServerCaches) {
    this.logger = logger;
    this.running = false;
    this.replySocket = new Reply();
    this.publisherSocket = new Publisher();
    this.subscriberSocket = new Subscriber();
    this.stores = stores;
    this.caches = caches;

    this.buildingManager = new BuildingManager(this.replySocket, this.publisherSocket, this.caches);
  }

  async start (): Promise<void> {
    try {
      await this.replySocket.bind(`tcp://127.0.0.1:${SYNC_API_PORT}`);
      this.logger.info(`API Receiver started on port ${SYNC_API_PORT}`);

      await this.publisherSocket.bind(`tcp://127.0.0.1:${ASYNC_SERVER_TO_CLIENT_PORT}`);
      this.logger.info(`Publisher started on port ${ASYNC_SERVER_TO_CLIENT_PORT}`);

      await this.subscriberSocket.bind(`tcp://127.0.0.1:${ASYNC_CLIENT_TO_SERVER_PORT}`);
      this.subscriberSocket.subscribe(...SOCKET_SUBSCRIBER_TOPICS);
      this.logger.info(`Subscriber started on port ${ASYNC_CLIENT_TO_SERVER_PORT}`);

      this.running = true;

      this.receiveRequests();
      this.receiveNotifications();
    }
    catch (err) {
      if (this.running) {
        throw err;
      }
    }
  }

  stop (): void {
    this.running = false;
    this.logger.info('Stopping...');

    this.replySocket.close();
    this.publisherSocket.close();
    this.subscriberSocket.close();

    this.logger.info('Stopped');
  }

  async receiveRequests (): Promise<void> {
    for await (const [message] of this.replySocket) {
      const request = JSON.parse(message.toString());

      if (request.type == 'TYCOON:CREATE') {
        const tycoon: Tycoon = this.caches.tycoon.loadTycoon(await this.stores.tycoon.set(Tycoon.fromJson(request.tycoon)));
        await this.replySocket.send(JSON.stringify({ tycoon: tycoon.toJson() }));
        await this.publisherSocket.send(['TYCOON:UPDATE', JSON.stringify({ tycoon: tycoon.toJson() })]);
      }
      else if (request.type == 'TYCOON:LIST') {
        await this.replySocket.send(JSON.stringify({ tycoons: _.map(this.caches.tycoon.all(), (a) => a.toJson()) }));
      }
      else if (request.type == 'TYCOON:GET') {
        const tycoon: Tycoon | null = this.caches.tycoon.forId(request.tycoonId);
        await this.replySocket.send(JSON.stringify({ tycoon: tycoon?.toJson() }))
      }
      else if (request.type == 'TYCOON_SETTINGS:GET') {
        const settings: TycoonSettings | undefined = this.caches.tycoonSettings.withPlanetId(request.planetId)?.forTycoonId(request.tycoonId);
        await this.replySocket.send(JSON.stringify({ settings: settings?.toJson() }))
      }

      else if (request.type === 'TOKEN:ISSUE') {
        const token = await this.stores.tycoonToken.set(Utils.randomString(64), request.tycoonId);
        await this.replySocket.send(JSON.stringify({ token: token }));
      }
      else if (request.type === 'TOKEN:LOGIN') {
        const tycoonId = await this.stores.tycoonToken.consumeToken(request.tokenId);
        const tycoon: Tycoon | null = this.caches.tycoon.forId(tycoonId);
        await this.replySocket.send(JSON.stringify({ tycoon: tycoon?.toJson() }));
      }

      else if (request.type === 'VISA:LIST') {
        const visas: TycoonVisa[] = this.caches.tycoonVisa.all();
        await this.replySocket.send(JSON.stringify({ visas: visas.map(v => v.toJson()) }));
      }
      else if (request.type === 'VISA:SAVE') {
        const visa: TycoonVisa = TycoonVisa.fromJson(request.visa);
        if (visa.tycoonId) {
          const cancelledVisaId: string | null = this.caches.tycoonVisa.clearByTycoonId(visa.tycoonId);
          if (cancelledVisaId) {
            await this.publisherSocket.send(['VISA:DELETE', JSON.stringify({ visaId: cancelledVisaId })]);
          }
        }

        this.caches.tycoonVisa.set(visa);
        await this.replySocket.send(JSON.stringify({ visa: visa.toJson() }));
        await this.publisherSocket.send(['VISA:UPDATE', JSON.stringify({ visa: visa.toJson() })]);
      }
      else if (request.type === 'VISA:DESTROY') {
        const tycoonId = await this.stores.tycoonToken.consumeToken(request.tokenId);
        const tycoon: Tycoon | null = this.caches.tycoon.forId(tycoonId);
        await this.replySocket.send(JSON.stringify({ tycoon: tycoon?.toJson() }));
      }

      else if (request.type === 'PLANET:GET') {
        await this.replySocket.send(JSON.stringify({ planet: this.caches.planet.withPlanetId(request.planetId).planet?.toJson() }));
      }
      else if (request.type === 'TOWN:LIST') {
        const towns: Town[] = this.caches.town.withPlanetId(request.planetId).all() ?? [];
        await this.replySocket.send(JSON.stringify({ towns: towns.map(c => c.toJson()) }));
      }

      else if (request.type === 'GOVERNMENT_METRICS:GET') {
        const metrics: GovernmentMetrics | undefined = this.caches.government.withPlanetId(request.planetId).metricsForTownId(request.townId);
        await this.replySocket.send(JSON.stringify({ metrics: metrics?.toJson() }));
      }
      else if (request.type === 'GOVERNMENT_POLITICS:GET') {
        const politics: GovernmentPolitics | undefined = this.caches.government.withPlanetId(request.planetId).politicsForTownId(request.townId);
        await this.replySocket.send(JSON.stringify({ politics: politics?.toJson() }));
      }
      else if (request.type === 'GOVERNMENT_TAXES:GET') {
        const taxes: GovernmentTaxes | undefined = this.caches.government.withPlanetId(request.planetId).taxesForTownId(request.townId);
        await this.replySocket.send(JSON.stringify({ taxes: taxes?.toJson() }));
      }

      else if (request.type === 'BOOKMARK:LIST') {
        const bookmarks: Bookmark[] = await this.stores.bookmarkByPlanet[request.planetId]?.forCorporationId(request.corporationId);
        await this.replySocket.send(JSON.stringify({ bookmarks: _.map(bookmarks, (b) => b.toJson()) }));
      }
      else if (request.type === 'BOOKMARK:SAVE') {
        const bookmarks: Bookmark[] = <Bookmark[]> await Promise.all(request.bookmarks.map((b: any) => this.stores.bookmarkByPlanet[request.planetId]?.set(Bookmark.fromJson(b))));
        await this.replySocket.send(JSON.stringify({ bookmarks: _.map(bookmarks, (bookmark) => bookmark.toJson()) }));
      }

      else if (request.type === 'CORPORATION:LIST') {
        const corporations: Corporation[] = this.caches.corporation.withPlanetId(request.planetId).all() ?? [];
        await this.replySocket.send(JSON.stringify({ corporations: corporations.map(c => c.toJson()) }));
      }
      else if (request.type === 'CORPORATION:CREATE') {
        const corporation: Corporation = <Corporation> this.caches.corporation.withPlanetId(request.planetId).update(Corporation.fromJson(request.corporation));
        await this.replySocket.send(JSON.stringify({ corporation: corporation.toJson() }));
        await this.publisherSocket.send(['CORPORATION:UPDATE', JSON.stringify({ planetId: corporation.planetId, corporation: corporation.toJson() })]);
      }

      else if (request.type === 'COMPANY:LIST') {
        const companies: Company[] = this.caches.company.withPlanetId(request.planetId).all() ?? [];
        await this.replySocket.send(JSON.stringify({ companies: companies.map(c => c.toJson()) }));
      }
      else if (request.type === 'COMPANY:CREATE') {
        const company: Company = <Company> this.caches.company.withPlanetId(request.planetId).update(Company.fromJson(request.company));
        const corporation: Corporation = <Corporation> this.caches.corporation.withPlanetId(request.planetId).forId(company.corporationId);
        corporation.companyIds.add(company.id);
        this.caches.corporation.withPlanetId(request.planetId).update(corporation);

        await this.replySocket.send(JSON.stringify({ company: company.toJson() }))
        await this.publisherSocket.send(['CORPORATION:UPDATE', JSON.stringify({ planetId: request.planetId, corporation: corporation.toJson() })])
        await this.publisherSocket.send(['COMPANY:UPDATE', JSON.stringify({ planetId: request.planetId, company: company.toJson() })])
      }

      else if (request.type === 'RESEARCH:SUMMARY') {
        const summary: InventionSummary = this.caches.inventionSummary.withPlanetId(request.planetId).forCompanyId(request.companyId);
        await this.replySocket.send(JSON.stringify({ summary: summary?.toJson() }));
      }
      else if (request.type === 'RESEARCH:START') {
        // TODO: verify has research unlocked by constructed building
        const summary: InventionSummary = this.caches.inventionSummary.withPlanetId(request.planetId).forCompanyId(request.companyId);
        if (summary.isCompleted(request.inventionId) || summary.isActive(request.inventionId) || summary.isPending(request.inventionId) || summary.isCanceled(request.inventionId)) {
          await this.replySocket.send(JSON.stringify({ summary: summary.toJson() }));
        }
        else {
          summary.pendingIds.push(request.inventionId);
          this.caches.inventionSummary.withPlanetId(request.planetId).update(summary);
          await this.replySocket.send(JSON.stringify({ summary: summary.toJson() }));
          await this.publisherSocket.send(['RESEARCH:START', JSON.stringify({ planetId: request.planetId, summary: summary.toJson() })]);
        }
      }
      else if (request.type === 'RESEARCH:CANCEL') {
        const summary: InventionSummary = this.caches.inventionSummary.withPlanetId(request.planetId).forCompanyId(request.companyId);
        if (!summary.isCanceled(request.inventionId) && (summary.isCompleted(request.inventionId) || summary.isActive(request.inventionId) || summary.isPending(request.inventionId))) {
          summary.canceledIds.add(request.inventionId);
          this.caches.inventionSummary.withPlanetId(request.planetId).update(summary);
          await this.replySocket.send(JSON.stringify({ summary: summary.toJson() }));
          await this.publisherSocket.send(['RESEARCH:CANCEL', JSON.stringify({ planetId: request.planetId, summary: summary.toJson() })]);
        }
        else {
          await this.replySocket.send(JSON.stringify({ summary: summary.toJson() }));
        }
      }

      else if (request.type === 'BUILDING:LIST') {
        const buildings: Building[] = this.caches.building.withPlanetId(request.planetId).all() ?? [];
        await this.replySocket.send(JSON.stringify({ buildings: buildings.map(c => c.toJson()) }));
      }
      else if (request.type === 'BUILDING:CREATE') {
        await this.buildingManager.createBuilding(request);
      }
      else if (request.type === 'BUILDING:RENAME') {
        await this.buildingManager.renameBuilding(request);
      }
      else if (request.type === 'BUILDING:DEMOLISH') {
        await this.buildingManager.demolishBuilding(request);
      }

      else if (request.type === 'BUILDING_CONSTRUCTION:LIST') {
        const constructions: Array<BuildingConstruction> = this.caches.buildingConstruction.withPlanetId(request.planetId).all();
        await this.replySocket.send(JSON.stringify({ constructions: constructions.map(c => c.toJson()) }));
      }
      else if (request.type === 'BUILDING_CONSTRUCTION:GET') {
        const construction: BuildingConstruction | undefined = this.caches.buildingConstruction.withPlanetId(request.planetId).forBuildingId(request.buildingId);
        await this.replySocket.send(JSON.stringify({ construction: construction?.toJson() }));
      }

      else if (request.type === 'BUILDING_SETTINGS:LIST') {
        const settings: BuildingSettings[] = this.caches.buildingSettings.withPlanetId(request.planetId).all();
        await this.replySocket.send(JSON.stringify({ settings: settings.map(s => s.toJson()) }));
      }
      else if (request.type === 'BUILDING_SETTINGS:GET') {
        const settings: BuildingSettings | undefined = this.caches.buildingSettings.withPlanetId(request.planetId).forBuildingId(request.buildingId);
        await this.replySocket.send(JSON.stringify({ settings: settings?.toJson() }));
      }
      else if (request.type === 'BUILDING_SETTINGS:SET') {
        const settings: BuildingSettings = BuildingSettings.fromJson(request.settings);
        this.caches.buildingSettings.withPlanetId(request.planetId).update(settings);

        await this.replySocket.send(JSON.stringify({ settings: settings.toJson() }));
        await this.publisherSocket.send(['BUILDING_SETTINGS:UPDATE', JSON.stringify({ planetId: request.planetId, settings: settings.toJson() })]);
      }
      else if (request.type === 'BUILDING_SETTINGS:CLONE') {
        await this.buildingManager.cloneBuilding(request);
      }

      else if (request.type === 'BUILDING_METRICS:LIST') {
        const metrics: BuildingMetrics[] = this.caches.buildingMetrics.withPlanetId(request.planetId).all();
        await this.replySocket.send(JSON.stringify({ metrics: metrics.map(s => s.toJson()) }));
      }
      else if (request.type === 'BUILDING_METRICS:GET') {
        const metrics: BuildingMetrics | undefined = this.caches.buildingMetrics.withPlanetId(request.planetId).forBuildingId(request.buildingId);
        await this.replySocket.send(JSON.stringify({ metrics: metrics?.toJson() }));
      }

      else if (request.type === 'BUILDING_CONNECTIONS:LIST') {
        const cache = this.caches.buildingConnection.withPlanetId(request.planetId);
        const connections: BuildingConnection[] = request.sourceBuildingId ? cache.forSourceBuildingIdResourceId(request.sourceBuildingId, request.resourceId) : request.sinkBuildingId ? cache.forSinkBuildingIdResourceId(request.sinkBuildingId, request.resourceId) : [];
        await this.replySocket.send(JSON.stringify({ connections: connections.map(c => c.toJson()) }));
      }

      else if (request.type === 'MAIL:LIST') {
        const mails: Mail[] = await this.stores.mailByPlanet[request.planetId]?.forCorporationId(request.corporationId) ?? []
        await this.replySocket.send(JSON.stringify({ mails: mails.map(m => m.toJson()) }));
      }
      else if (request.type === 'MAIL:SEND') {
        const mail: Mail = Mail.fromJson(request.mail);
        const corporation: Corporation | undefined = this.caches.corporation.withPlanetId(request.planetId).forId(mail.corporationId)?.withLastMailAt(mail.sentAt);
        if (!corporation) {
          await this.replySocket.send(JSON.stringify({ error: 'INVALID_CORPORATION' }));
        }
        else {
          this.caches.corporation.withPlanetId(request.planetId).update(corporation);
          await this.stores.mailByPlanet[request.planetId].set(mail);

          await this.replySocket.send(JSON.stringify({ mail: mail.toJson() }));
          await this.publisherSocket.send(['CORPORATION:UPDATE', JSON.stringify({ planetId: corporation.planetId, corporation: corporation.toJson() })]);
        }
      }
      else if (request.type === 'MAIL:MARK_READ') {
        const mail: Mail | null = (await this.stores.mailByPlanet[request.planetId]?.get(request.mailId));
        if (mail) {
          await this.stores.mailByPlanet[request.planetId]?.set(mail.markRead());
        }
        await this.replySocket.send(JSON.stringify({ mailId: mail?.id }));
      }
      else if (request.type === 'MAIL:DELETE') {
        const mailId: string = await this.stores.mailByPlanet[request.planetId]?.delete(request.mailId);
        await this.replySocket.send(JSON.stringify({ mailId: mailId }));
      }

      else if (request.type === 'RANKINGS:LIST') {
        const rankings: Rankings[] = this.caches.rankings.withPlanetId(request.planetId).all() ?? [];
        await this.replySocket.send(JSON.stringify({ rankings: rankings.map(c => c.toJson()) }));
      }

      else {
        this.logger.warn(`Unknown request type ${request.type}`);
      }
    }
  }

  async receiveNotifications (): Promise<void> {
    try {
      for await (const [topic, message] of this.subscriberSocket) {
        const request = JSON.parse(message.toString());
        const type = topic.toString();
        if (type === 'SOCKET:CONNECT') {
          await this.publisherSocket.send(['SOCKET:CONNECT', JSON.stringify({ tycoonId: request.tycoonId, socketId: request.socketId })]);
        }
        else if (type === 'SOCKET:DISCONNECT') {
          await this.publisherSocket.send(['SOCKET:DISCONNECT', JSON.stringify({ socketId: request.socketId })]);
        }
        else if (type === 'VISA:TOUCH' || type === 'VISA:VIEW') {
          const visa: TycoonVisa | null = this.caches.tycoonVisa.forId(request.visaId);
          if (visa) {
            const updatedVisa: TycoonVisa = (_.isNumber(request.viewX) && _.isNumber(request.viewY) ? visa.withView(request.viewX, request.viewY) : visa).touch();

            const tycoonSettings: TycoonSettings = this.caches.tycoonSettings.withPlanetId(updatedVisa.planetId).forTycoonId(updatedVisa.tycoonId) ?? new TycoonSettings(updatedVisa.tycoonId, 0, 0);
            tycoonSettings.withView(updatedVisa.viewX, updatedVisa.viewY);
            this.caches.tycoonSettings.withPlanetId(updatedVisa.planetId).update(tycoonSettings);

            await this.publisherSocket.send(['VISA:UPDATE', JSON.stringify({ visa: updatedVisa?.toJson() })]);
          }
        }
        else {
          this.logger.warn(`Unknown event topic ${topic}`);
        }
      }
    }
    catch (err) {
      if (this.running) {
        throw err;
      }
    }
  }
}
