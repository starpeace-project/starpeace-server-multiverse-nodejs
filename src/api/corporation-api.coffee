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
      console.error err
      res.status(500).json(err || {})

  getPlanetCorporations: () -> (req, res, next) =>
    return res.status(400) unless req.params.planetId? && @galaxyManager.forPlanet(req.params.planetId)?
    return res.status(403) unless req.visa? && req.visa.planetId == req.params.planetId

    try
      corporationsJson = []
      for corporation in (await @corporationManager.forPlanet(req.params.planetId))
        companies = await Promise.all(_.map(Array.from(corporation.companyIds), (companyId) => @companyManager.forId(companyId)))
        corporationsJson.push corporation.toJsonApi(companies)

      res.json(corporationsJson)
    catch err
      console.error err
      res.status(500).json(err || {})

  getSearch: () -> (req, res, next) =>
    return res.status(400) unless req.params.planetId? && @galaxyManager.forPlanet(req.params.planetId)?
    return res.status(403) unless req.visa? && req.visa.planetId == req.params.planetId

    query = _.trim(req.query.query).toLowerCase()
    return res.status(400) unless req.query.startsWithQuery && query.length >= 1 || query.length >= 3

    try
      matchedCorporations = _.filter(await @corporationManager.forPlanet(req.params.planetId), (c) =>
        if req.query.startsWithQuery
          return c.name.toLowerCase().startsWith(query)
        else
          return c.name.toLowerCase().includes(query)
      )

      searchJson = []
      for corporation in matchedCorporations
        tycoon = await @tycoonManager.forId(corporation.tycoonId)
        continue unless tycoon?
        searchJson.push {
          tycoonId: tycoon.id
          tycoonName: tycoon.name
          corporationId: corporation.id
          corporationName: corporation.name
        }

      res.json(searchJson)
    catch err
      console.error err
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
      console.error err
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
      console.error err
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
      console.error err
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
      console.error err
      res.status(500).json(err || {})


  getCashflow: () -> (req, res, next) =>
    return res.status(400) unless req.params.corporationId?
    return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == req.params.corporationId

    try
      corporation = await @corporationManager.forId(req.params.corporationId)
      return res.status(404) unless corporation?

      cashflow = {
        id: corporation.id
        lastMailAt: if corporation.lastMailAt? then corporation.lastMailAt.toISO() else null
        cash: 0
        cashflow: 0
        companies: _.map(Array.from(corporation.companyIds), (companyId) -> {
          id: companyId
          cashflow: 0
        })
      }

      res.json(cashflow)
    catch err
      console.error err
      res.status(500).json(err || {})


  getMail: () -> (req, res, next) =>
    return res.status(400) unless req.params.corporationId?
    return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == req.params.corporationId

    try
      corporation = await @corporationManager.forId(req.params.corporationId)
      return res.status(404) unless corporation?
      res.json(_.map(await @mailManager.forCorporation(corporation.planetId, corporation.id), (m) -> m.toJson()))
    catch err
      console.error err
      res.status(500).json(err || {})

  sendMail: () -> (req, res, next) =>
    return res.status(400) unless req.params.corporationId?
    return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == req.params.corporationId

    subject = _.trim(req.body.subject)
    body = _.trim(req.body.body)
    return res.status(400) unless subject.length && body.length

    try
      sourceCorporation = await @corporationManager.forId(req.params.corporationId)
      return res.status(404) unless sourceCorporation?
      sourceTycoon = await @tycoonManager.forId(sourceCorporation.tycoonId)

      targetTycoons = []
      tycoonCorporations = {}
      undeliverableNames = []

      for tycoonName in _.uniq(_.map(_.trim(req.body.to).split(';'), (name) -> _.toLower(_.trim(name))))
        tycoon = _.find(await @tycoonManager.all(), (t) -> t.name.toLowerCase() == tycoonName)
        corporation = if tycoon? then _.find(await @corporationManager.forTycoon(tycoon.id), (c) -> c.planetId == sourceCorporation.planetId) else null

        if tycoon? && corporation?
          targetTycoons.push tycoon
          tycoonCorporations[tycoon.id] = corporation
        else
          undeliverableNames.push tycoonName
      return res.status(400) unless targetTycoons.length || undeliverableNames.length

      if targetTycoons.length
        await Promise.all(_.map(targetTycoons, (tycoon) => @mailManager.send(tycoonCorporations[tycoon.id], sourceTycoon, targetTycoons, subject, body)))

      if undeliverableNames.length
        await @mailManager.send(sourceCorporation, { id: 'ifel', name: 'IFEL' }, [sourceTycoon], "Mail Undeliverable: #{subject}", "Unable to deliver mail to #{undeliverableNames.join(', ')}")

      res.json({})
    catch err
      console.error err
      res.status(500).json(err || {})

  markMailRead: () -> (req, res, next) =>
    return res.status(400) unless req.params.corporationId? && req.params.mailId?
    return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == req.params.corporationId

    try
      corporation = await @corporationManager.forId(req.params.corporationId)
      return res.status(404) unless corporation?

      mailId = await @mailManager.markRead(corporation.planetId, req.params.mailId)
      return res.status(400) unless mailId == req.params.mailId
      res.json({})
    catch err
      console.error err
      res.status(500).json(err || {})

  deleteMail: () -> (req, res, next) =>
    return res.status(400) unless req.params.corporationId? && req.params.mailId?
    return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == req.params.corporationId

    try
      corporation = await @corporationManager.forId(req.params.corporationId)
      return res.status(404) unless corporation?

      mailId = await @mailManager.delete(corporation.planetId, req.params.mailId)
      return res.status(400) unless mailId == req.params.mailId
      res.json({})
    catch err
      console.error err
      res.status(500).json(err || {})
