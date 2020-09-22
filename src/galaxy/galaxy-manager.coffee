fs = require('fs')
_ = require('lodash')

CoreMetadata = require('../metadata/core-metadata')

module.exports = class GalaxyManager
  constructor: () ->
    @metadata = JSON.parse(fs.readFileSync('./config/server.config.json'))
    @metadataByPlanet = _.keyBy(@metadata.planets, 'id')

    @planetMetadata = {}
    for planet in (@metadata.planets || [])
      unless fs.existsSync("./config/metadata.#{planet.id}.building.json")
        console.log "unable to find planet metadata.#{planet.id}.building.json; try again after running setup"
        continue
      unless fs.existsSync("./config/metadata.#{planet.id}.invention.json")
        console.log "unable to find planet metadata.#{planet.id}.invention.json; try again after running setup"
        continue
      unless fs.existsSync("./config/metadata.#{planet.id}.core.json")
        console.log "unable to find planet metadata.#{planet.id}.core.json; try again after running setup"
        continue

      @planetMetadata[planet.id] = {
        building: JSON.parse(fs.readFileSync("./config/metadata.#{planet.id}.building.json"))
        core: CoreMetadata.fromJson(JSON.parse(fs.readFileSync("./config/metadata.#{planet.id}.core.json")))
        invention: JSON.parse(fs.readFileSync("./config/metadata.#{planet.id}.invention.json"))
      }


  getSecret: () -> @metadata.secretHash

  forPlanet: (planetId) -> @metadataByPlanet[planetId]

  metadataBuildingForPlanet: (planetId) -> @planetMetadata[planetId]?.building
  metadataCoreForPlanet: (planetId) -> @planetMetadata[planetId]?.core
  metadataInventionForPlanet: (planetId) -> @planetMetadata[planetId]?.invention
