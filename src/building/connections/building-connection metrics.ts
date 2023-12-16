
export default class BuildingConnectionMetrics {
  id: string;

  sourceCapacity: number = 0;
  sinkCapacity: number = 0;

  price: number = 0;
  velocity: number = 0;
  quality: number = 0;
  transportCost: number = 0;

  constructor (id: string, sourceCapacity: number, sinkCapacity: number, price: number, velocity: number, quality: number, transportCost: number) {
    this.id = id;
    this.sourceCapacity = sourceCapacity;
    this.sinkCapacity = sinkCapacity;
    this.price = price;
    this.velocity = velocity;
    this.quality = quality;
    this.transportCost = transportCost;
  }

  toJson (): any {
    return {
      id: this.id,
      sourceCapacity: this.sourceCapacity,
      sinkCapacity: this.sinkCapacity,
      price: this.price,
      velocity: this.velocity,
      quality: this.quality,
      transportCost: this.transportCost
    };
  }

  static fromJson (json: any): BuildingConnectionMetrics {
    return new BuildingConnectionMetrics(
      json.id,
      json.sourceCapacity ?? 0,
      json.sinkCapacity ?? 0,
      json.price ?? 0,
      json.velocity ?? 0,
      json.quality ?? 0,
      json.transportCost ?? 0
    );
  }
}
