_ = require('lodash')
fs = require('fs-extra')

STARPEACE = require('@starpeace/starpeace-assets-types')


module.exports = class SetupPlanetMetadata
  constructor: () ->

  createIndustryRankings: (configurations, type, baseId, unit) ->
    _.concat([{
      id: "#{baseId}-total"
      parentId: baseId
      type: type
      categoryTotal: true
      unit: unit
    }], _.flatMap(_.omit(_.groupBy(_.values(configurations.building.definitions), 'industryCategoryId'), ['NONE', 'CIVIC']), (definitions,categoryId) ->
      _.concat(_.map(_.without(_.uniq(_.map(definitions, 'industryTypeId')), 'HEADQUARTERS', 'MAUSOLEUM'), (typeId) -> {
        id: "#{baseId}-#{categoryId}-#{typeId}"
        parentId: "#{baseId}-#{categoryId}"
        type: type
        unit: unit
        industryCategoryId: categoryId
        industryTypeId: typeId
      }), {
        id: "#{baseId}-#{categoryId}"
        parentId: baseId
        type: 'FOLDER'
        industryCategoryId: categoryId
      }, {
        id: "#{baseId}-#{categoryId}-total"
        parentId: "#{baseId}-#{categoryId}"
        type: type
        categoryTotal: true
        unit: unit
        industryCategoryId: categoryId
      })
    ))

  createRankings: (configurations) ->
    _.concat([
      {
        id: 'corporation'
        type: 'CORPORATION'
        unit: 'COUNT'
        label: {
          'DE': 'Gesellschaft',
          'EN': 'Corporation',
          'ES': 'Corporación',
          'FR': 'Entreprise',
          'IT': 'Società',
          'PT': 'Corporação'
        }
      },
      {
        id: 'profit'
        type: 'FOLDER'
        label: {
          'DE': 'Profit'
          'EN': 'Profit'
          'ES': 'Lucro'
          'FR': 'Profit'
          'IT': 'Profitto'
          'PT': 'Lucro'
        }
      },
      {
        id: 'prestige'
        type: 'PRESTIGE'
        label: {
          'DE': 'Prestige'
          'EN': 'Prestige'
          'ES': 'Prestigio'
          'FR': 'Prestige'
          'IT': 'Prestigio'
          'PT': 'Prestígio'
        }
        unit: 'COUNT'
      },
      {
        id: 'wealth'
        type: 'WEALTH'
        unit: 'CURRENCY'
        label: {
          'DE': 'Reichtum'
          'EN': 'Wealth'
          'ES': 'Riqueza'
          'FR': 'Richesse'
          'IT': 'Ricchezza'
          'PT': 'Riqueza'
        }
      }
    ], @createIndustryRankings(configurations, 'PROFIT', 'profit', 'CURRENCY'))


  export: (configurations, planetId) ->
    fs.writeFileSync("./config/metadata.#{planetId}.building.json", JSON.stringify({
      definitions: _.map(_.values(configurations.building.definitions), (i) -> i.toJson())
      simulationDefinitions: _.map(_.values(configurations.building.simulations), (i) -> i.toJson())
    }))

    fs.writeFileSync("./config/metadata.#{planetId}.core.json", JSON.stringify({
      cityZones: _.map(configurations.industry.cityZones, (i) -> i.toJson())
      industryCategories: _.map(configurations.industry.industryCategories, (i) -> i.toJson())
      industryTypes: _.map(configurations.industry.industryTypes, (i) -> i.toJson())
      levels: _.map(configurations.industry.levels, (i) -> i.toJson())
      rankingTypes: @createRankings(configurations)
      resourceTypes: _.map(configurations.industry.resourceTypes, (i) -> i.toJson())
      resourceUnits: _.map(configurations.industry.resourceUnits, (i) -> i.toJson())
      seals: _.map(configurations.seals, (i) -> i.toJson())
    }))

    fs.writeFileSync("./config/metadata.#{planetId}.invention.json", JSON.stringify({
      inventions: _.map(configurations.inventions, (i) -> i.toJson())
    }))
