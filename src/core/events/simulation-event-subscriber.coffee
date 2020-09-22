zmq = require('zeromq')

Utils = require('../../utils/utils')

SUBSCRIBE_PORT = 19170

module.exports = class SimulationEventSubscriber
  constructor: (@planetCount) ->
    @subscriberSockets = []
    @subscriberSockets.push(new zmq.Subscriber()) for index in [0...@planetCount]

  start: () ->
    @receiveEvents(index) for index in [0...@planetCount]

  stop: () ->
    console.log('[Simulation Event Subscriber] Stopping...')
    await subscriberSocket.close() for subscriberSocket in @subscriberSockets
    console.log('[Simulation Event Subscriber] Stopped')

  receiveEvents: (planetIndex) ->
    @subscriberSockets[planetIndex].connect("tcp://127.0.0.1:#{SUBSCRIBE_PORT + planetIndex}")
    @subscriberSockets[planetIndex].subscribe('SIMULATION')

    console.log "[Simulation Event Subscriber] Started on port #{SUBSCRIBE_PORT + planetIndex}"
    for await [topic, message] from @subscriberSockets[planetIndex]
      topic = topic.toString()
      console.log "received event #{message} on #{topic}"
