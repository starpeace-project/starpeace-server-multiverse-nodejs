_ = require('lodash')

module.exports = class TycoonApi
  constructor: (@galaxyManager, @companyManager, @corporationManager, @tycoonManager) ->

  getTycoon: () -> (req, res, next) =>
    return res.status(400) unless req.params.tycoonId?

    try
      tycoon = await @tycoonManager.forId(req.params.tycoonId)
      return res.status(404) unless tycoon?

      corporations = []
      for corporation in (await @corporationManager.forTycoon(tycoon.id))
        companies = await Promise.all(_.map(Array.from(corporation.companyIds), (companyId) => @companyManager.forId(companyId)))
        corporations.push corporation.toJsonApi(companies)

      res.json({
        id: tycoon.id
        username: tycoon.username
        name: tycoon.name
        corporations: corporations
      })
    catch err
      console.error err
      res.status(500).json(err || {})

  getSearch: () -> (req, res, next) =>
    return res.status(400) unless req.params.planetId? && @galaxyManager.forPlanet(req.params.planetId)?
    return res.status(403) unless req.visa? && req.visa.planetId == req.params.planetId

    query = _.trim(req.query.query).toLowerCase()
    return res.status(400) unless req.query.startsWithQuery && query.length >= 1 || query.length >= 3

    try
      matchedTycoons = _.filter(await @tycoonManager.all(), (c) =>
        if req.query.startsWithQuery
          return c.name.toLowerCase().startsWith(query)
        else
          return c.name.toLowerCase().includes(query)
      )

      searchJson = []
      for tycoon in matchedTycoons
        corporation = _.find(await @corporationManager.forTycoon(tycoon.id), (c) -> c.planetId == req.params.planetId)
        continue unless corporation?
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
