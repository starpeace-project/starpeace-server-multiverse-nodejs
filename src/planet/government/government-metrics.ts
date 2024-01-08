
export class Service {
  /**
   * Key service type ID's
   */
  static TYPES = ['COLLEGE', 'GARBAGE', 'FIRE', 'HOSPITAL', 'PRISON', 'MUSEUM', 'POLICE', 'SCHOOL', 'PARK'];

  typeId: string;
  value: number;

  constructor (typeId: string, value: number) {
    this.typeId = typeId;
    this.value = value;
  }

  toJson (): any {
    return {
      typeId: this.typeId,
      value: this.value
    };
  }

  static fromJson (json: any): Service {
    return new Service(json.typeId, json.value);
  }
}

export class Commerce {
  static TAX_CATEGORY_IDS = new Set(['COMMERCE', 'INDUSTRY', 'LOGISTICS', 'REAL_ESTATE', 'SERVICE']);
  static TAX_EXCLUDED_INDUSTRY_IDS = new Set(['HEADQUARTERS', 'MAUSOLEUM']);

  industryTypeId: string;
  demand: number;
  supply: number;
  capacity: number;
  ratio: number;
  ifelPrice: number;
  averagePrice: number;
  quality: number;

  constructor (industryTypeId: string, demand: number, supply: number, capacity: number, ratio: number, ifelPrice: number, averagePrice: number, quality: number) {
    this.industryTypeId = industryTypeId;
    this.demand = demand;
    this.supply = supply;
    this.capacity = capacity;
    this.ratio = ratio;
    this.ifelPrice = ifelPrice;
    this.averagePrice = averagePrice;
    this.quality = quality;
  }

  toJson (): any {
    return {
      industryTypeId: this.industryTypeId,
      demand: this.demand,
      supply: this.supply,
      capacity: this.capacity,
      ratio: this.ratio,
      ifelPrice: this.ifelPrice,
      averagePrice: this.averagePrice,
      quality: this.quality
    };
  }

  static fromJson (json: any): Commerce {
    return new Commerce(
      json.industryTypeId,
      json.demand,
      json.supply,
      json.capacity,
      json.ratio,
      json.ifelPrice,
      json.averagePrice,
      json.quality
    );
  }
}

/**
 * Resource ID's of expected labor resource, and used for Population/Employment/Housing
 */
export const LABOR_RESOURCE_IDS = ['EXECUTIVE', 'PROFESSIONAL', 'WORKER'];

export class Population {
  resourceId: string;
  population: number;
  unemployed: number;
  homeless: number;

  constructor (resourceId: string, population: number, unemployed: number, homeless: number) {
    this.resourceId = resourceId;
    this.population = population;
    this.unemployed = unemployed;
    this.homeless = homeless;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      population: this.population,
      unemployed: this.unemployed,
      homeless: this.homeless
    };
  }

  static fromJson (json: any): Population {
    return new Population(
      json.resourceId,
      json.population ?? 0,
      json.unemployed ?? 0,
      json.homeless ?? 0
    );
  }
}

/**
 * Spending Power previously (fixed?) 800%, 25%, and 5%
 */
export class Employment {
  resourceId: string;
  total: number;
  vacancies: number;
  averageWage: number;
  minimumWage: number;

  constructor (resourceId: string, total: number, vacancies: number, averageWage: number, minimumWage: number) {
    this.resourceId = resourceId;
    this.total = total;
    this.vacancies = vacancies;
    this.averageWage = averageWage;
    this.minimumWage = minimumWage;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      total: this.total,
      vacancies: this.vacancies,
      averageWage: this.averageWage,
      minimumWage: this.minimumWage
    };
  }

  static fromJson (json: any): Employment {
    return new Employment(
      json.resourceId,
      json.total ?? 0,
      json.vacancies ?? 0,
      json.averageWage ?? 0,
      json.minimumWage ?? 0
    );
  }
}

export class Housing {
  resourceId: string;
  total: number;
  vacancies: number;
  averageRent: number;
  qualityIndex: number;

  constructor (resourceId: string, total: number, vacancies: number, averageRent: number, qualityIndex: number) {
    this.resourceId = resourceId;
    this.total = total;
    this.vacancies = vacancies;
    this.averageRent = averageRent;
    this.qualityIndex = qualityIndex;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      total: this.total,
      vacancies: this.vacancies,
      averageRent: this.averageRent,
      qualityIndex: this.qualityIndex
    };
  }

  static fromJson (json: any): Housing {
    return new Housing(
      json.resourceId,
      json.total ?? 0,
      json.vacancies ?? 0,
      json.averageRent ?? 0,
      json.qualityIndex ?? 0
    );
  }
}

export default class GovernmentMetrics {
  townId: string;

  qualityOfLife: number;
  services: Array<Service>;
  commerce: Array<Commerce>;

  population: Array<Population>;
  employment: Array<Employment>;
  housing: Array<Housing>;

  constructor (townId: string, qualityOfLife: number, services: Array<Service>, commerce: Array<Commerce>, population: Array<Population>, employment: Array<Employment>, housing: Array<Housing>) {
    this.townId = townId;
    this.qualityOfLife = qualityOfLife;
    this.services = services;
    this.commerce = commerce;
    this.population = population;
    this.employment = employment;
    this.housing = housing;
  }

  toJson (): any {
    return {
      townId: this.townId,
      qol: this.qualityOfLife,
      services: this.services.map(s => s.toJson()),
      commerce: this.commerce.map(s => s.toJson()),
      population: this.population.map(s => s.toJson()),
      employment: this.employment.map(s => s.toJson()),
      housing: this.housing.map(s => s.toJson()),
    }
  }

  static fromJson (json: any): GovernmentMetrics {
    return new GovernmentMetrics(
      json.townId,
      json.qol ?? 0,
      (json.services ?? []).map(Service.fromJson),
      (json.commerce ?? []).map(Commerce.fromJson),
      (json.population ?? []).map(Population.fromJson),
      (json.employment ?? []).map(Employment.fromJson),
      (json.housing ?? []).map(Housing.fromJson),
    );
  }
}
