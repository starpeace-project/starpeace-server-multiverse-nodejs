
export class Ranking {
  rank: number;
  value: string;
  tycoonId: string;
  corporationId: string;

  constructor (rank: number, value: string, tycoonId: string, corporationId: string) {
    this.rank = rank;
    this.value = value;
    this.tycoonId = tycoonId;
    this.corporationId = corporationId;
  }

  toJson (): any {
    return {
      rank: this.rank,
      value: this.value,
      tycoonId: this.tycoonId,
      corporationId: this.corporationId
    };
  }

  static fromJson (json: any): Ranking {
    return new Ranking(
      json.rank,
      json.value,
      json.tycoonId,
      json.corporationId
    );
  }
}

export default class Rankings {
  rankingTypeId: string;
  rankings: Ranking[];

  constructor (rankingTypeId: string, rankings: Ranking[]) {
    this.rankingTypeId = rankingTypeId;
    this.rankings = rankings;
  }

  toJson (): any {
    return {
      rankingTypeId: this.rankingTypeId,
      rankings: this.rankings.map(r => r.toJson())
    };
  }

  static fromJson (json: any): Rankings {
    return new Rankings(
      json.rankingTypeId,
      json.rankings.map(Ranking.fromJson)
    );
  }
}
