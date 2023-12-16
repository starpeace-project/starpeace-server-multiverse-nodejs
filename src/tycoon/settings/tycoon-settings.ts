

export default class TycoonSettings {
  tycoonId: string;

  viewX: number;
  viewY: number;

  constructor (tycoonId: string, viewX: number, viewY: number) {
    this.tycoonId = tycoonId;
    this.viewX = viewX;
    this.viewY = viewY;
  }

  withView (viewX: number, viewY: number): TycoonSettings {
    this.viewX = viewX;
    this.viewY = viewY;
    return this;
  }

  toJson () {
    return {
      tycoonId: this.tycoonId,
      viewX: this.viewX,
      viewY: this.viewY
    };
  }

  static fromJson (json: any): TycoonSettings {
    return new TycoonSettings(
      json.tycoonId,
      json.viewX,
      json.viewY
    );
  }
}
