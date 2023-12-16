
export default class BuildingRentMetrics {
  resourceId: string;

  mostRecentVelocity: number;

  mostRecentExtraBeauty: number;
  mostRecentCrimeResistance: number;
  mostRecentPollutionResistance: number;
  mostRecentExtraPrivacy: number;

  constructor (resourceId: string,  mostRecentVelocity: number, mostRecentExtraBeauty: number, mostRecentCrimeResistance: number, mostRecentPollutionResistance: number, mostRecentExtraPrivacy: number) {
    this.resourceId = resourceId;
    this.mostRecentVelocity = mostRecentVelocity;
    this.mostRecentExtraBeauty = mostRecentExtraBeauty;
    this.mostRecentCrimeResistance = mostRecentCrimeResistance;
    this.mostRecentPollutionResistance = mostRecentPollutionResistance;
    this.mostRecentExtraPrivacy = mostRecentExtraPrivacy;
  }

  clear (): boolean {
    const didClear = this.mostRecentVelocity !== 0 || this.mostRecentExtraBeauty !== 0 || this.mostRecentCrimeResistance !== 0 || this.mostRecentPollutionResistance !== 0 || this.mostRecentExtraPrivacy !== 0;
    this.mostRecentVelocity = 0;
    this.mostRecentExtraBeauty = 0;
    this.mostRecentCrimeResistance = 0;
    this.mostRecentPollutionResistance = 0;
    this.mostRecentExtraPrivacy = 0;
    return didClear;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      mostRecentVelocity: this.mostRecentVelocity,
      mostRecentExtraBeauty: this.mostRecentExtraBeauty,
      mostRecentCrimeResistance: this.mostRecentCrimeResistance,
      mostRecentPollutionResistance: this.mostRecentPollutionResistance,
      mostRecentExtraPrivacy: this.mostRecentExtraPrivacy
    };
  }

  static fromJson (json: any): BuildingRentMetrics {
    return new BuildingRentMetrics(
      json.resourceId,
      json.mostRecentVelocity ?? 0,
      json.mostRecentExtraBeauty ?? 0,
      json.mostRecentCrimeResistance ?? 0,
      json.mostRecentPollutionResistance ?? 0,
      json.mostRecentExtraPrivacy ?? 0
    );
  }
}
