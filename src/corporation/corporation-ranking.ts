
export default class CorporationRanking {
  rankingTypeId: string;
  rank: number;

  constructor (rankingTypeId: string, rank: number) {
    this.rankingTypeId = rankingTypeId;
    this.rank = rank;
  }

  toJson (): any {
    return {
      rankingTypeId: this.rankingTypeId,
      rank: this.rank
    };
  }

  static fromJson (json: any): CorporationRanking {
    return new CorporationRanking(
      json.rankingTypeId,
      json.rank ?? 0
    );
  }
}
