GalaxyManager = require('../galaxy/galaxy-manager')
ModelEventServer = require('../core/events/model-event-server')
SimulationEventSubscriber = require('../core/events/simulation-event-subscriber')

galaxyManager = new GalaxyManager()

modelServer = new ModelEventServer(galaxyManager)
modelServer.start()

simulationSubscriber = new SimulationEventSubscriber(galaxyManager.metadata.planets.length)
simulationSubscriber.start()

process.on('SIGINT', -> Promise.all([modelServer.stop(), simulationSubscriber.stop()]))
