Simulation = require('../engine/simulation')

ModelEventClient = require('../core/events/model-event-client')
SimulationEventPublisher = require('../core/events/simulation-event-publisher')


modelEventClient = new ModelEventClient()

eventPublisher = new SimulationEventPublisher(process.argv[3])
eventPublisher.start()

simulation = new Simulation(process.argv[2], eventPublisher)
simulation.start()

process.on('SIGINT', -> Promise.all([eventPublisher.stop(), simulation.stop()]))
