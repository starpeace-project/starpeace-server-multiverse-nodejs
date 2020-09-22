
module.exports = class BuildingConnection
  constructor: (@id, @tycoonId, @corporationId, @companyId) ->
    @sourceBuildingId = 0
    @sourceCapacity = 0

    @sinkBuildingId = 0
    @sinkCapacity = 0

    @resourceId = null

    @velocity = 0
    @resourceQuality = 0

  @from_json: (json) ->
    metadata = new BuildingConnection(json.id, json.tycoonId, json.corporationId, json.companyId)
    metadata.definitionId = json.definitionId
    metadata.name = json.name
    metadata.mapX = json.mapX
    metadata.mapY = json.mapY
    metadata.stage = json.stage || 0
    metadata
