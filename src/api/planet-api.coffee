_ = require('lodash')

module.exports = class PlanetApi
  constructor: (@galaxyManager, @corporationManager, @planetManager, @tycoonManager) ->

  registerVisa: () -> (req, res, next) =>
    isVisitor = req.body.identityType == 'visitor'
    isTycoon = req.body.identityType == 'tycoon'

    return res.status(400) unless isVisitor || isTycoon
    return res.status(400) if isVisitor && !@galaxyManager.metadata.visitorEnabled
    return res.status(400) if isTycoon && !@galaxyManager.metadata.tycoonEnabled
    return res.status(401) if isTycoon && !req.isAuthenticated()
    return res.status(400) unless req.params.planetId? && @galaxyManager.forPlanet(req.params.planetId)?

    try
      tycoonId = if isTycoon then req.user.id else 'random-visitor'
      corporations = if isTycoon then await @corporationManager.forTycoon(tycoonId) else []
      corporationId = if isTycoon then _.find(corporations, (corporation) -> corporation.planetId == req.params.planetId)?.id else null

      visa = await @tycoonManager.registerVisa(req.body.identityType, tycoonId, req.params.planetId, corporationId)
      return res.status(500) unless visa?
      res.json(visa.toJsonApi())
    catch err
      console.log err
      res.status(500).json(err || {})

  verifyVisa: (requireTycoon) -> (req, res, next) =>
    vid = req.header('VisaId')
    return res.status(401).json({message: 'missing visa token'}) unless vid
    @tycoonManager.getVisa(vid)
      .then (visa) ->
        return res.status(401).json({message: 'unable to find visa'}) unless visa

        if requireTycoon
          return res.status(403).json({message: 'invalid visa for operation'}) if visa.type != 'tycoon'
          return res.status(403).json({message: 'invalid visa for tycoon'}) if !req.isAuthenticated() || visa.tycoonId != req.user.id

        req.visa = visa
        next()
      .catch (err) ->
        console.log err
        res.status(500).json(err || {})

  getEvents: () -> (req, res, next) =>
    return res.status(400) unless req.params.planetId?
    return res.status(404) unless @galaxyManager.forPlanet(req.params.planetId)?
    return res.status(403) unless req.visa? && req.visa.planetId == req.params.planetId

    # FIXME: TODO: hookup event state
    # 'winter', 'spring', 'summer', 'fall'
    res.json({
      planetId: req.params.planetId
      date: '2235-01-01'
      season: 'winter'
      buildingEvents: []
      tycoonEvents: []
    })

  getOnline: () -> (req, res, next) =>
    return res.status(400) unless req.params.planetId?
    return res.status(404) unless @galaxyManager.forPlanet(req.params.planetId)?
    return res.status(403) unless req.visa? && req.visa.planetId == req.params.planetId

    try
      online = []
      for visa in (await @tycoonManager.onlineVisas(req.params.planetId))
        tycoon = if visa.isTycoon() then (await @tycoonManager.forId(visa.tycoonId)) else null
        corporation = if tycoon? && visa.corporationId? then (await @corporationManager.forId(visa.corporationId)) else null
        item = {
          type: visa.type
        }
        item.tycoonId = tycoon.id if tycoon?
        item.tycoonName = tycoon.name if tycoon?
        item.corporationId = corporation.id if corporation?
        item.corporationName = corporation.name if corporation?
        online.push item

      res.json(online)
    catch err
      console.log err
      res.status(500).json(err || {})

  getTowns: () -> (req, res, next) =>
    return res.status(400) unless req.params.planetId?
    return res.status(404) unless @galaxyManager.forPlanet(req.params.planetId)?
    return res.status(403) unless req.visa? && req.visa.planetId == req.params.planetId

    try
      towns = await @planetManager.listTowns(req.params.planetId)
      res.json(towns)
    catch err
      console.log err
      res.status(500).json(err || {})
