_ = require('lodash')

module.exports = class CompanyCache
  constructor: () ->
    @byId = {}

    @idsbyPlanetId = {}
    @idsbyCorporationId = {}

  forId: (companyId) -> @byId[companyId]
  forPlanetId: (planetId) -> _.map(Array.from(@idsbyPlanetId[planetId] || []), (id) => @forId(id))
  forCorporationId: (corporationId) -> _.map(Array.from(@idsbyCorporationId[corporationId] || []), (id) => @forId(id))

  update: (planetId, corporationOrCorporations) ->
    if Array.isArray(corporationOrCorporations)
      @update(planetId, corporation) for corporation in corporationOrCorporations
    else
      @byId[corporationOrCorporations.id] = corporationOrCorporations

      @idsbyPlanetId[planetId] = new Set() unless @idsbyPlanetId[planetId]?
      @idsbyPlanetId[planetId].add(corporationOrCorporations.id)

      @idsbyCorporationId[corporationOrCorporations.companyId] = new Set() unless @idsbyCorporationId[corporationOrCorporations.companyId]?
      @idsbyCorporationId[corporationOrCorporations.companyId].add(corporationOrCorporations.id)
