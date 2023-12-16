import TycoonVisa from "../../tycoon/tycoon-visa.js";

export default class BusEventsCache {

  pendingIssuedVisasByPlanetId: Record<string, Array<TycoonVisa>> = {};

  queueIssuedVisa (planetId: string, visa: TycoonVisa) {
    if (!this.pendingIssuedVisasByPlanetId[planetId]) {
      this.pendingIssuedVisasByPlanetId[planetId] = [];
    }
    this.pendingIssuedVisasByPlanetId[planetId].push(visa);
  }

  issuedVisasForPlanetId (planetId: string): Array<TycoonVisa> {
    const visas = this.pendingIssuedVisasByPlanetId[planetId] ?? [];
    this.pendingIssuedVisasByPlanetId[planetId] = [];
    return visas;
  }
}
