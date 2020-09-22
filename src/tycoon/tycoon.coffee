

module.exports = class Tycoon
  constructor: () ->
    @id = null
    @username = null
    @name = null
    @passwordHash = null

  toJson: () ->
    {
      id: @id
      username: @username
      name: @name
      passwordHash: @passwordHash
    }

  @fromJson: (json) ->
    tycoon = new Tycoon()
    tycoon.id = json.id
    tycoon.username = json.username
    tycoon.name = json.name
    tycoon.passwordHash = json.passwordHash
    tycoon
