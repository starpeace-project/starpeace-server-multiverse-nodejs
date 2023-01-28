import TycoonVisa from "./tycoon-visa";
import TycoonVisaDao from "./tycoon-visa-dao";
import Utils from "../utils/utils";

export default class TycoonVisaCache {
  dao: TycoonVisaDao;
  loaded: boolean = false;

  byId: Record<string, TycoonVisa>;
  visaIdByTycoonId: Record<string, string>;
  visaIdsByPlanetId: Record<string, Set<string>>;

  constructor (dao: TycoonVisaDao) {
    this.dao = dao;
    this.byId = {};
    this.visaIdByTycoonId = {};
    this.visaIdsByPlanetId = {};
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (let visa of await this.dao.all()) {
        this.set(visa);
      }
      this.loaded = true;
    });
  }

  all (): TycoonVisa[] {
    return Object.values(this.byId);
  }

  forId (visaId: string): TycoonVisa | null {
    const now = new Date().getTime();
    if (this.byId[visaId]) {
      if (this.byId[visaId].expires > now) {
        return this.byId[visaId];
      }
      else {
        this.clearByVisaId(visaId);
      }
    }
    return null;
  }
  forTycoonId (tycoonId: string): TycoonVisa | null {
    return this.forId(this.visaIdByTycoonId[tycoonId]);
  }
  forPlanetId (planetId: string): TycoonVisa[] {
    return Array.from(this.visaIdsByPlanetId[planetId] ?? []).map(id => this.forId(id)).filter(v => !!v) as TycoonVisa[];
  }

  set (visa: TycoonVisa) {
    this.visaIdByTycoonId[visa.tycoonId] = visa.id;
    if (!this.visaIdsByPlanetId[visa.planetId]) {
      this.visaIdsByPlanetId[visa.planetId] = new Set();
    }
    this.visaIdsByPlanetId[visa.planetId].add(visa.id);
    this.byId[visa.id] = visa;
  }

  clearByVisaId (visaId: string): string | null {
    if (this.byId[visaId]) {
      delete this.visaIdByTycoonId[this.byId[visaId].tycoonId];
      this.visaIdsByPlanetId[this.byId[visaId].planetId]?.delete(visaId);
      delete this.byId[visaId];
      return visaId;
    }
    return null;
  }
  clearByTycoonId (tycoonId: string): string | null {
    const visaId: string | undefined = this.forTycoonId(tycoonId)?.id;
    return visaId ? this.clearByVisaId(visaId) : null;
  }

  countForPlanet (planetId: string): number {
    return this.forPlanetId(planetId).length;
  }

}
