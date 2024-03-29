import Rankings from './rankings.js';
import type RankingsDao from '../corporation/rankings-dao.js';
import Utils from '../utils/utils.js';

export default class RankingsCache {
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

  flush (): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.dirtyIds.size) {
        return resolve();
      }

      Promise.all(Array.from(this.dirtyIds).map(id => {
        return this.dao.set(this.byTypeId[id]);
      }))
        .then((rankings: Rankings[]) => {
          for (const ranking of rankings) {
            this.dirtyIds.delete(ranking.rankingTypeId);
          }
        })
        .then(resolve)
        .catch(reject);
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
