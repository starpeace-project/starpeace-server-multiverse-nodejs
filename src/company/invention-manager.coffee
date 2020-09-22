_ = require('lodash')

Invention = require('../company/invention')
InventionStore = require('../store/company/invention-store')

Utils = require('../utils/utils')

module.exports = class InventionManager
  constructor: (@modelEventClient, @galaxyManager) ->
    @stores = {}
    @stores[planet.id] = new InventionStore(true, planet.id) for planet in (@galaxyManager.metadata.planets || [])

  close: () ->
    Promise.all(_.map(_.values(@stores), (store) -> store.close()))

  forId: (planetId, companyId, inventionId) ->
    new Promise (resolve, reject) =>
      return reject('INVALID_PLANET') unless @stores[planetId]?
      @stores[planetId].forId(companyId, inventionId)
        .then resolve
        .catch reject

  forCompany: (planetId, companyId) ->
    new Promise (resolve, reject) =>
      return reject('INVALID_PLANET') unless @stores[planetId]?
      @stores[planetId].forCompanyId(companyId)
        .then resolve
        .catch reject

  startResearch: (planetId, companyId, inventionId) ->
    new Promise (resolve, reject) =>
      invention = new Invention()
      invention.id = inventionId
      invention.companyId = companyId
      invention.status = 'RESEARCHING'
      invention.progress = 0
      invention.investment = 0
      invention.rebate = 0
      invention.rebatePaid = 0
      invention.createdAt = new Date().getTime()

      @modelEventClient.startResearch(planetId, invention)
        .then resolve
        .catch reject

  sellResearch: (planetId, companyId, inventionId) ->
    new Promise (resolve, reject) =>
      @modelEventClient.sellResearch(planetId, companyId, inventionId)
        .then resolve
        .catch reject
