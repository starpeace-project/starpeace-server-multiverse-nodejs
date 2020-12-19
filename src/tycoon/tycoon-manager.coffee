_ = require('lodash')
bcrypt = require('bcrypt')

Tycoon = require('../tycoon/tycoon')
TycoonCache = require('../tycoon/tycoon-cache')
TycoonStore = require('../store/tycoon-store')
Visa = require('../tycoon/visa')
VisaStore = require('../store/session/visa-store')

Utils = require('../utils/utils')

module.exports = class TycoonManager
  constructor: (@modelClient) ->
    @store = new TycoonStore(true)
    @visaStore = new VisaStore(true)

    @cache = new TycoonCache()
    @loadCache()

  loadCache: () ->
    @store.all()
      .then (tycoons) => @cache.update(tycoons)
      .catch (err) => setTimeout((=> @loadCache()), 500)
  updateCache: (tycoonId) ->
    @store.get(tycoonId)
      .then (tycoon) => @cache.update(tycoon) if tycoon?
      .catch (err) => setTimeout((=> @updateCache(tycoonId)), 500)

  close: () ->
    Promise.all([@store.close(), @visaStore.close()])

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

  all: () ->
    new Promise (resolve, reject) => resolve(@cache.all())
  forId: (tycoonId) ->
    new Promise (resolve, reject) => resolve(@cache.forId(tycoonId))
  forUsername: (username) ->
    new Promise (resolve, reject) => resolve(@cache.forUsername(username))

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
