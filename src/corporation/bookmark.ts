
export default class Bookmark {
  id: string;
  corporationId: string;
  type: string;
  parentId: string;
  order: string;
  name: string;
  mapX: number;
  mapY: number;
  buildingId: string;

  constructor (id: string, corporationId: string, type: string, parentId: string, order: string, name: string, mapX: number, mapY: number, buildingId: string) {
    this.id = id;
    this.corporationId = corporationId;
    this.type = type;
    this.parentId = parentId;
    this.order = order;
    this.name = name;
    this.mapX = mapX;
    this.mapY = mapY;
    this.buildingId = buildingId;
  }

  toJson (): any {
    return {
      id: this.id,
      corporationId: this.corporationId,
      type: this.type,
      parentId: this.parentId,
      order: this.order,
      name: this.name,
      mapX: this.mapX,
      mapY: this.mapY,
      buildingId: this.buildingId
    };
  }

  static fromJson (json: any): Bookmark {
    return new Bookmark(
      json.id,
      json.corporationId,
      json.type,
      json.parentId,
      json.order,
      json.name,
      json.mapX,
      json.mapY,
      json.buildingId
    );
  }
}
