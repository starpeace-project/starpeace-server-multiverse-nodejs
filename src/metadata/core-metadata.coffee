_ = require('lodash')

STARPEACE = require('@starpeace/starpeace-assets-types')

module.exports = class CoreMetadata
  constructor: () ->

  lowestLevel: () -> _.first(_.orderBy(@levels, ['level'], ['asc']))

  sealForId: (sealId) -> _.find(@seals, (seal) -> seal.id == sealId)

  toJson: () ->
    {
      cityZones: _.map(@cityZones, (i) -> i.toJson())
      industryCategories: _.map(@industryCategories, (i) -> i.toJson())
      industryTypes: _.map(@industryTypes, (i) -> i.toJson())
      levels: _.map(@levels, (i) -> i.toJson())
      rankingTypes: @rankingTypes
      resourceTypes: _.map(@resourceTypes, (i) -> i.toJson())
      resourceUnits: _.map(@resourceUnits, (i) -> i.toJson())
      seals: _.map(@seals, (i) -> i.toJson())
    }

  @fromJson: (json) ->
    metadata = new CoreMetadata()
    metadata.cityZones = _.map(json.cityZones, STARPEACE.industry.CityZone.fromJson)
    metadata.industryCategories = _.map(json.industryCategories, STARPEACE.industry.IndustryCategory.fromJson)
    metadata.industryTypes = _.map(json.industryTypes, STARPEACE.industry.IndustryType.fromJson)
    metadata.levels = _.map(json.levels, STARPEACE.industry.Level.fromJson)
    metadata.rankingTypes = json.rankingTypes
    metadata.resourceTypes = _.map(json.resourceTypes, STARPEACE.industry.ResourceType.fromJson)
    metadata.resourceUnits = _.map(json.resourceUnits, STARPEACE.industry.ResourceUnit.fromJson)
    metadata.seals = _.map(json.seals, STARPEACE.seal.CompanySeal.fromJson)
    metadata
