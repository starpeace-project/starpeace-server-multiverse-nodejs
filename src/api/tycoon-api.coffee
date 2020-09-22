_ = require('lodash')

module.exports = class TycoonApi
  constructor: (@companyManager, @corporationManager, @tycoonManager) ->

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
      console.log err
      res.status(500).json(err || {})
