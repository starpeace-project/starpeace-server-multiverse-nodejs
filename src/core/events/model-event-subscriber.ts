import _ from 'lodash';
import EventEmitter from 'events';
import winston from 'winston';
import { Subscriber } from 'zeromq';

import Building from '../../building/building.js';
import BuildingConstruction from '../../building/construction/building-construction.js';
import Company from '../../company/company.js';
import Corporation from '../../corporation/corporation.js';
import InventionSummary from '../../company/invention-summary.js';
import Tycoon from '../../tycoon/tycoon.js';
import TycoonVisa from '../../tycoon/tycoon-visa.js';
import BuildingSettings from '../../building/settings/building-settings.js';
import BuildingMetrics from '../../building/metrics/building-metrics.js';

const ASYNC_SERVER_TO_CLIENT_PORT = 19166;

const SOCKET_SUBSCRIBER_TOPICS = [
  'SOCKET:CONNECT', 'SOCKET:DISCONNECT',
  'BUILDING:UPDATE',
  'BUILDING_CONSTRUCTION:UPDATE',
  'BUILDING_METRICS:UPDATE',
  'BUILDING_SETTINGS:UPDATE',
  'COMPANY:UPDATE',
  'CORPORATION:UPDATE',
  'INVENTION:START', 'INVENTION:SELL',
  'RESEARCH:START', 'RESEARCH:CANCEL', 'RESEARCH:DELETE',
  'TYCOON:UPDATE',
  'VISA:UPDATE', 'VISA:DELETE'
];

export default class ModelEventSubscriber {
  logger: winston.Logger;
  running: boolean = false;
  events: EventEmitter;

  subscriberSocket: Subscriber;

  constructor (logger: winston.Logger) {
    this.logger = logger;
    this.running = false;
    this.events = new EventEmitter();

    this.subscriberSocket = new Subscriber();
  }

  async start (): Promise<void> {
    try {
      this.subscriberSocket.connect(`tcp://127.0.0.1:${ASYNC_SERVER_TO_CLIENT_PORT}`);
      this.subscriberSocket.subscribe(...SOCKET_SUBSCRIBER_TOPICS);
      this.logger.info(`Model Event Subscriber started on port ${ASYNC_SERVER_TO_CLIENT_PORT}`);

      this.running = true;

      for await (const [topic, message] of this.subscriberSocket) {
        const notification = JSON.parse(message.toString());
        const type = topic.toString();

        if (type === 'SOCKET:CONNECT') {
          this.events.emit('connectSocket', { tycoonId: notification.tycoonId, socketId: notification.socketId });
        }
        else if (type === 'SOCKET:DISCONNECT') {
          this.events.emit('disconnectSocket', { socketId: notification.socketId });
        }
        else if (type === 'BUILDING:UPDATE') {
          this.events.emit('updateBuilding', { planetId: notification.planetId, building: Building.fromJson(notification.building) });
        }
        else if (type === 'BUILDING_CONSTRUCTION:UPDATE') {
          this.events.emit('updateBuildingConstruction', { planetId: notification.planetId, construction: BuildingConstruction.fromJson(notification.construction) });
        }
        else if (type === 'BUILDING_METRICS:UPDATE') {
          this.events.emit('updateBuildingMetrics', { planetId: notification.planetId, metrics: BuildingMetrics.fromJson(notification.metrics) });
        }
        else if (type === 'BUILDING_SETTINGS:UPDATE') {
          this.events.emit('updateBuildingSettings', { planetId: notification.planetId, settings: BuildingSettings.fromJson(notification.settings) });
        }
        else if (type === 'COMPANY:UPDATE') {
          this.events.emit('updateCompany', { planetId: notification.planetId, company: Company.fromJson(notification.company) });
        }
        else if (type === 'CORPORATION:UPDATE') {
          this.events.emit('updateCorporation', { planetId: notification.planetId, corporation: Corporation.fromJson(notification.corporation) });
        }
        else if (type === 'RESEARCH:START') {
          this.events.emit('startResearch', { planetId: notification.planetId, summary: InventionSummary.fromJson(notification.summary) });
        }
        else if (type === 'RESEARCH:CANCEL') {
          this.events.emit('cancelResearch', { planetId: notification.planetId, summary: InventionSummary.fromJson(notification.summary) });
        }
        else if (type === 'RESEARCH:DELETE') {
          this.events.emit('deleteResearch', { planetId: notification.planetId, companyId: notification.companyId, inventionId: notification.inventionId });
        }
        else if (type === 'TYCOON:UPDATE') {
          this.events.emit('updateTycoon', { tycoon: Tycoon.fromJson(notification.tycoon) });
        }
        else if (type === 'VISA:UPDATE') {
          this.events.emit('updateVisa', { visa: TycoonVisa.fromJson(notification.visa) });
        }
        else if (type === 'VISA:DELETE') {
          this.events.emit('deleteVisa', { visaId: notification.visaId });
        }
        else if (type === 'VISA:VIEW') {
          this.events.emit('viewVisa', { visaId: notification.visaId, viewX: notification.viewX, viewY: notification.viewY });
        }

        else {
          this.logger.warn(`Model Event Subscriber received unknown event topic ${topic}`);
        }
      }
    }
    catch (err) {
      if (this.running) {
        throw err;
      }
    }
  }

  stop () {
    this.running = false;
    this.logger.info('Stopping Model Event Subscriber...');
    this.subscriberSocket.close();
    this.logger.info('Stopped Model Event Subscriber');
  }

}
