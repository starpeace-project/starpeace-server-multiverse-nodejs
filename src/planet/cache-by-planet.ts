import _ from 'lodash';

import { type PlanetMetadata } from '../core/galaxy-manager.js';


export interface LoadableCache {
  loaded: boolean;

  load (): Promise<void>;
  close(): Promise<any>;
}

export default class CacheByPlanet<T extends LoadableCache> {
  cacheByPlanet: Record<string, T>;

  constructor (cacheByPlanet: Record<string, T>) {
    this.cacheByPlanet = cacheByPlanet;
  }

  closeAll (): Array<Promise<any>> {
    return Object.values(this.cacheByPlanet).map(c => c.close());
  }

  get loaded (): boolean {
    return Object.values(this.cacheByPlanet).every(c => c.loaded);
  }

  loadAll (): Array<Promise<void>> {
    return Object.values(this.cacheByPlanet).map(c => c.load());
  }

  entries (): Array<any> {
    return Object.entries(this.cacheByPlanet);
  }

  withPlanet (planet: PlanetMetadata): T {
    if (!planet || !this.cacheByPlanet[planet.id]) {
      throw "INVALID_PLANET";
    }
    return this.cacheByPlanet[planet.id];
  }


  withPlanetId (planetId: string): T {
    if (!planetId || !this.cacheByPlanet[planetId]) {
      throw "INVALID_PLANET";
    }
    return this.cacheByPlanet[planetId];
  }

}
