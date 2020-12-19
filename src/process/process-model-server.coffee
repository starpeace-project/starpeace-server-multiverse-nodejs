_ = require('lodash')

GalaxyManager = require('../galaxy/galaxy-manager')
ModelEventServer = require('../core/events/model-event-server')
SimulationEventSubscriber = require('../core/events/simulation-event-subscriber')

SimulationState = require('../engine/simulation-state')
SimulationStateStore = require('../store/planet/simulation-state-store')
RankingStore = require('../store/corporation/ranking-store')


galaxyManager = new GalaxyManager()

rankingStores = {}
simulationStores = {}

simulationStates = {}

for planet in galaxyManager.metadata.planets
  rankingStores[planet.id] = new RankingStore(false, planet.id)
  simulationStores[planet.id] = new SimulationStateStore(false, planet.id)
  simulationStates[planet.id] = new SimulationState()

modelServer = new ModelEventServer(galaxyManager)
simulationSubscriber = new SimulationEventSubscriber(galaxyManager.metadata.planets.length, simulationStores, simulationStates)

process.on('SIGINT', ->
  Promise.all(
    [modelServer.stop(), simulationSubscriber.stop()]
      .concat(_.map(_.values(rankingStores), (s) -> s.close()))
      .concat(_.map(_.values(simulationStores), (s) -> s.close()))
  )
)


loadData = () ->
  for planet in galaxyManager.metadata.planets
    simulationStates[planet.id] = await simulationStores[planet.id].getPlanetDate()

loadData()
  .then () =>
    modelServer.start()
    simulationSubscriber.start()

  .catch () =>
    process.exit(1)
