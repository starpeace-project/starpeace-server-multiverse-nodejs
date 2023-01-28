import _ from 'lodash';

import ConstructionQuantity from './construction-quantity';

export default class SimulationDefinition {
  id: string;
  type: string;
  maxLevel: number;
  constructionInputs: Array<ConstructionQuantity>;

  prestige: number;
  maintainance: number;
  beauty: number;
  pollution: number;

  constructor (id: string, type: string, maxLevel: number, constructionInputs: Array<ConstructionQuantity>, prestige: number, maintainance: number, beauty: number, pollution: number) {
    this.id = id;
    this.type = type;
    this.maxLevel = maxLevel;
    this.constructionInputs = constructionInputs;
    this.prestige = prestige;
    this.maintainance = maintainance;
    this.beauty = beauty;
    this.pollution = pollution;
  }

  toJson (): any {
    return {
      id: this.id,
      type: this.type,
      maxLevel: this.maxLevel,
      constructionInputs: _.map(this.constructionInputs, (ci) => ci.toJson()),
      prestige: this.prestige,
      maintainance: this.maintainance,
      beauty: this.beauty,
      pollution: this.pollution
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
