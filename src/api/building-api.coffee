_ = require('lodash')

module.exports = class BuildingApi
  constructor: (@galaxyManager, @buildingManager, @companyManager, @planetManager) ->

  getBuildings: () -> (req, res, next) =>
    return res.status(400) unless req.params.planetId?
    return res.status(400) unless req.query.chunkX? && req.query.chunkY?
    return res.status(403) unless req.visa? && req.visa.planetId == req.params.planetId
    try
      return res.status(404) unless @galaxyManager.forPlanet(req.params.planetId)?
      buildings = await @buildingManager.forChunk(req.params.planetId, req.query.chunkX, req.query.chunkY)
      res.json(buildings)
    catch err
      console.error err
      res.status(500).json(err || {})

  getBuilding: () -> (req, res, next) =>
    return res.status(400) unless req.params.buildingId?
    try
      building = await @buildingManager.forId(req.params.buildingId)
      return res.status(404) unless building?
      res.json(building)
    catch err
      console.error err
      res.status(500).json(err || {})

  getCompanyBuildings: () -> (req, res, next) =>
    return res.status(400) unless req.params.companyId?
    try
      company = await @companyManager.forId(req.params.companyId)
      return res.status(404) unless company?
      buildings = await @buildingManager.forCompany(req.params.companyId)
      res.json(buildings)
    catch err
      console.error err
      res.status(500).json(err || {})

  getTownBuildings: () -> (req, res, next) =>
    return res.status(400) unless req.params.planetId? && req.params.townId?
    return res.status(404) unless @galaxyManager.forPlanet(req.params.planetId)?
    return res.status(403) unless req.visa? && req.visa.planetId == req.params.planetId
    try
      town = _.find(await @planetManager.listTowns(req.params.planetId), (t) -> t.id == req.params.townId)
      return res.status(404) unless town?
      buildings = await @buildingManager.forTown(town.id)
      res.json(buildings)
    catch err
      console.error err
      res.status(500).json(err || {})
