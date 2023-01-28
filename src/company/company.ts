
export default class Company {
  id: string;
  planetId: string;
  tycoonId: string;
  corporationId: string;
  sealId: string;
  name: string;

  constructor (id: string, planetId: string, tycoonId: string, corporationId: string, sealId: string, name: string) {
    this.id = id;
    this.planetId = planetId;
    this.tycoonId = tycoonId;
    this.corporationId = corporationId;
    this.sealId = sealId;
    this.name = name;
  }

  toJsonApi (): any {
    return {
      id: this.id,
      tycoonId: this.tycoonId,
      corporationId: this.corporationId,
      sealId: this.sealId,
      name: this.name
    };
  }

  toJson (): any {
    return {
      id: this.id,
      planetId: this.planetId,
      tycoonId: this.tycoonId,
      corporationId: this.corporationId,
      sealId: this.sealId,
      name: this.name
    };
  }

  static fromJson (json: any): Company {
    return new Company(
      json.id,
      json.planetId,
      json.tycoonId,
      json.corporationId,
      json.sealId,
      json.name
    );
  }
}
