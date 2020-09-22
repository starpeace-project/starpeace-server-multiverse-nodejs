_ = require('lodash')
os = require('os')
path = require('path')
fs = require('fs-extra')

STARPEACE = require('@starpeace/starpeace-assets-types')

Building = require('../building/building')
BuildingStore = require('../store/building/building-store')

Town = require('../planet/town')
TownStore = require('../store/planet/town-store')

Logger = require('../utils/logger')
Utils = require('../utils/utils')


SEAL_TOWN_MAPPINGS = {
  'DIS':
    townhall: 'dis.townhall'
    tradecenter: 'dis.tradecenter'
  'MKO':
    townhall: 'mko.townhall'
    tradecenter: 'mko.tradecenter'
  'MOAB':
    townhall: 'moab.townhall'
    tradecenter: 'moab.tradecenter'
  'PGI':
    townhall: 'pgi.townhall'
    tradecenter: 'pgi.tradecenter'
}

createBuilding = (mapX, mapY, offsetX, offsetY, buildingDefinition) ->
  building = new Building(Utils.uuid(), 'IFEL', 'IFEL', 'IFEL')
  building.definitionId = buildingDefinition.id
  building.name = null
  building.mapX = mapX + offsetX
  building.mapY = mapY + offsetY
  building.stage = 0
  building.definition = buildingDefinition
  building.simulationDefinition = null
  building


module.exports = class SetupTowns
  constructor: (@seed) ->
    @seed = 0 unless @seed?


  planBuilding: (townhallPosition, townhallImage, buildingPosition, buildingImage) ->
    townhallDeltaX = townhallPosition == 1 || townhallPosition == 2
    townhallDeltaY = townhallPosition == 2 || townhallPosition == 3

    buildingDeltaX = buildingPosition == 1 || buildingPosition == 2
    buildingDeltaY = buildingPosition == 2 || buildingPosition == 3

    offsetX = 0
    offsetY = 0

    if townhallPosition == buildingPosition
      if @seed
        if townhallDeltaX
          offsetX += buildingImage.tileWidth
        else
          offsetX += -townhallImage.tileWidth
      else
        if townhallDeltaY
          offsetY += buildingImage.tileHeight
        else
          offsetY += -townhallImage.tileHeight

    else
      if townhallDeltaX && !buildingDeltaX
        offsetX += -1 # road
        offsetX += -townhallImage.tileWidth
      else if !townhallDeltaX && buildingDeltaX
        offsetX += 1 # road
        offsetX += buildingImage.tileWidth

      if townhallDeltaY && !buildingDeltaY
        offsetY += -1 # road
        offsetY += -townhallImage.tileHeight
      else if !townhallDeltaY && buildingDeltaY
        offsetY += 1 # road
        offsetY += buildingImage.tileHeight

    [offsetX, offsetY]


  planLayout: (townhallImage, tradecenterImage, portalImage) ->
    townhallPosition = Math.floor(Math.random() * 4)
    tradecenterPosition = Math.floor(Math.random() * 4)
    portalPosition = Math.floor(Math.random() * 3)
    portalPosition = portalPosition + (if portalPosition < tradecenterPosition then 0 else 1)

    {
      townhall: [0, 0]
      tradecenter: @planBuilding(townhallPosition, townhallImage, tradecenterPosition, tradecenterImage)
      portal: @planBuilding(townhallPosition, townhallImage, portalPosition, portalImage)
    }

  exportTowns: (configurations, planetId, mapId) ->
    buildingStore = new BuildingStore(false, planetId)
    townStore = new TownStore(false, planetId)
    towns = await townStore.all()

    unless towns?.length
      console.log "Configuring towns on planet #{planetId} with map #{mapId}"
      configPath = path.join(__dirname, "../../node_modules/@starpeace/starpeace-assets/assets/maps/#{mapId}.json")
      throw "Unable to find map #{mapId} configuration" unless fs.existsSync(configPath)

      portalBuilding = configurations.building.definitions['generic.portal']
      portalImage = configurations.building.images[portalBuilding.imageId] if portalBuilding?
      throw "Unable to find portal building or image" unless portalBuilding? && portalImage?

      config = JSON.parse(fs.readFileSync(configPath).toString())
      for townConfig in config.towns
        mapping = SEAL_TOWN_MAPPINGS[townConfig.sealId]
        throw "Unable to find town mapping for seal #{townConfig.sealId}" unless mapping?

        townhallBuilding = configurations.building.definitions[mapping.townhall]
        tradecenterBuilding = configurations.building.definitions[mapping.tradecenter]

        townhallImage = configurations.building.images[townhallBuilding.imageId]
        tradecenterImage = configurations.building.images[tradecenterBuilding.imageId]

        throw "Unable to find townhall building or image for seal #{town.sealId}" unless townhallBuilding? && townhallImage?
        throw "Unable to find tradecenter building or image for seal #{town.sealId}" unless tradecenterBuilding? && tradecenterImage?

        layout = @planLayout(townhallImage, tradecenterImage, portalImage)

        townX = 1000 - townConfig.mapY
        townY = 1000 - townConfig.mapX

        townhall = createBuilding(townX, townY, layout.townhall[0], layout.townhall[1], townhallBuilding)
        tradecenter = createBuilding(townX, townY, layout.tradecenter[0], layout.tradecenter[1], tradecenterBuilding)
        portal = createBuilding(townX, townY, layout.portal[0], layout.portal[1], portalBuilding)

        town = new Town
        town.id = Utils.uuid()
        town.name = townConfig.name
        town.sealId = townConfig.sealId
        town.buildingId = townhall.id
        town.mapX = townhall.mapX
        town.mapY = townhall.mapY

        townStore.set(town)
        console.log "Saved town #{town.name} to database"

        buildingStore.set(townhall)
        console.log "Saved townhall at (#{townhall.mapX}, #{townhall.mapY}) to database"
        buildingStore.set(tradecenter)
        console.log "Saved tradecenter at (#{tradecenter.mapX}, #{tradecenter.mapY}) to database"
        buildingStore.set(portal)
        console.log "Saved portal at (#{portal.mapX}, #{portal.mapY}) to database"

    await buildingStore.close()
    await townStore.close()
