express = require('express')
Cors = require('cors')
bodyParser = require('body-parser')
compression = require('compression')
logger = require('morgan')
passport = require('passport')

ModelEventClient = require('../core/events/model-event-client')

BuildingManager = require('../building/building-manager')

CompanyManager = require('../company/company-manager')
InventionManager = require('../company/invention-manager')

BookmarkManager = require('../corporation/bookmark-manager')
CorporationManager = require('../corporation/corporation-manager')
MailManager = require('../corporation/mail-manager')

GalaxyManager = require('../galaxy/galaxy-manager')
PlanetManager = require('../planet/planet-manager')
TycoonManager = require('../tycoon/tycoon-manager')


module.exports = class HttpServer
  @CORS_CONFIG: {
    origin: [/localhost\:11010/, 'https://client.starpeace.io']
    credentials: true
  }

  constructor: () ->
    @openConnections = {}

    @modelEventClient = new ModelEventClient()
    @galaxyManager = new GalaxyManager()

    @companyManager = new CompanyManager(@modelEventClient, @galaxyManager)
    @inventionManager = new InventionManager(@modelEventClient, @galaxyManager)

    @bookmarkManager = new BookmarkManager(@modelEventClient, @galaxyManager)
    @corporationManager = new CorporationManager(@modelEventClient, @galaxyManager)
    @mailManager = new MailManager(@galaxyManager)

    @buildingManager = new BuildingManager(@galaxyManager)
    @planetManager = new PlanetManager(@galaxyManager)
    @tycoonManager = new TycoonManager(@modelEventClient)

    require('./authentication')(@galaxyManager, @tycoonManager)

    @app = express()
    @app.use(Cors(HttpServer.CORS_CONFIG))
    @app.use(compression())
    @app.use(bodyParser.urlencoded({ extended: false }))
    @app.use(bodyParser.json())
    @app.use(logger('dev'))
    @app.use(passport.initialize())
    @app.options('*', Cors(HttpServer.CORS_CONFIG))

    require('./routes')(@app, @galaxyManager, @bookmarkManager, @buildingManager, @companyManager, @corporationManager, @inventionManager, @mailManager, @planetManager, @tycoonManager)


  start: () ->
    @modelEventClient.receiveNotifications(@buildingManager, @companyManager, @corporationManager, @tycoonManager)

    @server = @app.listen(19160, () -> console.log('[HTTP Worker] Started on port 19160'))
    @server.on('connection', (connection) =>
      key = "#{connection.remoteAddress}:#{connection.remotePort}"
      @openConnections[key] = connection
      connection.on('close', () =>
        delete @openConnections[key]
      )
    )
    @server.destroy = (callback) =>
      @server.close(callback)
      connection.destroy() for key,connection of @openConnections

  stop: () ->
    if @server
      console.log('[HTTP Worker] Stopping...')

      await @modelEventClient.stop()
      await @bookmarkManager.close()
      await @buildingManager.close()
      await @companyManager.close()
      await @corporationManager.close()
      await @inventionManager.close()
      await @mailManager.close()
      await @planetManager.close()
      await @tycoonManager.close()

      @server.destroy(() ->
        console.log('[HTTP Worker] Stopped')
        process.exit()
      )
      @server = null
    else
      console.log('[HTTP Worker] Already stopped')
      process.exit()
