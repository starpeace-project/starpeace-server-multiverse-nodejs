_ = require('lodash')

Corporation = require('../corporation/corporation')
CorporationCache = require('../corporation/corporation-cache')
CorporationStore = require('../store/corporation/corporation-store')


Utils = require('../utils/utils')

module.exports = class CorporationManager
  constructor: (@modelEventClient, @galaxyManager) ->
    @stores = {}
    @stores[planet.id] = new CorporationStore(true, planet.id) for planet in (@galaxyManager.metadata.planets || [])

    @cache = new CorporationCache()
    @loadCache(planet.id) for planet in (@galaxyManager.metadata.planets || [])

  loadCache: (planetId) ->
    @stores[planetId].all()
      .then (corporations) => @cache.update(planetId, corporations)
      .catch (err) => setTimeout((=> @loadCache(planetId)), 500)
  updateCache: (planetId, corporationId) ->
    @stores[planetId].get(corporationId)
      .then (corporation) => @cache.update(planetId, corporation) if corporation?
      .catch (err) => setTimeout((=> @updateCache(planetId, corporationId)), 500)


  close: () ->
    Promise.all(_.map(_.values(@stores), (store) -> store.close()))

  forId: (buildingId) ->
    new Promise (resolve, reject) => resolve(@cache.forId(buildingId))
  forPlanet: (planetId) ->
    new Promise (resolve, reject) => resolve(@cache.forPlanetId(planetId))
  forTycoon: (tycoonId) ->
    new Promise (resolve, reject) => resolve(@cache.forTycoonId(tycoonId))

  create: (planetId, tycoonId, levelId, name) ->
    corporation = new Corporation()
    corporation.id = Utils.uuid()
    corporation.planetId = planetId
    corporation.tycoonId = tycoonId
    corporation.levelId = levelId
    corporation.name = name
    @modelEventClient.createCorporation(corporation)
