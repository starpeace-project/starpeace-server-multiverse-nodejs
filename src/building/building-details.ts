
export interface ProductConnection {
  id: string;
  valid: boolean;

  sinkCompanyId: string;
  sinkCompanyName: string;
  sinkBuildingId: string;
  sinkBuildingName: string;
  sinkBuildingMapX: number;
  sinkBuildingMapY: number;

  velocity: number;
  transportCost: number;
}

export interface Product {
  resourceId: string;
  price: number;
  totalVelocity: number;
  quality: number;
  connections: Array<ProductConnection>;
}


export default interface BuildingDetails {
  id: string;
  products: Array<Product>;
}
