import { DateTime } from "luxon";

import Planet from "../planet/planet.js";
import { type SetupPlanetStores } from "./setup-planet.js";


export default class SetupSimulation {
  stores: SetupPlanetStores;

  constructor (stores: SetupPlanetStores) {
    this.stores = stores;
  }

  async export () {
    await this.stores.planet.set(new Planet(
      DateTime.fromISO('2200-01-01T00:00:00'
    )));
  }

}
