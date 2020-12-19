_ = require('lodash')

module.exports = class TycoonCache
  constructor: () ->
    @byId = {}

    @idbyUsername = {}

  all: () -> _.values(@byId)

  forId: (tycoonId) -> @byId[tycoonId]
  forUsername: (username) -> @forId(@idbyUsername[username])

  update: (tycoonOrTycoons) ->
    if Array.isArray(tycoonOrTycoons)
      @update(tycoon) for tycoon in tycoonOrTycoons
    else
      @byId[tycoonOrTycoons.id] = tycoonOrTycoons

      @idbyUsername[tycoonOrTycoons.username] = tycoonOrTycoons.id
