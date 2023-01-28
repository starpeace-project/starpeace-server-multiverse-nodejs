import { DateTime } from "luxon";

import Planet from "../planet/planet";
import { SetupPlanetStores } from "./setup-planet";


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
