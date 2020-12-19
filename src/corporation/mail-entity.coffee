
module.exports = class MailEntity
  constructor: () ->

  toJson: () ->
    {
      id: @id
      name: @name
    }

  @fromJson: (json) ->
    entity = new MailEntity()
    entity.id = json.id
    entity.name = json.name
    entity
