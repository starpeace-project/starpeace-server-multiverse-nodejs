_ = require('lodash')
os = require('os')
path = require('path')
fs = require('fs-extra')
inquirer = require('inquirer')

STARPEACE = require('@starpeace/starpeace-assets-types')

Building = require('./building/building')

Town = require('./planet/town')

Logger = require('./utils/logger')
Utils = require('./utils/utils')
FileUtils = require('./utils/file-utils')

SetupPlanet = require('./setup/setup-planet')


determineAction = () ->
  action = await inquirer.prompt([
    {
      type: 'rawlist'
      name: 'action'
      message: 'What do you want to do?'
      choices: [
        'Add planet',
        'Remove planet',
        'Exit'
      ]
    }
  ])



Logger.banner()

# bmp_path = path.join(__dirname, '../node_modules/@starpeace/starpeace-assets/assets/maps/ancoeus.bmp')
# bmp_buffer = fs.readFileSync(bmp_path)
# console.log bmp_path

buildingsDir = path.join(__dirname, "../node_modules/@starpeace/starpeace-assets/assets/buildings")
industryDir = path.join(__dirname, "../node_modules/@starpeace/starpeace-assets/assets/industry")
inventionsDir = path.join(__dirname, "../node_modules/@starpeace/starpeace-assets/assets/inventions")
sealsDir = path.join(__dirname, "../node_modules/@starpeace/starpeace-assets/assets/seals")

configurations = {
  building:
    definitions: _.keyBy(_.map(FileUtils.parseToJson(buildingsDir, ['.json'], ['-simulation.json', '-image.json']), STARPEACE.building.BuildingDefinition.fromJson), 'id')
    simulations: _.keyBy(_.map(FileUtils.parseToJson(buildingsDir, ['-simulation.json'], []), STARPEACE.building.simulation.BuildingSimulationDefinitionParser.fromJson), 'id')
    images: _.keyBy(_.map(FileUtils.parseToJson(buildingsDir, ['-image.json'], []), STARPEACE.building.BuildingImageDefinition.fromJson), 'id')
  industry:
    cityZones: _.map(FileUtils.parseToJson(industryDir, ['city-zones.json'], []), STARPEACE.industry.CityZone.fromJson)
    industryCategories: _.map(FileUtils.parseToJson(industryDir, ['industry-categories.json'], []), STARPEACE.industry.IndustryCategory.fromJson)
    industryTypes: _.map(FileUtils.parseToJson(industryDir, ['industry-types.json'], []), STARPEACE.industry.IndustryType.fromJson)
    levels: _.map(FileUtils.parseToJson(industryDir, ['levels.json'], []), STARPEACE.industry.Level.fromJson)
    resourceTypes: _.map(FileUtils.parseToJson(industryDir, ['resource-types.json'], []), STARPEACE.industry.ResourceType.fromJson)
    resourceUnits: _.map(FileUtils.parseToJson(industryDir, ['resource-units.json'], []), STARPEACE.industry.ResourceUnit.fromJson)
  inventions: _.map(FileUtils.parseToJson(inventionsDir, ['.json'], []), STARPEACE.invention.InventionDefinition.fromJson)
  seals: _.map(FileUtils.parseToJson(sealsDir, ['.json'], []), STARPEACE.seal.CompanySeal.fromJson)
}

fs.mkdirSync('config', { recursive: true })

galaxyConfig = { planets: [] }
if fs.existsSync('./config/server.config.json')
  galaxyConfig = JSON.parse(fs.readFileSync('./config/server.config.json'))
  console.log "welcome back to starpeace-multiverse setup for #{galaxyConfig.name}!"
  console.log "please shut down mutliverse server before using setup"

else
  console.log "welcome to starpeace-multiverse setup!"


# determineAction()
for planet in galaxyConfig.planets
  new SetupPlanet().export(configurations, planet)

#fs.writeFileSync('./config/server.config.json', JSON.stringify(config))
