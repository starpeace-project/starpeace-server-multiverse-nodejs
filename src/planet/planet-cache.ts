import _ from 'lodash';

import Planet from './planet';
import PlanetDao from './planet-dao';

import Utils from '../utils/utils';
import { DateTime } from 'luxon';

export default class PlanetCache {
  dao: PlanetDao;

  loaded: boolean = false;
  dirty: boolean = false;

  planet: Planet = new Planet(DateTime.now());

  constructor (dao: PlanetDao) {
    this.dao = dao;
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      const planet: Planet | null = await this.dao.get();
      if (!planet) throw "MISSING_PLANET";
      this.planet = planet;
      this.loaded = true;
    });
  }

  flush (): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.dirty || !this.planet) {
        return resolve();
      }

      this.dao.set(this.planet)
        .then(() => { this.dirty = false; })
        .then(resolve)
        .catch(reject);
    });
  }

  update (planet: Planet): Planet {
    this.planet = planet;
    this.dirty = true;
    return planet;
  }

}
