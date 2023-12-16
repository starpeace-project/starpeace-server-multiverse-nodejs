
export interface BuildingCloneSettingsParameters {
  sameCompany: boolean;
  sameTown: boolean;

  cloneName: boolean;
  cloneConnectionPosture: boolean;
  cloneSalaries: boolean;
  clonePrice: boolean;
  cloneSupplies: boolean;
  cloneServices: boolean;
  cloneRent: boolean;
  cloneMaintenance: boolean;
}

export default class BuildingCloneSettings {
  sameCompany: boolean;
  sameTown: boolean;

  cloneName: boolean;
  cloneConnectionPosture: boolean;
  cloneSalaries: boolean;
  clonePrice: boolean;
  cloneSupplies: boolean;
  cloneServices: boolean;
  cloneRent: boolean;
  cloneMaintenance: boolean;

  constructor (parameters: BuildingCloneSettingsParameters) {
    this.sameCompany = parameters.sameCompany,
    this.sameTown = parameters.sameTown,
    this.cloneName = parameters.cloneName,
    this.cloneConnectionPosture = parameters.cloneConnectionPosture,
    this.cloneSalaries = parameters.cloneSalaries,
    this.clonePrice = parameters.clonePrice,
    this.cloneSupplies = parameters.cloneSupplies,
    this.cloneServices = parameters.cloneServices,
    this.cloneRent = parameters.cloneRent,
    this.cloneMaintenance = parameters.cloneMaintenance
  }

  toJson (): any {
    return {
      sameCompany: this.sameCompany,
      sameTown: this.sameTown,
      cloneName: this.cloneName,
      cloneConnectionPosture: this.cloneConnectionPosture,
      cloneSalaries: this.cloneSalaries,
      clonePrice: this.clonePrice,
      cloneSupplies: this.cloneSupplies,
      cloneServices: this.cloneServices,
      cloneRent: this.cloneRent,
      cloneMaintenance: this.cloneMaintenance
    };
  }

  static fromJson (json: any): BuildingCloneSettings {
    return new BuildingCloneSettings({
      sameCompany: json.sameCompany ?? false,
      sameTown: json.sameTown ?? false,
      cloneName: json.cloneName ?? false,
      cloneConnectionPosture: json.cloneConnectionPosture ?? false,
      cloneSalaries: json.cloneSalaries ?? false,
      clonePrice: json.clonePrice ?? false,
      cloneSupplies: json.cloneSupplies ?? false,
      cloneServices: json.cloneServices ?? false,
      cloneRent: json.cloneRent ?? false,
      cloneMaintenance: json.cloneMaintenance ?? false
    });
  }

  static fromArray (ids: Array<string>): BuildingCloneSettings {
    const optionIds = new Set(ids);
    return new BuildingCloneSettings({
      sameCompany: optionIds.has('sameCompany'),
      sameTown: optionIds.has('sameTown'),

      cloneName: optionIds.has('name'),
      cloneConnectionPosture: optionIds.has('connectionPosture'),
      cloneSalaries: optionIds.has('salaries'),
      clonePrice: optionIds.has('price'),
      cloneSupplies: optionIds.has('supplies'),
      cloneServices: optionIds.has('services'),
      cloneRent: optionIds.has('rent'),
      cloneMaintenance: optionIds.has('maintenance')
    });
  }
}
