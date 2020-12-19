zmq = require('zeromq')

Tycoon = require('../../tycoon/tycoon')
Utils = require('../../utils/utils')

SUBSCRIBE_PORT = 19170

module.exports = class SimulationEventPublisher
  constructor: (@planetIndex) ->
    @publisherSocket = new zmq.Publisher()
    @bound = false

  start: () ->
    await @publisherSocket.bind("tcp://127.0.0.1:#{SUBSCRIBE_PORT + @planetIndex}")
    console.log("[Simulation Event Publisher] Started on port #{SUBSCRIBE_PORT + @planetIndex}")
    @bound = true

  stop: () ->
    console.log('[Simulation Event Publisher] Stopping...')
    @bound = false
    await @publisherSocket.close()
    console.log('[Simulation Event Publisher] Stopped')

  sendEvent: (planetId, day) ->
    await @publisherSocket.send(['SIMULATION', JSON.stringify({ planetId, payload: { planetTime: day.toISO() } })]) if @bound
