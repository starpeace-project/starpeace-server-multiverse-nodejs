_ = require('lodash')

module.exports = class Building
  constructor: () ->
    @definitionId = null
    @townId = null
    @name = null
    @mapX = 0
    @mapY = 0
    @stage = -1

    @definition = null
    @simulationDefinition = null

    @pullInputs = []
    @pullOutputs = []

    @pushOutputs = []

  Object.defineProperties @prototype,
    chunkX:
      get: -> Math.floor(@mapX / 20)
    chunkY:
      get: -> Math.floor(@mapY / 20)
    chunkId:
      get: -> "#{@chunkX}x#{@chunkY}"

  pullInputs: () ->

    capacity = 0
    capacity = 0 if noMoney

    for connection in [] # inputs
      connection.sinkCapacity = capacity
      connection.velocity = Math.min(capacity, connection.sourceCapacity)

      if connection.velocity > 0
        # lower source storage
        # raise sink storage, with quality
        # raise source money
        # lower sink money
        capacity -= connection.velocity


  doAction: () ->
    sinkCapacity = 0
    for connection in [] # outputs
      sinkCapacity += connection.sinkCapacity

    freeSpace = 0
    maxVelocity = 0
    capacity = _.min(freeSpace, sinkCapacity, maxVelocity)

    for connection in [] # outputs
      connection.sourceCapacity = capacity
      connection.resourceQuality = 0

      velocity = Math.min(capacity, connection.sinkCapacity)
      if velocity > 0
        capacity -= velocity

  toJson: () ->
    {
      id: @id
      tycoonId: @tycoonId
      corporationId: @corporationId
      companyId: @companyId
      definitionId: @definitionId
      townId: @townId
      name: @name
      mapX: @mapX
      mapY: @mapY
      stage: @stage
    }

  @fromJson: (json) ->
    metadata = new Building()
    metadata.id = json.id
    metadata.tycoonId = json.tycoonId
    metadata.corporationId = json.corporationId
    metadata.companyId = json.companyId
    metadata.townId = json.townId
    metadata.definitionId = json.definitionId
    metadata.name = json.name
    metadata.mapX = json.mapX
    metadata.mapY = json.mapY
    metadata.stage = json.stage || 0
    metadata
