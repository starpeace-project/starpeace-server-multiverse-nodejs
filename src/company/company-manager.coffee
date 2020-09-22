_ = require('lodash')

Company = require('../company/company')
CompanyCache = require('../company/company-cache')
CompanyStore = require('../store/company/company-store')

Utils = require('../utils/utils')

module.exports = class CompanyManager
  constructor: (@modelEventClient, @galaxyManager) ->
    @stores = {}
    @stores[planet.id] = new CompanyStore(true, planet.id) for planet in (@galaxyManager.metadata.planets || [])

    @cache = new CompanyCache()
    @loadCache(planet.id) for planet in (@galaxyManager.metadata.planets || [])

  loadCache: (planetId) ->
    @stores[planetId].all()
      .then (companies) => @cache.update(planetId, companies)
      .catch (err) => setTimeout((=> @loadCache(planetId)), 500)
  updateCache: (planetId, companyId) ->
    @stores[planetId].get(companyId)
      .then (company) => @cache.update(planetId, company) if company?
      .catch (err) => setTimeout((=> @updateCache(planetId, companyId)), 500)


  close: () ->
    Promise.all(_.map(_.values(@stores), (store) -> store.close()))

  forId: (companyId) ->
    new Promise (resolve, reject) => resolve(@cache.forId(companyId))
  forPlanet: (planetId) ->
    new Promise (resolve, reject) => resolve(@cache.forPlanetId(planetId))
  forCorporation: (corporationId) ->
    new Promise (resolve, reject) => resolve(@cache.forCorporationId(corporationId))

  create: (planetId, tycoonId, corporationId, sealId, name) ->
    company = new Company()
    company.id = Utils.uuid()
    company.planetId = planetId
    company.tycoonId = tycoonId
    company.corporationId = corporationId
    company.sealId = sealId
    company.name = name
    @modelEventClient.createCompany(company)
