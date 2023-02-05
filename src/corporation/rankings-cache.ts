import Rankings from './rankings';
import RankingsDao from '../corporation/rankings-dao';
import Utils from '../utils/utils';

export default class RankingCache {
  dao: RankingsDao;

  loaded: boolean = false;
  dirtyIds: Set<string> = new Set();

  byTypeId: Record<string, Rankings>;

  constructor (dao: RankingsDao) {
    this.dao = dao;
    this.byTypeId = {};
  }

  close (): Promise<any> {
    return this.dao.close();
  }

  load (): Promise<void> {
    return Utils.withRetries(10, async () => {
      for (let ranking of await this.dao.all()) {
        this.loadRankings(ranking);
      }
      this.loaded = true;
    });
  }

  loadRankings (rankings: Rankings): Rankings {
    this.byTypeId[rankings.rankingTypeId] = rankings;
    return rankings;
  }

  all (): Rankings[] { return Object.values(this.byTypeId); }
  forTypeId (rankingTypeId: string): Rankings | null { return this.byTypeId[rankingTypeId]; }

  update (rankingOrRankings: Rankings | Array<Rankings>): void {
    if (Array.isArray(rankingOrRankings)) {
      for (const ranking of rankingOrRankings) {
        this.update(ranking);
      }
    }
    else {
      this.loadRankings(rankingOrRankings);
      this.dirtyIds.add(rankingOrRankings.rankingTypeId);
    }
  }

}
