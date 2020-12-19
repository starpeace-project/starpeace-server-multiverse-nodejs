_ = require('lodash')

module.exports = class BuildingCache
  constructor: () ->
    @byId = {}

    @idsbyPlanetIdChunkId = {}
    @idsbyCompanyId = {}
    @idsByTownId = {}

  forId: (buildingId) -> @byId[buildingId]
  forChunk: (planetId, chunkX, chunkY) -> _.map(Array.from(@idsbyPlanetIdChunkId[planetId]?["#{chunkX}x#{chunkY}"] || []), (id) => @forId(id))
  forCompanyId: (companyId) -> _.map(Array.from(@idsbyCompanyId[companyId] || []), (id) => @forId(id))
  forTownId: (townId) -> _.map(Array.from(@idsByTownId[townId] || []), (id) => @forId(id))

  update: (planetId, buildingOrBuildings) ->
    if Array.isArray(buildingOrBuildings)
      @update(planetId, building) for building in buildingOrBuildings
    else
      @byId[buildingOrBuildings.id] = buildingOrBuildings

      @idsbyPlanetIdChunkId[planetId] = {} unless @idsbyPlanetIdChunkId[planetId]?
      @idsbyPlanetIdChunkId[planetId][buildingOrBuildings.chunkId] = new Set() unless @idsbyPlanetIdChunkId[planetId][buildingOrBuildings.chunkId]?
      @idsbyPlanetIdChunkId[planetId][buildingOrBuildings.chunkId].add(buildingOrBuildings.id)

      @idsbyCompanyId[buildingOrBuildings.companyId] = new Set() unless @idsbyCompanyId[buildingOrBuildings.companyId]?
      @idsbyCompanyId[buildingOrBuildings.companyId].add(buildingOrBuildings.id)

      @idsByTownId[buildingOrBuildings.townId] = new Set() unless @idsByTownId[buildingOrBuildings.townId]?
      @idsByTownId[buildingOrBuildings.townId].add(buildingOrBuildings.id)
