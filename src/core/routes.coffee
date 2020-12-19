passport = require('passport')

BuildingApi = require('../api/building-api')
CompanyApi = require('../api/company-api')
CorporationApi = require('../api/corporation-api')
GalaxyApi = require('../api/galaxy-api')
MetadataApi = require('../api/metadata-api')
PlanetApi = require('../api/planet-api')
TycoonApi = require('../api/tycoon-api')

authenticate = (req, res, next) ->
  passport.authenticate('jwt', { session: false }, (err, user, info) ->
    return next() if err || !user
    req.logIn(user, { session: false }, (err) ->
      return next(err) if err
      next()
    )
  )(req, res, next)

module.exports = (app, galaxyManager, simulationStates, bookmarkManager, buildingManager, companyManager, corporationManager, inventionManager, mailManager, planetManager, rankingManager, tycoonManager) ->
  buildingApi = new BuildingApi(galaxyManager, buildingManager, companyManager, planetManager)
  companyApi = new CompanyApi(galaxyManager, buildingManager, companyManager, inventionManager, planetManager)
  corporationApi = new CorporationApi(galaxyManager, bookmarkManager, companyManager, corporationManager, mailManager, tycoonManager)
  galaxyApi = new GalaxyApi(galaxyManager, companyManager, corporationManager, tycoonManager)
  metadataApi = new MetadataApi(galaxyManager)
  planetApi = new PlanetApi(galaxyManager, simulationStates, corporationManager, planetManager, rankingManager, tycoonManager)
  tycoonApi = new TycoonApi(galaxyManager, companyManager, corporationManager, tycoonManager)

  app.get('/galaxy/metadata', authenticate, galaxyApi.getMetadata())
  app.post('/galaxy/create', galaxyApi.create())
  app.post('/galaxy/login', galaxyApi.login())
  app.post('/galaxy/logout', authenticate, galaxyApi.logout())

  app.post('/planets/:planetId/visa', authenticate, planetApi.registerVisa())

  app.get('/planets/:planetId/metadata/buildings', authenticate, planetApi.verifyVisa(false), metadataApi.getBuildings())
  app.get('/planets/:planetId/metadata/core', authenticate, planetApi.verifyVisa(false), metadataApi.getCore())
  app.get('/planets/:planetId/metadata/inventions', authenticate, planetApi.verifyVisa(false), metadataApi.getInventions())

  app.get('/planets/:planetId/buildings', authenticate, planetApi.verifyVisa(false), buildingApi.getBuildings())
  app.get('/planets/:planetId/corporations', authenticate, planetApi.verifyVisa(false), corporationApi.getPlanetCorporations())
  app.post('/planets/:planetId/corporations', authenticate, planetApi.verifyVisa(true), corporationApi.createCorporation())
  app.post('/planets/:planetId/companies', authenticate, planetApi.verifyVisa(true), companyApi.createCompany())
  app.get('/planets/:planetId/events', authenticate, planetApi.verifyVisa(false), planetApi.getEvents())
  app.get('/planets/:planetId/online', authenticate, planetApi.verifyVisa(false), planetApi.getOnline())
  app.get('/planets/:planetId/rankings/:rankingTypeId', authenticate, planetApi.verifyVisa(false), planetApi.getRankings())
  app.get('/planets/:planetId/search/corporations', authenticate, planetApi.verifyVisa(false), corporationApi.getSearch())
  app.get('/planets/:planetId/search/tycoons', authenticate, planetApi.verifyVisa(false), tycoonApi.getSearch())
  app.get('/planets/:planetId/towns', authenticate, planetApi.verifyVisa(false), planetApi.getTowns())
  app.get('/planets/:planetId/towns/:townId/buildings', authenticate, planetApi.verifyVisa(false), buildingApi.getTownBuildings())
  app.get('/planets/:planetId/towns/:townId/companies', authenticate, planetApi.verifyVisa(false), companyApi.getTownCompanies())

  app.get('/buildings/:buildingId', authenticate, planetApi.verifyVisa(false), buildingApi.getBuilding())

  app.get('/tycoons/:tycoonId', authenticate, planetApi.verifyVisa(false), tycoonApi.getTycoon())

  app.get('/corporations/:corporationId', authenticate, planetApi.verifyVisa(false), corporationApi.getCorporation())
  app.get('/corporations/:corporationId/bookmarks', authenticate, planetApi.verifyVisa(true), corporationApi.getBookmarks())
  app.post('/corporations/:corporationId/bookmarks', authenticate, planetApi.verifyVisa(true), corporationApi.createBookmark())
  app.patch('/corporations/:corporationId/bookmarks', authenticate, planetApi.verifyVisa(true), corporationApi.updateBookmarks())
  app.get('/corporations/:corporationId/cashflow', authenticate, planetApi.verifyVisa(true), corporationApi.getCashflow())
  app.get('/corporations/:corporationId/mail', authenticate, planetApi.verifyVisa(true), corporationApi.getMail())
  app.post('/corporations/:corporationId/mail', authenticate, planetApi.verifyVisa(true), corporationApi.sendMail())
  app.put('/corporations/:corporationId/mail/:mailId/mark-read', authenticate, planetApi.verifyVisa(true), corporationApi.markMailRead())
  app.delete('/corporations/:corporationId/mail/:mailId', authenticate, planetApi.verifyVisa(true), corporationApi.deleteMail())

  app.get('/companies/:companyId/buildings', authenticate, planetApi.verifyVisa(false), buildingApi.getCompanyBuildings())
  app.get('/companies/:companyId/inventions', authenticate, planetApi.verifyVisa(true), companyApi.getInventions())
  app.put('/companies/:companyId/inventions/:inventionId', authenticate, planetApi.verifyVisa(true), companyApi.researchInvention())
  app.delete('/companies/:companyId/inventions/:inventionId', authenticate, planetApi.verifyVisa(true), companyApi.sellInvention())
