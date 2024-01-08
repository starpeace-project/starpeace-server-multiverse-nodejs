
export default class Town {
  id: string;
  name: string;
  sealId: string;
  color: number;

  buildingId: string;
  mapX: number;
  mapY: number;

  cash: number;

  constructor (id: string, name: string, sealId: string, color: number, buildingId: string, mapX: number, mapY: number, cash: number) {
    this.id = id;
    this.name = name;
    this.sealId = sealId;
    this.color = color;
    this.buildingId = buildingId;
    this.mapX = mapX;
    this.mapY = mapY;
    this.cash = cash;
  }

  toJson (): any {
    return {
      id: this.id,
      name: this.name,
      sealId: this.sealId,
      color: this.color,
      buildingId: this.buildingId,
      mapX: this.mapX,
      mapY: this.mapY,
      cash: this.cash
    };
  }

  static fromJson (json: any): Town {
    return new Town(
      json.id,
      json.name,
      json.sealId,
      json.color,
      json.buildingId,
      json.mapX,
      json.mapY,
      json.cash ?? 0
    );
  }
}
