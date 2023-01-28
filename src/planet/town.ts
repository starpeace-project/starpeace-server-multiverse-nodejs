
export default class Town {
  id: string;
  name: string;
  sealId: string;
  color: number;

  buildingId: string;
  mapX: number;
  mapY: number;

  constructor (id: string, name: string, sealId: string, color: number, buildingId: string, mapX: number, mapY: number) {
    this.id = id;
    this.name = name;
    this.sealId = sealId;
    this.color = color;
    this.buildingId = buildingId;
    this.mapX = mapX;
    this.mapY = mapY;
  }

  toJson (): any {
    return {
      id: this.id,
      name: this.name,
      sealId: this.sealId,
      color: this.color,
      buildingId: this.buildingId,
      mapX: this.mapX,
      mapY: this.mapY
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
      json.mapY
    );
  }
}
