Simulation = require('../engine/simulation')

ModelEventClient = require('../core/events/model-event-client')
SimulationEventPublisher = require('../core/events/simulation-event-publisher')

SimulationState = require('../engine/simulation-state')
SimulationStateStore = require('../store/planet/simulation-state-store')


modelEventClient = new ModelEventClient()

planetIndex = parseInt(process.argv[3])
planetId = process.argv[2]

stateStore = new SimulationStateStore(true, planetId)
simulationState = new SimulationState()

eventPublisher = new SimulationEventPublisher(planetIndex)
simulation = new Simulation(planetId, eventPublisher, simulationState)

process.on('SIGINT', -> Promise.all([modelEventClient.stop(), stateStore.close(), eventPublisher.stop(), simulation.stop()]))


loadData = () ->
  simulationState.planetTime = await stateStore.getPlanetDate()

loadData()
  .then () =>
    eventPublisher.start()
    simulation.start()

  .catch (err) =>
    console.error(err)
    process.exit(1)
