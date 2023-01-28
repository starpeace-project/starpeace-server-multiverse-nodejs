

export default class TycoonVisa {
  id: string;
  type: string;
  tycoonId: string;
  planetId: string;
  corporationId: string | undefined;
  expires: number;

  viewX: number;
  viewY: number;

  constructor (id: string, type: string, tycoonId: string, planetId: string, corporationId: string | undefined, expires: number, viewX: number, viewY: number) {
    this.id = id;
    this.type = type;
    this.tycoonId = tycoonId;
    this.planetId = planetId;
    this.corporationId = corporationId;
    this.expires = expires;
    this.viewX = viewX;
    this.viewY = viewY;
  }

  get isTycoon (): boolean {
    return this.type == 'tycoon';
  }

  withCorporationId (corporationId: string): TycoonVisa {
    this.corporationId = corporationId;
    return this;
  }

  withView (viewX: number, viewY: number) {
    this.viewX = viewX;
    this.viewY = viewY;
    return this;
  }

  touch (): TycoonVisa {
    this.expires = new Date().getTime();
    return this;
  }

  toJson () {
    return {
      id: this.id,
      type: this.type,
      tycoonId: this.tycoonId,
      planetId: this.planetId,
      corporationId: this.corporationId,
      expires: this.expires,
      viewX: this.viewX,
      viewY: this.viewY
    };
  }

  static fromJson (json: any): TycoonVisa {
    return new TycoonVisa(
      json.id,
      json.type,
      json.tycoonId,
      json.planetId,
      json.corporationId,
      json.expires,
      json.viewX,
      json.viewY
    );
  }
}
