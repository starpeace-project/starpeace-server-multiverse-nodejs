_ = require('lodash')
zmq = require('zeromq')

Bookmark = require('../../corporation/bookmark')
Company = require('../../company/company')
Corporation = require('../../corporation/corporation')
Invention = require('../../company/invention')
Tycoon = require('../../tycoon/tycoon')
Visa = require('../../tycoon/visa')

Utils = require('../../utils/utils')

SYNC_API_PORT = 19165
ASYNC_SERVER_TO_CLIENT_PORT = 19166
ASYNC_CLIENT_TO_SERVER_PORT = 19167

module.exports = class ModelEventClient
  constructor: () ->
    @requestSocket = new zmq.Request()
    @requestSocket.connect("tcp://127.0.0.1:#{SYNC_API_PORT}")
    console.log "[Model Event Client] API Requester started on port #{SYNC_API_PORT}"

    @subscriberSocket = new zmq.Subscriber()
    @subscriberSocket.connect("tcp://127.0.0.1:#{ASYNC_SERVER_TO_CLIENT_PORT}")
    @subscriberSocket.subscribe('BUILDING:UPDATE', 'COMPANY:UPDATE', 'CORPORATION:UPDATE', 'INVENTION:START', 'INVENTION:SELL', 'TYCOON:UPDATE')
    console.log "[Model Event Client] Subscriber started on port #{ASYNC_SERVER_TO_CLIENT_PORT}"

    @publisherSocket = new zmq.Publisher()
    @publisherSocket.connect("tcp://127.0.0.1:#{ASYNC_CLIENT_TO_SERVER_PORT}")
    console.log "[Model Event Client] Publisher started on port #{ASYNC_CLIENT_TO_SERVER_PORT}"

  stop: () ->
    console.log('[Model Event Client] Stopping...')
    await @requestSocket.close()
    await @subscriberSocket.close()
    await @publisherSocket.close()
    console.log('[Model Event Client] Stopped')

  receiveNotifications: (buildingManager, companyManager, corporationManager, tycoonManager) ->
    for await [topic, message] from @subscriberSocket
      topic = topic.toString()
      result = JSON.parse(message)
      switch topic
        when 'BUILDING:UPDATE' then buildingManager.updateCache(result.planetId, result.id)
        when 'COMPANY:UPDATE' then companyManager.updateCache(result.planetId, result.id)
        when 'CORPORATION:UPDATE' then corporationManager.updateCache(result.planetId, result.id)
        when 'INVENTION:START' then console.log 'invention inserted'
        when 'INVENTION:SELL' then console.log 'invention sold'
        when 'TYCOON:UPDATE' then tycoonManager.updateCache(result.id)
        else console.log "Unknown Model Event topic #{topic}"


  createTycoon: (tycoon) ->
    new Promise (resolve, reject) =>
      await @requestSocket.send(JSON.stringify({ type: 'TYCOON:CREATE', payload: tycoon.toJson() }))
      [result] = await @requestSocket.receive()
      resolve(Tycoon.fromJson(JSON.parse(result).tycoon))

  issueToken: (tycoon) ->
    new Promise (resolve, reject) =>
      await @requestSocket.send(JSON.stringify({ type: 'TOKEN:ISSUE', payload: tycoon.id }))
      [result] = await @requestSocket.receive()
      resolve(JSON.parse(result).token)
  loginToken: (token) ->
    new Promise (resolve, reject) =>
      await @requestSocket.send(JSON.stringify({ type: 'TOKEN:LOGIN', payload: token }))
      [result] = await @requestSocket.receive()
      resolve(Tycoon.fromJson(JSON.parse(result).tycoon))

  saveVisa: (visa) ->
    new Promise (resolve, reject) =>
      await @requestSocket.send(JSON.stringify({ type: 'VISA:SAVE', payload: visa.toJson() }))
      [result] = await @requestSocket.receive()
      resolve(Visa.fromJson(JSON.parse(result).visa))
  destroyVisa: (visaId) ->
    new Promise (resolve, reject) =>
      await @requestSocket.send(JSON.stringify({ type: 'VISA:DESTROY', payload: { visaId } }))
      await @requestSocket.receive()
      resolve()
  touchVisa: (visaId) ->
    new Promise (resolve, reject) =>
      await @publisherSocket.send(['VISA:TOUCH', JSON.stringify({ payload: visaId })])
      resolve()

  saveBookmarks: (planetId, bookmarks) ->
    new Promise (resolve, reject) =>
      await @requestSocket.send(JSON.stringify({ type: 'BOOKMARK:SAVE', payload: { planetId, bookmarks: _.map(bookmarks, (bookmark) -> bookmark.toJson()) } }))
      [result] = await @requestSocket.receive()
      resolve(_.map(JSON.parse(result).bookmarks, (json) -> Bookmark.fromJson(json)))

  createCorporation: (corporation) ->
    new Promise (resolve, reject) =>
      await @requestSocket.send(JSON.stringify({ type: 'CORPORATION:CREATE', payload: corporation.toJson() }))
      [result] = await @requestSocket.receive()
      resolve(Corporation.fromJson(JSON.parse(result).corporation))

  createCompany: (company) ->
    new Promise (resolve, reject) =>
      await @requestSocket.send(JSON.stringify({ type: 'COMPANY:CREATE', payload: company.toJson() }))
      [result] = await @requestSocket.receive()
      resolve(Company.fromJson(JSON.parse(result).company))

  startResearch: (planetId, invention) ->
    new Promise (resolve, reject) =>
      await @requestSocket.send(JSON.stringify({ type: 'RESEARCH:START', payload: { planetId, invention: invention.toJson() } }))
      [result] = await @requestSocket.receive()
      resolve(Invention.fromJson(JSON.parse(result).invention))

  sellResearch: (planetId, companyId, inventionId) ->
    new Promise (resolve, reject) =>
      await @requestSocket.send(JSON.stringify({ type: 'RESEARCH:SELL', payload: { planetId, companyId, inventionId } }))
      [result] = await @requestSocket.receive()
      resolve(JSON.parse(result).inventionId)
