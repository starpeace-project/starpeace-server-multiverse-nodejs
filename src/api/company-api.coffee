_ = require('lodash')

module.exports = class CompanyApi
  constructor: (@galaxyManager, @buildingManager, @companyManager, @inventionManager, @planetManager) ->

  createCompany: () -> (req, res, next) =>
    return res.status(400).json({ code: 'INVALID_PLANET' }) unless req.params.planetId? && @galaxyManager.forPlanet(req.params.planetId)?
    return res.status(403) unless req.visa? && req.visa.planetId == req.params.planetId

    name = _.trim(req.body.name)
    return res.status(400).json({ code: 'INVALID_NAME' }) unless name?.length

    seal = @galaxyManager.metadataCoreForPlanet(req.params.planetId)?.sealForId(req.body.sealId)
    return res.status(400).json({ code: 'INVALID_SEAL' }) unless seal?.playable

    try
      companies = await @companyManager.forPlanet(req.params.planetId)
      return res.status(400).json({ code: 'TYCOON_LIMIT' }) if _.filter(companies, (company) -> company.tycoonId == req.user.id).length > 25
      return res.status(400).json({ code: 'NAME_CONFLICT' }) if _.find(companies, (company) -> company.name == name)?

      company = await @companyManager.create(req.params.planetId, req.user.id, req.visa.corporationId, seal.id, name)
      return res.status(500) unless company?

      res.json(company.toJsonApi([]))
    catch err
      console.error err
      res.status(500).json(err || {})

  getTownCompanies: () -> (req, res, next) =>
    return res.status(400) unless req.params.planetId? && req.params.townId?
    return res.status(404) unless @galaxyManager.forPlanet(req.params.planetId)?
    return res.status(403) unless req.visa? && req.visa.planetId == req.params.planetId
    try
      town = _.find(await @planetManager.listTowns(req.params.planetId), (t) -> t.id == req.params.townId)
      return res.status(404) unless town?

      companiesJson = []
      for id in _.uniq(_.map(await @buildingManager.forTown(town.id), 'companyId'))
        company = @companyManager.forId(id)
        continue unless company?
        companiesJson.push(company.toJsonApi([]))

      res.json(companiesJson)
    catch err
      console.error err
      res.status(500).json(err || {})


  getInventions: () -> (req, res, next) =>
    return res.status(400) unless req.params.companyId?

    try
      company = await @companyManager.forId(req.params.companyId)
      return res.status(404) unless company?
      return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == company.corporationId

      completedIds = []
      pendingInventions = []
      inventions = await @inventionManager.forCompany(company.planetId, company.id)
      for invention in _.orderBy(pendingInventions, ['createdAt'], ['asc'])
        if invention.status == 'DONE'
          completedIds.push invention.id
        else
          pendingInventions.push {
            id: invention.id
            order: pendingInventions.length
            progress: invention.progress
          }

      res.json({
        companyId: company.id
        pendingInventions: pendingInventions
        completedIds: completedIds
      })
    catch err
      console.error err
      res.status(500).json(err || {})

  researchInvention: () -> (req, res, next) =>
    return res.status(400) unless req.params.companyId?
    return res.status(400) unless req.params.inventionId?

    try
      company = await @companyManager.forId(req.params.companyId)
      return res.status(404) unless company?
      return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == company.corporationId

      inventionsById = _.keyBy(@galaxyManager.metadataInventionForPlanet(company.planetId)?.inventions, 'id')
      return res.status(404) unless inventionsById[req.params.inventionId]?

      existingInvention = await @inventionManager.forId(company.planetId, company.id, req.params.inventionId)
      return res.status(400).json({ code: 'INVENTION_CONFLICT' }) if existingInvention?

      Invention = await @inventionManager.startResearch(company.planetId, company.id, req.params.inventionId)
      res.json(Invention.toJson())
    catch err
      console.error err
      res.status(500).json(err || {})

  sellInvention: () -> (req, res, next) =>
    return res.status(400) unless req.params.companyId?
    return res.status(400) unless req.params.inventionId?

    try
      company = await @companyManager.forId(req.params.companyId)
      return res.status(404) unless company?
      return res.status(403) unless req.visa?.isTycoon() && req.visa.corporationId == company.corporationId

      invention = await @inventionManager.forId(company.planetId, company.id, req.params.inventionId)
      return res.status(404) unless invention?
      return res.status(400) unless invention.status == 'RESEARCHING' || invention.status == 'DONE'

      inventionId = await @inventionManager.sellResearch(company.planetId, company.id, req.params.inventionId)
      res.json({ inventionId })
    catch err
      console.error err
      res.status(500).json(err || {})
