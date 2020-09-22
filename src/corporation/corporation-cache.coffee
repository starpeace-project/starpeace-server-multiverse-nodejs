_ = require('lodash')

module.exports = class CorporationCache
  constructor: () ->
    @byId = {}

    @idsbyPlanetId = {}
    @idsbyTycoonId = {}

  forId: (corporationId) -> @byId[corporationId]
  forPlanetId: (planetId) -> _.map(Array.from(@idsbyPlanetId[planetId] || []), (id) => @forId(id))
  forTycoonId: (tycoonId) -> _.map(Array.from(@idsbyTycoonId[tycoonId] || []), (id) => @forId(id))

  update: (planetId, corporationOrCorporations) ->
    if Array.isArray(corporationOrCorporations)
      @update(planetId, corporation) for corporation in corporationOrCorporations
    else
      @byId[corporationOrCorporations.id] = corporationOrCorporations

      @idsbyPlanetId[planetId] = new Set() unless @idsbyPlanetId[planetId]?
      @idsbyPlanetId[planetId].add(corporationOrCorporations.id)

      @idsbyTycoonId[corporationOrCorporations.tycoonId] = new Set() unless @idsbyTycoonId[corporationOrCorporations.tycoonId]?
      @idsbyTycoonId[corporationOrCorporations.tycoonId].add(corporationOrCorporations.id)
