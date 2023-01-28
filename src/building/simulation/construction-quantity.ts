
export default class ConstructionQuantity {
  resourceId: string;
  quantity: number;
  maxVelocity: number;

  constructor (resourceId: string, quantity: number, maxVelocity: number) {
    this.resourceId = resourceId;
    this.quantity = quantity;
    this.maxVelocity = maxVelocity;
  }

  toJson (): any {
    return {
      resourceId: this.resourceId,
      quantity: this.quantity,
      maxVelocity: this.maxVelocity
    };
  }

  static fromJson (json: any): ConstructionQuantity {
    return new ConstructionQuantity(
      json.resourceId,
      json.quantity,
      json.maxVelocity
    );
  }
}
