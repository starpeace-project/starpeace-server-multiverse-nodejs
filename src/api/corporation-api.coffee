_ = require('lodash')
passport = require('passport')

module.exports = class CorporationApi
  constructor: (@galaxyManager, @bookmarkManager, @companyManager, @corporationManager, @mailManager, @tycoonManager) ->

  getCorporation: () -> (req, res, next) =>
    return res.status(400) unless req.params.corporationId?

    try
      corporation = await @corporationManager.forId(req.params.corporationId)
      return res.status(404) unless corporation?

      companies = await Promise.all(_.map(Array.from(corporation.companyIds), (companyId) => @companyManager.forId(companyId)))
      res.json(corporation.toJsonApi(companies))
    catch err
      console.log err
      res.status(500).json(err || {})

  getPlanetCorporations: () -> (req, res, next) =>
    return res.status(400) unless req.params.planetId? && @galaxyManager.forPlanet(req.params.planetId)?
    return res.status(403) unless req.visa? && req.visa.planetId == req.params.planetId

    try
      corporations = []
      for corporation in (await @corporationManager.forPlanet(req.params.planetId))
        companies = await Promise.all(_.map(Array.from(corporation.companyIds), (companyId) => @companyManager.forId(companyId)))
        corporations.push corporation.toJsonApi(companies)

      res.json(corporations)
    catch err
      console.log err
      res.status(500).json(err || {})

  createCorporation: () -> (req, res, next) =>
    return res.status(400).json({ code: 'INVALID_PLANET' }) unless req.params.planetId? && @galaxyManager.forPlanet(req.params.planetId)?
    return res.status(403) unless req.visa? && req.visa.planetId == req.params.planetId

    name = _.trim(req.body.name)
    return res.status(400).json({ code: 'INVALID_NAME' }) unless name?.length

    try
      corporations = await @corporationManager.forPlanet(req.params.planetId)
      return res.status(400).json({ code: 'TYCOON_LIMIT' }) if _.find(corporations, (corporation) -> corporation.tycoonId == req.user.id)?
      return res.status(400).json({ code: 'NAME_CONFLICT' }) if _.find(corporations, (corporation) -> corporation.name == name)?

      level = @galaxyManager.metadataCoreForPlanet(req.params.planetId)?.lowestLevel()
      return res.status(500) unless level?

      corporation = await @corporationManager.create(req.params.planetId, req.user.id, level.id, name)
      return res.status(500) unless corporation?

      req.visa.corporationId = corporation.id
      await @tycoonManager.updateVisa(req.visa)

      res.json(corporation.toJsonApi([]))
    catch err
      console.log err
      res.status(500).json(err || {})


  getBookmarks: () -> (req, res, next) =>
    return res.status(400) unless req.params.corporationId?
    return res.status(401) unless req.isAuthenticated()
    return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == req.params.corporationId

    try
      corporation = await @corporationManager.forId(req.params.corporationId)
      return res.status(404) unless corporation?

      bookmarks = await @bookmarkManager.forCorporation(corporation.planetId, corporation.id)
      res.json(bookmarks)
    catch err
      console.log err
      res.status(500).json(err || {})

  createBookmark: () -> (req, res, next) =>
    return res.status(400) unless req.params.corporationId?
    return res.status(400) unless req.body.type == 'FOLDER' || req.body.type == 'LOCATION' || req.body.type == 'BUILDING'
    return res.status(400) if (req.body.type == 'LOCATION' || req.body.type == 'BUILDING') && (!req.body.mapX? || !req.body.mapY?)
    return res.status(400) if req.body.type == 'BUILDING' && !req.body.buildingId?.length
    return res.status(400) unless req.body.parentId?.length && req.body.order?
    return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == req.params.corporationId

    try
      corporation = await @corporationManager.forId(req.params.corporationId)
      return res.status(404) unless corporation?

      bookmark = await @bookmarkManager.create(corporation.planetId, corporation.id, req.body.type, req.body.parentId, req.body.order, req.body.name, req.body.mapX, req.body.mapY, req.body.buildingId)
      res.json(bookmark)
    catch err
      console.log err
      res.status(500).json(err || {})

  updateBookmarks: () -> (req, res, next) =>
    return res.status(400) unless req.params.corporationId?
    return res.status(400) unless req.body.deltas?.length
    return res.status(401) unless req.isAuthenticated()
    return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == req.params.corporationId

    try
      corporation = await @corporationManager.forId(req.params.corporationId)
      return res.status(404) unless corporation?

      bookmarks = await @bookmarkManager.forCorporation(corporation.planetId, corporation.id)
      bookmarksById = _.keyBy(bookmarks, 'id')

      toSave = []
      for delta in req.body.deltas
        continue unless delta.id? && bookmarksById[delta.id]
        bookmarksById[delta.id].parentId = delta.parentId if delta.parentId?
        bookmarksById[delta.id].order = delta.order if delta.order?
        bookmarksById[delta.id].name = delta.name if delta.name?
        bookmarksById[delta.id].mapX = delta.mapX if delta.mapX?
        bookmarksById[delta.id].mapY = delta.mapY if delta.mapY?
        bookmarksById[delta.id].buildingId = delta.buildingId if delta.buildingId?
        toSave.push bookmarksById[delta.id]

      return res.status(400) unless toSave.length
      savedBookmarks = await @bookmarkManager.save(corporation.planetId, toSave)
      res.json(savedBookmarks)
    catch err
      console.log err
      res.status(500).json(err || {})


  getCashflow: () -> (req, res, next) =>
    return res.status(400) unless req.params.corporationId?
    return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == req.params.corporationId

    try
      corporation = await @corporationManager.forId(req.params.corporationId)
      return res.status(404) unless corporation?

      cashflow = {
        id: corporation.id
        cash: 0
        cashflow: 0
        companies: _.map(Array.from(corporation.companyIds), (companyId) -> {
          id: companyId
          cashflow: 0
        })
      }

      res.json(cashflow)
    catch err
      console.log err
      res.status(500).json(err || {})


  getMail: () -> (req, res, next) =>
    return res.status(400) unless req.params.corporationId?
    return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == req.params.corporationId

    try
      corporation = await @corporationManager.forId(req.params.corporationId)
      return res.status(404) unless corporation?

      mail = await @mailManager.forCorporation(corporation.planetId, corporation.id)
      res.json(mail)
    catch err
      console.log err
      res.status(500).json(err || {})
