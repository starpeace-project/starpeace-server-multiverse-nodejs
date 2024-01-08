import _ from 'lodash';
import { DateTime } from 'luxon';

export interface BuildingParameters {
  id: string;
  tycoonId: string;
  corporationId: string;
  companyId: string;
  definitionId: string;
  townId: string;
  name: string | undefined;
  mapX: number;
  mapY: number;
  level: number;
  upgrading: boolean;
  constructionStartedAt: DateTime | undefined;
  constructionFinishedAt: DateTime | undefined;
  condemnedAt: DateTime | undefined;
}

export default class Building {
  id: string;
  tycoonId: string;
  corporationId: string;
  companyId: string;

  definitionId: string;
  townId: string;

  name: string | undefined;
  mapX: number;
  mapY: number;

  level: number;
  upgrading: boolean;
  constructionStartedAt: DateTime | undefined;
  constructionFinishedAt: DateTime | undefined;

  condemnedAt: DateTime | undefined;

  constructor (parameters: BuildingParameters) {
    this.id = parameters.id;
    this.tycoonId = parameters.tycoonId;
    this.corporationId = parameters.corporationId;
    this.companyId = parameters.companyId;
    this.definitionId = parameters.definitionId;
    this.townId = parameters.townId;
    this.name = parameters.name;
    this.mapX = parameters.mapX;
    this.mapY = parameters.mapY;
    this.level = parameters.level;
    this.upgrading = parameters.upgrading;
    this.constructionStartedAt = parameters.constructionStartedAt;
    this.constructionFinishedAt = parameters.constructionFinishedAt;
    this.condemnedAt = parameters.condemnedAt;
  }

  get isIfel (): boolean {
    return this.corporationId === 'IFEL';
  }

  get constructed (): boolean {
    return !!this.constructionFinishedAt;
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
      level: this.level,
      upgrading: this.upgrading,
      constructionStartedAt: this.constructionStartedAt?.toISO(),
      constructionFinishedAt: this.constructionFinishedAt?.toISO(),
      condemnedAt: this.condemnedAt?.toISO()
    };
  }

  static fromJson (json: any): Building {
    return new Building({
      id: json.id,
      tycoonId: json.tycoonId,
      corporationId: json.corporationId,
      companyId: json.companyId,
      definitionId: json.definitionId,
      townId: json.townId,
      name: json.name ?? undefined,
      mapX: json.mapX,
      mapY: json.mapY,
      level: json.level,
      upgrading: json.upgrading,
      constructionStartedAt: json.constructionStartedAt ? DateTime.fromISO(json.constructionStartedAt) : undefined,
      constructionFinishedAt: json.constructionFinishedAt ? DateTime.fromISO(json.constructionFinishedAt) : undefined,
      condemnedAt: json.condemnedAt ? DateTime.fromISO(json.condemnedAt) : undefined
    });
  }

}
