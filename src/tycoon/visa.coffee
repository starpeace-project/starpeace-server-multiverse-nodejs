_ = require('lodash')

module.exports = class Visa
  constructor: () ->

  isTycoon: () -> @type == 'tycoon'

  toJsonApi: () ->
    _.pickBy({
      visaId: @id
      identityType: @type
      corporationId: @corporationId
    }, _.identity)

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
