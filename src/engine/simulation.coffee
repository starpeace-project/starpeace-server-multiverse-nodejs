
ModelEventClient = require('../core/events/model-event-client')

module.exports = class Simulation
  constructor: (@planetId, @eventPublisher, @simulationState) ->
    @simulationRunning = false

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
    unless @simulationRunning
      console.log "[Simulation] Engine stopped"
      return

    unless @simulationState.planetTime?
      console.log 'Simulation not yet loaded'
      setTimeout((=> @mainLoop()), 1000)
      return

    startMs = @currentMs()

    @simulationState.planetTime = @simulationState.planetTime.plus({ hours: 1 })
    endMs = @currentMs()

    durationMs = Math.round(endMs - startMs)
    toWait = if durationMs > 1000 then 0 else (1000 - durationMs)
    #console.log "last tick took #{durationMs}, will wait #{toWait} milliseconds..."

    @eventPublisher.sendEvent(@planetId, @simulationState.planetTime)

    setTimeout((=> @mainLoop()), toWait)
