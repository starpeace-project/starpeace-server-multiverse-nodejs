moment = require('moment')

ModelEventClient = require('../core/events/model-event-client')

module.exports = class Simulation
  constructor: (@planetId, @eventPublisher) ->
    @simulationRunning = false

    @day = moment('2200-01-01')

  currentMs: () ->
    hrTime = process.hrtime()
    hrTime[0] * 1000000 + hrTime[1] / 1000

  start: () ->
    @simulationRunning = true

    @mainLoop()

  stop: () ->
    console.log '[Simulation] Stopping engine...'
    @simulationRunning = false

  mainLoop: () ->
    startMs = @currentMs()

    @day = @day.add(1, 'hours')
    endMs = @currentMs()

    durationMs = Math.round(endMs - startMs)
    toWait = if durationMs > 1000 then 0 else (1000 - durationMs)
    #console.log "last tick took #{durationMs}, will wait #{toWait} milliseconds..."

    @eventPublisher.sendEvent(@planetId, @day)

    if @simulationRunning
      setTimeout((=> @mainLoop()), toWait)
    else
      console.log "[Simulation] Engine stopped"
