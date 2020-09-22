_ = require('lodash')
cluster = require('cluster')
{ fork } = require("child_process")
os = require('os')
fs = require('fs')
path = require('path')

Logger = require('../utils/logger')
GalaxyManager = require('../galaxy/galaxy-manager')


PROCESSES = {
  simulations: {}
  model: null
  workers: {}
}

SHUTDOWN = false
EXIT = false


unless fs.existsSync('db')
  fs.mkdirSync('db', { recursive: true })

unless fs.existsSync('./config/server.config.json')
  console.log "unable to find server.config.json; try again after running setup"
  process.exit(1)

galaxyManager = new GalaxyManager()

shutdownPollingLoop = (exitCallback) ->
  if SHUTDOWN
    unless _.compact(_.values(PROCESSES.simulations)).length || PROCESSES.model? || _.compact(_.values(PROCESSES.workers)).length
      console.log 'all processes stopped, exitting'
      process.exit()
    else
      setTimeout(shutdownPollingLoop, 1000)

initializeSimulation = (planet, index) ->
  PROCESSES.simulations[planet.id] = fork(path.join(__dirname, '../process/process-simulation.js'), [planet.id, index])
  PROCESSES.simulations[planet.id].on('exit', (code) ->
    unless SHUTDOWN
      console.log "simulation engine for #{planet.id} exitted with status #{code}, will restart"
      PROCESSES.simulations[planet.id] = initializeSimulation(planet, index)
    else
      PROCESSES.simulations[planet.id] = null
  )

initializeModelServer = () ->
  PROCESSES.model = fork(path.join(__dirname, '../process/process-model-server.js'))
  PROCESSES.model.on('exit', (code) ->
    unless SHUTDOWN
      console.log "model server exitted with status #{code}, will restart"
      PROCESSES.model = initializeModelServer()
    else
      PROCESSES.model = null
  )

Logger.banner()
initializeSimulation(planet, index) for planet,index in galaxyManager.metadata.planets
initializeModelServer()

process.on('SIGINT', () ->
  unless SHUTDOWN
    console.log 'Shutting down server...'
    SHUTDOWN = true
    shutdownPollingLoop()
)

cpuCount = os.cpus().length
console.log "[Process Count] Total: #{cpuCount}"

planetCount = 1

console.log "[Process Count] Model Server: 1"
console.log "[Process Count] Planet Simulation: #{planetCount}"

workerCount = Math.max(1, cpuCount - 1 - galaxyManager.metadata.planets.length)
console.log "[Process Count] HTTP Worker: #{workerCount}\n"
for [0...workerCount]
  worker = cluster.fork()
  PROCESSES.workers[worker.id] = worker

cluster.on('exit', (worker) =>
  unless SHUTDOWN
    console.log "worker #{worker.id} stopped, will restart"
    PROCESSES.workers[worker.id] = cluster.fork()
  else
    PROCESSES.workers[worker.id] = null
)

process.stdin.resume()
