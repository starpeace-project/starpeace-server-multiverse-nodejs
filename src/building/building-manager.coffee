_ = require('lodash')

BuildingCache = require('../building/building-cache')
BuildingStore = require('../store/building/building-store')
Utils = require('../utils/utils')

module.exports = class BuildingManager
  constructor: (@galaxyManager) ->
    @stores = {}
    @stores[planet.id] = new BuildingStore(true, planet.id) for planet in (@galaxyManager.metadata.planets || [])

    @cache = new BuildingCache()
    @loadCache(planet.id) for planet in (@galaxyManager.metadata.planets || [])

  loadCache: (planetId) ->
    @stores[planetId].all()
      .then (buildings) => @cache.update(planetId, buildings)
      .catch (err) => setTimeout((=> @loadCache(planetId)), 500)
  updateCache: (planetId, buildingId) ->
    @stores[planetId].get(buildingId)
      .then (building) => @cache.update(planetId, building) if building?
      .catch (err) => setTimeout((=> @updateCache(planetId, buildingId)), 500)

  close: () ->
    Promise.all(_.map(_.values(@stores), (store) -> store.close()))

  forId: (buildingId) ->
    new Promise (resolve, reject) => resolve(@cache.forId(buildingId))
  forChunk: (planetId, chunkX, chunkY) ->
    new Promise (resolve, reject) => resolve(@cache.forChunk(planetId, chunkX, chunkY))
  forCompany: (companyId) ->
    new Promise (resolve, reject) => resolve(@cache.forCompanyId(companyId))
  forTown: (townId) ->
    new Promise (resolve, reject) => resolve(@cache.forTownId(townId))
