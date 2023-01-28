import _ from 'lodash';
import EventEmitter from 'events';
import { Subscriber } from 'zeromq';

import ModelEventClient from './model-event-client';
import CacheByPlanet from '../../planet/cache-by-planet';

import Tycoon from '../../tycoon/tycoon';
import TycoonCache from '../../tycoon/tycoon-cache';
import TycoonSocketCache from '../../tycoon/tycoon-socket-cache';

import Building from '../../building/building';
import BuildingCache from '../../building/building-cache';
import Company from '../../company/company';
import CompanyCache from '../../company/company-cache';
import Corporation from '../../corporation/corporation';
import CorporationCache from '../../corporation/corporation-cache';
import TycoonVisaCache from '../../tycoon/tycoon-visa-cache';
import TycoonVisa from '../../tycoon/tycoon-visa';

const ASYNC_SERVER_TO_CLIENT_PORT = 19166;

const SOCKET_SUBSCRIBER_TOPICS = [
  'SOCKET:CONNECT', 'SOCKET:DISCONNECT',
  'BUILDING:UPDATE',
  'COMPANY:UPDATE',
  'CORPORATION:UPDATE',
  'INVENTION:START', 'INVENTION:SELL',
  'TYCOON:UPDATE',
  'VISA:UPDATE', 'VISA:DELETE'
];

export interface ModelEventSubscriberCaches {
  tycoon: TycoonCache;
  tycoonSocket: TycoonSocketCache;
  tycoonVisa: TycoonVisaCache;

  building: CacheByPlanet<BuildingCache>;
  company: CacheByPlanet<CompanyCache>;
  corporation: CacheByPlanet<CorporationCache>;
}

export default class ModelEventSubscriber {
  running: boolean = false;
  events: EventEmitter;

  subscriberSocket: Subscriber;
  modelEventClient: ModelEventClient;

  constructor (modelEventClient: ModelEventClient) {
    this.running = false;
    this.events = new EventEmitter();

    this.subscriberSocket = new Subscriber();
    this.modelEventClient = modelEventClient;
  }

  async start (caches: ModelEventSubscriberCaches): Promise<void> {
    try {
      this.subscriberSocket.connect(`tcp://127.0.0.1:${ASYNC_SERVER_TO_CLIENT_PORT}`);
      this.subscriberSocket.subscribe(...Object.keys(SOCKET_SUBSCRIBER_TOPICS));
      console.log(`[Model Event Subscriber] Subscriber started on port ${ASYNC_SERVER_TO_CLIENT_PORT}`);

      this.running = true;

      for await (const [topic, message] of this.subscriberSocket) {
        const notification = JSON.parse(message.toString());
        const type = topic.toString();

        if (type === 'SOCKET:CONNECT') {
          caches.tycoonSocket.set(notification.tycoonId, notification.socketId);
        }
        else if (type === 'SOCKET:DISCONNECT') {
          caches.tycoonSocket.clearBySocketId(notification.socketId);
          this.events.emit('disconnectSocket', notification.socketId);
        }
        else if (type === 'BUILDING:UPDATE') {
          caches.building.withPlanetId(notification.planetId).update(Building.fromJson(notification.building));
        }
        else if (type === 'COMPANY:UPDATE') {
          caches.company.withPlanetId(notification.planetId).update(Company.fromJson(notification.company));
        }
        else if (type === 'CORPORATION:UPDATE') {
          caches.corporation.withPlanetId(notification.planetId).update(Corporation.fromJson(notification.corporation));
        }
        else if (type === 'TYCOON:UPDATE') {
          caches.tycoon.loadTycoon(Tycoon.fromJson(notification.tycoon));
        }
        else if (type === 'TYCOON:UPDATE') {
          caches.tycoon.loadTycoon(Tycoon.fromJson(notification.tycoon));
        }
        else if (type === 'VISA:UPDATE') {
          caches.tycoonVisa.set(TycoonVisa.fromJson(notification.visa));
        }
        else if (type === 'VISA:DELETE') {
          caches.tycoonVisa.clearByVisaId(notification.visaId);
        }
        else {
          console.log(`[Model Event Subscriber] Unknown event topic ${topic}`);
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
    console.log('[Model Event Subscriber] Stopping...');
    this.subscriberSocket.close();
    console.log('[Model Event Subscriber] Stopped');
  }

}
