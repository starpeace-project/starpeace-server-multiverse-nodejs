

module.exports = class Town
  constructor: () ->
    @id = null
    @name = null
    @sealId = null
    @buildingId = null
    @mapX = null
    @mapY = null

  toJson: () ->
    {
      id: @id
      name: @name
      sealId: @sealId
      buildingId: @buildingId
      mapX: @mapX
      mapY: @mapY
    }

  @fromJson: (json) ->
    town = new Town()
    town.id = json.id
    town.name = json.name
    town.sealId = json.sealId
    town.buildingId = json.buildingId
    town.mapX = json.mapX
    town.mapY = json.mapY
    town
