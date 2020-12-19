_ = require('lodash')
{ DateTime } = require('luxon')

MailEntity = require('../corporation/mail-entity')

module.exports = class Mail
  constructor: () ->

  markRead: () ->
    @read = true
    @

  toJson: () ->
    {
      id: @id
      corporationId: @corporationId
      read: @read
      sentAt: @sentAt.toISO()
      planetSentAt: @planetSentAt.toISODate()
      from: @from.toJson()
      to: _.map(@to, (t) -> t.toJson())
      subject: @subject
      body: @body
    }

  @fromJson: (json) ->
    mail = new Mail()
    mail.id = json.id
    mail.corporationId = json.corporationId
    mail.read = json.read
    mail.sentAt = DateTime.fromISO(json.sentAt)
    mail.planetSentAt = DateTime.fromISO(json.planetSentAt)
    mail.from = MailEntity.fromJson(json.from)
    mail.to = _.map(json.to, MailEntity.fromJson)
    mail.subject = json.subject
    mail.body = json.body
    mail
