_ = require('lodash')

MailStore = require('../store/corporation/mail-store')
Utils = require('../utils/utils')

module.exports = class MailManager
  constructor: (@galaxyManager) ->
    @stores = {}
    @stores[planet.id] = new MailStore(true, planet.id) for planet in (@galaxyManager.metadata.planets || [])

  close: () ->
    Promise.all(_.map(_.values(@stores), (store) -> store.close()))

  forId: (planetId, mailId) ->
    new Promise (resolve, reject) =>
      return reject('INVALID_PLANET') unless @stores[planetId]?
      @stores[planetId].forId(mailId)
        .then resolve
        .catch reject

  forCorporation: (planetId, corporationId) ->
    new Promise (resolve, reject) =>
      return reject('INVALID_PLANET') unless @stores[planetId]?
      @stores[planetId].forCorporationId(corporationId)
        .then resolve
        .catch reject
