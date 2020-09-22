
module.exports = class Mail
  constructor: (@id) ->

  toJson: () ->
    {
      id: @id
      corporationId: @corporationId
    }

  @fromJson: (json) ->
    metadata = new Mail(json.id)
    metadata.corporationId = json.corporationId
    metadata
