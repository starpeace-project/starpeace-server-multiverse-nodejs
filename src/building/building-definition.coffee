
Translation = require('../language/translation')

module.exports = class BuildingDefinition
  constructor: (@id) ->

  @fromJson: (json) ->
    metadata = new BuildingDefinition(json.id)
    metadata.imageId = json.imageId
    metadata.constructionImageId = json.constructionImageId
    metadata.concreteFoundation = json.concreteFoundation || false
    metadata.name = Translation.fromJson(json.name)
    metadata.industryCategoryId = json.industryCategoryId
    metadata.industryTypeId = json.industryTypeId
    metadata.sealId = json.sealId
    metadata.restricted = json.restricted || false || !json.cityZoneId?
    metadata.cityZoneId = json.cityZoneId
    metadata.requiredInventionIds = json.requiredInventionIds || []
    metadata
