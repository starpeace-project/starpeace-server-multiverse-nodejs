
module.exports = class Ranking
  constructor: () ->

  toJson: () ->
    {
      rankingTypeId: @rankingTypeId
      rank: @rank
      value: @value
      tycoonId: @tycoonId
      corporationId: @corporationId
    }

  @fromJson: (json) ->
    ranking = new Ranking()
    ranking.rankingTypeId = json.rankingTypeId
    ranking.rank = json.rank
    ranking.value = json.value
    ranking.tycoonId = json.tycoonId
    ranking.corporationId = json.corporationId
    ranking
