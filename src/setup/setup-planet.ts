import { type GalaxyMetadata, type PlanetMetadata } from "../core/galaxy-manager.js";
import BookmarkStore from "../corporation/bookmark-store.js";
import BuildingStore from "../building/building-store.js";
import CompanyStore from "../company/company-store.js";
import CorporationStore from "../corporation/corporation-store.js";
import InventionSummaryStore from "../company/invention-summary-store.js";
import MailStore from "../corporation/mail-store.js";
import RankingsStore from "../corporation/rankings-store.js";
import PlanetStore from "../planet/planet-store.js";
import TownStore from "../planet/town-store.js";
import TycoonStore from "../tycoon/tycoon-store.js";
import TycoonTokenStore from "../tycoon/tycoon-token-store.js";

import { type SetupConfigurations } from "../setup.js";
import SetupPlanetMetadata from "./setup-planet-metadata.js";
import SetupSimulation from "./setup-simulation.js";
import SetupTowns from "./setup-towns.js";


export interface SetupPlanetStores {
  building: BuildingStore;
  company: CompanyStore;
  inventionSummary: InventionSummaryStore;
  bookmark: BookmarkStore;
  corporation: CorporationStore;
  mail: MailStore;
  ranking: RankingsStore;
  planet: PlanetStore;
  town: TownStore;
  tycoon: TycoonStore;
  tycoonToken: TycoonTokenStore;
}

export default class SetupPlanet {
  configurations: SetupConfigurations;
  galaxyMetadata: GalaxyMetadata;
  planetMetadata: PlanetMetadata;
  stores: SetupPlanetStores;


  metadata: SetupPlanetMetadata;
  simulation: SetupSimulation;
  towns: SetupTowns;

  constructor (configurations: SetupConfigurations, galaxyMetadata: GalaxyMetadata, planetMetadata: PlanetMetadata) {
    this.configurations = configurations;
    this.galaxyMetadata = galaxyMetadata;
    this.planetMetadata = planetMetadata;
    this.stores = {
      building: new BuildingStore(false, this.planetMetadata.id),
      company: new CompanyStore(false, this.planetMetadata.id),
      inventionSummary: new InventionSummaryStore(false, this.planetMetadata.id),
      bookmark: new BookmarkStore(false, this.planetMetadata.id),
      corporation: new CorporationStore(false, this.planetMetadata.id),
      mail: new MailStore(false, this.planetMetadata.id),
      ranking: new RankingsStore(false, this.planetMetadata.id),
      planet: new PlanetStore(false, this.planetMetadata.id),
      town: new TownStore(false, this.planetMetadata.id),
      tycoon: new TycoonStore(false),
      tycoonToken: new TycoonTokenStore(false)
    };

    this.metadata = new SetupPlanetMetadata(configurations);
    this.simulation = new SetupSimulation(this.stores);
    this.towns = new SetupTowns(this.stores, configurations, Math.floor(Math.random() * 2));
  }

  async export () {
    this.metadata.export(this.planetMetadata.id, this.planetMetadata.mapId);

    await this.simulation.export();
    await this.towns.export(this.planetMetadata.id, this.planetMetadata.mapId);

    await Promise.all([
      this.stores.building.close(),
      this.stores.company.close(),
      this.stores.inventionSummary.close(),
      this.stores.bookmark.close(),
      this.stores.corporation.close(),
      this.stores.mail.close(),
      this.stores.ranking.close(),
      this.stores.planet.close(),
      this.stores.town.close(),
      this.stores.tycoon.close(),
      this.stores.tycoonToken.close()
    ]);
  }
}
