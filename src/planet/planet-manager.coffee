_ = require('lodash')
bcrypt = require('bcrypt')

Town = require('./town')
TownStore = require('../store/planet/town-store')

Utils = require('../utils/utils')

module.exports = class PlanetManager
  constructor: (@galaxyManager) ->
    @stores = {}
    @stores[planet.id] = new TownStore(true, planet.id) for planet in (@galaxyManager.metadata.planets || [])

  close: () ->
    Promise.all(_.map(_.values(@stores), (store) -> store.close()))

  forId: (planetId, id) -> @store[planetId].get(id)

  listTowns: (planetId) ->
    new Promise (resolve, reject) =>
      return reject('INVALID_PLANET') unless @stores[planetId]?
      @stores[planetId].all()
        .then resolve
        .catch reject
