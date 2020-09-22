_ = require('lodash')
bcrypt = require('bcrypt')

Tycoon = require('../tycoon/tycoon')
Visa = require('../tycoon/visa')

TycoonStore = require('../store/tycoon-store')
VisaStore = require('../store/session/visa-store')

Utils = require('../utils/utils')

module.exports = class TycoonManager
  constructor: (@modelClient) ->
    @store = new TycoonStore(true)
    @visaStore = new VisaStore(true)

  close: () ->
    Promise.all([@store.close(), @visaStore.close()])

  updateCache: (tycoonId) ->
    console.log 'update tycoon cache'

  create: (username, password) ->
    new Promise (resolve, reject) =>
      @forUsername(username)
        .then (user) =>
          if user?
            reject('USERNAME_CONFLICT')
          else
            bcrypt.hash(password, 10, (err, hash) =>
              tycoon = new Tycoon()
              tycoon.id = Utils.uuid()
              tycoon.username = username
              tycoon.name = username
              tycoon.passwordHash = hash

              @modelClient.createTycoon(tycoon)
                .then resolve
                .catch reject
            )
        .catch reject

  forId: (id) -> @store.get(id)
  forUsername: (username) -> @store.forUsername(username)

  forUsernamePassword: (username, password) ->
    new Promise (resolve, reject) =>
      @forUsername(username)
        .then (user) =>
          unless user?
            resolve(null)
          else
            bcrypt.compare(password, user.passwordHash || '')
              .then (res) -> resolve(if res then user else null)
              .catch reject
        .catch reject


  issueToken: (tycoon) -> @modelClient.issueToken(tycoon)
  loginToken: (token) -> @modelClient.consumeToken(token)

  onlineVisas: (planetId) -> @visaStore.forPlanetId(planetId)

  getVisa: (visaId) -> @visaStore.get(visaId)
  destroyVisa: (visaId) -> @modelClient.destroyVisa(visaId)
  registerVisa: (visaType, tycoonId, planetId, corporationId) ->
    visa = new Visa()
    visa.id = Utils.randomString(64)
    visa.type = visaType
    visa.tycoonId = tycoonId
    visa.planetId = planetId
    visa.corporationId = corporationId
    @modelClient.saveVisa(visa)
  updateVisa: (visa) -> @modelClient.saveVisa(visa)
