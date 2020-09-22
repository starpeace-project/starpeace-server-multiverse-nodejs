

module.exports = class Visa
  constructor: () ->

  isTycoon: () -> @type == 'tycoon'

  toJsonApi: () ->
    {
      visaId: @id
      identityType: @type
    }

  toJson: () ->
    {
      id: @id
      type: @type
      tycoonId: @tycoonId
      planetId: @planetId
      corporationId: @corporationId
    }

  @fromJson: (json) ->
    visa = new Visa()
    visa.id = json.id
    visa.type = json.type
    visa.tycoonId = json.tycoonId
    visa.planetId = json.planetId
    visa.corporationId = json.corporationId
    visa
