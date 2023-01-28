import _ from 'lodash';

// import BuildingDefinition from './building-definition';
// import SimulationDefinition from './simulation/simulation-definition';

export default class Building {
  id: string;
  tycoonId: string;
  corporationId: string;
  companyId: string;

  definitionId: string;
  townId: string;

  name: string | null;
  mapX: number;
  mapY: number;
  stage: number;

  // definition: BuildingDefinition;
  // simulationDefinition: SimulationDefinition;

  // pullInputs: Array;
  // pullOutputs: Array;

  // pushOutputs: Array;


  constructor (id: string, tycoonId: string, corporationId: string, companyId: string, definitionId: string, townId: string, name: string | null, mapX: number, mapY: number, stage: number) {
    this.id = id;
    this.tycoonId = tycoonId;
    this.corporationId = corporationId;
    this.companyId = companyId;
    this.definitionId = definitionId;
    this.townId = townId;
    this.name = name;
    this.mapX = mapX;
    this.mapY = mapY;
    this.stage = stage;
  }

  get chunkX (): number {
    return Math.floor(this.mapX / 20);
  }
  get chunkY (): number {
    return Math.floor(this.mapY / 20);
  }
  get chunkId (): string {
    return `${this.chunkX}x${this.chunkY}`;
  }

  pullInputs ()  {
    // let capacity = 0;
    // // if (noMoney) capacity = 0;

    // for (let connection of []) { // inputs
    //   connection.sinkCapacity = capacity;
    //   connection.velocity = Math.min(capacity, connection.sourceCapacity);

    //   if (connection.velocity > 0) {
    //     // lower source storage
    //     // raise sink storage, with quality
    //     // raise source money
    //     // lower sink money
    //     capacity -= connection.velocity;
    //   }
    // }
  }

  doAction () {
    // let sinkCapacity: number = 0
    // for (let connection of []) { // outputs
    //   sinkCapacity += connection.sinkCapacity;
    // }

    // let freeSpace: number = 0;
    // let maxVelocity: number = 0;
    // let capacity: number = _.min([freeSpace, sinkCapacity, maxVelocity]);

    // for (let connection of []) { // outputs
    //   connection.sourceCapacity = capacity
    //   connection.resourceQuality = 0

    //   let velocity = Math.min(capacity, connection.sinkCapacity)
    //   if (velocity > 0) {
    //     capacity -= velocity;
    //   }
    // }
  }

  toJson (): any {
    return {
      id: this.id,
      tycoonId: this.tycoonId,
      corporationId: this.corporationId,
      companyId: this.companyId,
      definitionId: this.definitionId,
      townId: this.townId,
      name: this.name,
      mapX: this.mapX,
      mapY: this.mapY,
      stage: this.stage
    };
  }

  static fromJson (json: any): Building {
    return new Building(
      json.id,
      json.tycoonId,
      json.corporationId,
      json.companyId,
      json.townId,
      json.definitionId,
      json.name ?? null,
      json.mapX,
      json.mapY,
      json.stage ?? 0
    );
  }
}
