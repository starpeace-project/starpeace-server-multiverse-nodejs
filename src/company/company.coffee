
module.exports = class Company
  constructor: (@id) ->

  toJsonApi: () ->
    {
      id: @id
      tycoonId: @tycoonId
      corporationId: @corporationId
      sealId: @sealId
      name: @name
    }

  toJson: () ->
    {
      id: @id
      planetId: @planetId
      tycoonId: @tycoonId
      corporationId: @corporationId
      sealId: @sealId
      name: @name
    }

  @fromJson: (json) ->
    company = new Company(json.id)
    company.planetId = json.planetId
    company.tycoonId = json.tycoonId
    company.corporationId = json.corporationId
    company.sealId = json.sealId
    company.name = json.name
    company
