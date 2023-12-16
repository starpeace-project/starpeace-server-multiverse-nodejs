import Utils from "../utils/utils.js";

export default class Company {
  id: string;
  tycoonId: string;
  corporationId: string;
  sealId: string;
  name: string;

  constructor (id: string,  tycoonId: string, corporationId: string, sealId: string, name: string) {
    this.id = id;
    this.tycoonId = tycoonId;
    this.corporationId = corporationId;
    this.sealId = sealId;
    this.name = name;
  }

  toJson (): any {
    return {
      id: this.id,
      tycoonId: this.tycoonId,
      corporationId: this.corporationId,
      sealId: this.sealId,
      name: this.name,
    };
  }

  static create (tycoonId: string, corporationId: string, sealId: string, name: string): Company {
    return new Company(
      Utils.uuid(),
      tycoonId,
      corporationId,
      sealId,
      name
    );
  }
  static fromJson (json: any): Company {
    return new Company(
      json.id,
      json.tycoonId,
      json.corporationId,
      json.sealId,
      json.name
    );
  }
}
