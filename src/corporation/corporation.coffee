_ = require('lodash')

module.exports = class Corporation
  constructor: (@id) ->
    @buildingCount = 0
    @companyIds = new Set()

  toJsonApi: (companies) ->
    {
      id: @id
      tycoonId: @tycoonId
      planetId: @planetId
      name: @name
      levelId: @levelId
      buildingCount: @buildingCount
      companies: _.map(companies, (company) -> company.toJsonApi())
    }

  toJson: () ->
    {
      id: @id
      tycoonId: @tycoonId
      planetId: @planetId
      name: @name
      levelId: @levelId
      buildingCount: @buildingCount
      companyIds: Array.from(@companyIds)
    }

  @fromJson: (json) ->
    corporation = new Corporation(json.id)
    corporation.tycoonId = json.tycoonId
    corporation.planetId = json.planetId
    corporation.name = json.name
    corporation.levelId = json.levelId
    corporation.buildingCount = if json.buildingCount? then parseInt(json.buildingCount) else 0
    corporation.companyIds = new Set(if Array.isArray(json.companyIds) then json.companyIds else [])
    corporation
