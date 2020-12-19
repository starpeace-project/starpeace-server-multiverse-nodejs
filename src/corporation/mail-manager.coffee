_ = require('lodash')
{ DateTime } = require('luxon')

Mail = require('../corporation/mail')
MailEntity = require('../corporation/mail-entity')
MailStore = require('../store/corporation/mail-store')

Utils = require('../utils/utils')

module.exports = class MailManager
  constructor: (@modelEventClient, @galaxyManager, @simulationStates) ->
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

  send: (targetCorporation, sourceTycoon, targetTycoons, subject, body) ->
    mail = new Mail()
    mail.id = Utils.uuid()
    mail.corporationId = targetCorporation.id
    mail.read = false
    mail.sentAt = DateTime.utc()
    mail.planetSentAt = @simulationStates[targetCorporation.planetId].planetTime
    mail.from = new MailEntity()
    mail.from.id = sourceTycoon.id
    mail.from.name = sourceTycoon.name
    mail.to = _.map(targetTycoons, (tycoon) ->
      entity = new MailEntity()
      entity.id = tycoon.id
      entity.name = tycoon.name
      entity
    )
    mail.subject = subject
    mail.body = body
    @modelEventClient.sendMail(targetCorporation.planetId, mail)

  markRead: (planetId, mailId) ->
    @modelEventClient.markReadMail(planetId, mailId)

  delete: (planetId, mailId) ->
    @modelEventClient.deleteMail(planetId, mailId)
