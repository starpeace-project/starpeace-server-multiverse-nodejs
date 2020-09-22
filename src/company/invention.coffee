
module.exports = class Invention
  constructor: () ->

  toJson: () ->
    {
      id: @id
      companyId: @companyId
      status: @status
      progress: @progress
      investment: @investment
      rebate: @rebate
      rebatePaid: @rebatePaid
      createdAt: @createdAt
    }

  @fromJson: (json) ->
    invention = new Invention()
    invention.id = json.id
    invention.companyId = json.companyId
    invention.status = json.status
    invention.progress = json.progress
    invention.investment = json.investment
    invention.rebate = json.rebate
    invention.rebatePaid = json.rebatePaid
    invention.createdAt = json.createdAt
    invention
