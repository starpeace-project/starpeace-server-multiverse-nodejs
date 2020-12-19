_ = require('lodash')

RankingStore = require('../store/corporation/ranking-store')

Utils = require('../utils/utils')

module.exports = class RankingManager
  constructor: (@galaxyManager) ->
    @stores = {}
    @stores[planet.id] = new RankingStore(true, planet.id) for planet in (@galaxyManager.metadata.planets || [])

  close: () ->
    Promise.all(_.map(_.values(@stores), (store) -> store.close()))

  forId: (planetId, rankingTypeId) ->
    new Promise (resolve, reject) =>
      return reject('INVALID_PLANET') unless @stores[planetId]?
      @stores[planetId].get(rankingTypeId)
        .then resolve
        .catch reject
