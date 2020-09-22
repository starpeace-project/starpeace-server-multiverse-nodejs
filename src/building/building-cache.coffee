_ = require('lodash')

module.exports = class BuildingCache
  constructor: () ->
    @byId = {}

    @idsbyPlanetIdChunkId = {}
    @idsbyCompanyId = {}

  forId: (buildingId) -> @byId[buildingId]
  forChunk: (planetId, chunkX, chunkY) -> _.map(Array.from(@idsbyPlanetIdChunkId[planetId]?["#{chunkX}x#{chunkY}"] || []), (id) => @forId(id))
  forCompanyId: (companyId) -> _.map(Array.from(@idsbyCompanyId[companyId] || []), (id) => @forId(id))

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
