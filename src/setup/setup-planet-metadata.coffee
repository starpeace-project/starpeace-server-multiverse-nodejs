_ = require('lodash')
fs = require('fs-extra')

STARPEACE = require('@starpeace/starpeace-assets-types')


module.exports = class SetupPlanetMetadata
  constructor: () ->

  export: (configurations, planetId) ->
    fs.writeFileSync("./config/metadata.#{planetId}.building.json", JSON.stringify({
      definitions: _.map(_.values(configurations.building.definitions), (i) -> i.toJson())
      simulationDefinitions: _.map(_.values(configurations.building.simulations), (i) -> i.toJson())
    }))

    fs.writeFileSync("./config/metadata.#{planetId}.core.json", JSON.stringify({
      cityZones: _.map(configurations.industry.cityZones, (i) -> i.toJson())
      industryCategories: _.map(configurations.industry.industryCategories, (i) -> i.toJson())
      industryTypes: _.map(configurations.industry.industryTypes, (i) -> i.toJson())
      levels: _.map(configurations.industry.levels, (i) -> i.toJson())
      resourceTypes: _.map(configurations.industry.resourceTypes, (i) -> i.toJson())
      resourceUnits: _.map(configurations.industry.resourceUnits, (i) -> i.toJson())
      seals: _.map(configurations.seals, (i) -> i.toJson())
    }))

    fs.writeFileSync("./config/metadata.#{planetId}.invention.json", JSON.stringify({
      inventions: _.map(configurations.inventions, (i) -> i.toJson())
    }))
