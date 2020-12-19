_ = require('lodash')
{ DateTime } = require('luxon')
os = require('os')
path = require('path')
fs = require('fs-extra')

STARPEACE = require('@starpeace/starpeace-assets-types')

SimulationState = require('../engine/simulation-state')
SimulationStateStore = require('../store/planet/simulation-state-store')

Logger = require('../utils/logger')
Utils = require('../utils/utils')


module.exports = class SetupSimulation
  constructor: () ->

  export: (configurations, planetId) ->
    stateStore = new SimulationStateStore(false, planetId)

    await stateStore.setPlanetDate(DateTime.fromISO('2200-01-01T00:00:00'))

    await stateStore.close()
