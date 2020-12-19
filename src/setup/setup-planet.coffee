STARPEACE = require('@starpeace/starpeace-assets-types')

SetupPlanetMetadata = require('../setup/setup-planet-metadata')
SetupSimulation = require('../setup/setup-simulation')
SetupTowns = require('../setup/setup-towns')

module.exports = class SetupPlanet
  constructor: () ->

    @metadata = new SetupPlanetMetadata()
    @simulation = new SetupSimulation()
    @towns = new SetupTowns(Math.floor(Math.random() * 2))


  export: (configurations, planet) ->
    @metadata.export(configurations, planet.id)

    @simulation.export(configurations, planet.id)
    @towns.export(configurations, planet.id, planet.mapId)
