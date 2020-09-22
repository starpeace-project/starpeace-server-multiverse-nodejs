_ = require('lodash')

Bookmark = require('../corporation/bookmark')
BookmarkStore = require('../store/corporation/bookmark-store')

Utils = require('../utils/utils')

module.exports = class BookmarkManager
  constructor: (@modelEventClient, @galaxyManager) ->
    @stores = {}
    @stores[planet.id] = new BookmarkStore(true, planet.id) for planet in (@galaxyManager.metadata.planets || [])

  close: () ->
    Promise.all(_.map(_.values(@stores), (store) -> store.close()))

  forId: (planetId, bookmarkId) ->
    new Promise (resolve, reject) =>
      return reject('INVALID_PLANET') unless @stores[planetId]?
      @stores[planetId].forId(bookmarkId)
        .then resolve
        .catch reject

  forCorporation: (planetId, corporationId) ->
    new Promise (resolve, reject) =>
      return reject('INVALID_PLANET') unless @stores[planetId]?
      @stores[planetId].forCorporationId(corporationId)
        .then resolve
        .catch reject

  create: (planetId, corporationId, type, parentId, order, name, mapX, mapY, buildingId) ->
    new Promise (resolve, reject) =>
      return reject('INVALID_PLANET') unless @stores[planetId]?

      bookmark = new Bookmark()
      bookmark.id = Utils.uuid()
      bookmark.corporationId = corporationId
      bookmark.type = type
      bookmark.parentId = parentId
      bookmark.order = order
      bookmark.name = name
      bookmark.mapX = mapX
      bookmark.mapY = mapY
      bookmark.buildingId = buildingId

      @modelEventClient.saveBookmarks(planetId, [bookmark])
        .then (bookmarks) -> resolve(bookmarks[0])
        .catch reject

  save: (planetId, bookmarks) ->
    new Promise (resolve, reject) =>
      return reject('INVALID_PLANET') unless @stores[planetId]?
      @modelEventClient.saveBookmarks(planetId, bookmarks)
        .then resolve
        .catch reject
