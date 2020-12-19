_ = require('lodash')
zmq = require('zeromq')

Bookmark = require('../../corporation/bookmark')
Company = require('../../company/company')
Corporation = require('../../corporation/corporation')
Invention = require('../../company/invention')
Mail = require('../../corporation/mail')
Tycoon = require('../../tycoon/tycoon')
Visa = require('../../tycoon/visa')

BuildingStore = require('../../store/building/building-store')

CompanyStore = require('../../store/company/company-store')
InventionStore = require('../../store/company/invention-store')

CorporationStore = require('../../store/corporation/corporation-store')
BookmarkStore = require('../../store/corporation/bookmark-store')
MailStore = require('../../store/corporation/mail-store')

TycoonStore = require('../../store/tycoon-store')
TokenStore = require('../../store/session/token-store')
VisaStore = require('../../store/session/visa-store')

Utils = require('../../utils/utils')

SYNC_API_PORT = 19165
ASYNC_SERVER_TO_CLIENT_PORT = 19166
ASYNC_CLIENT_TO_SERVER_PORT = 19167

module.exports = class ModelEventServer
  constructor: (galaxyManager) ->
    @replySocket = new zmq.Reply()
    @publisherSocket = new zmq.Publisher()
    @subscriberSocket = new zmq.Subscriber()

    @tycoonStore = new TycoonStore(false)
    @tokenStore = new TokenStore(false)
    @visaStore = new VisaStore(false)

    @bookmarkStores = {}
    @buildingStores = {}
    @companyStores = {}
    @corporationStores = {}
    @inventionStores = {}
    @mailStores = {}

    for planet in galaxyManager.metadata.planets
      @bookmarkStores[planet.id] = new BookmarkStore(false, planet.id)
      @buildingStores[planet.id] = new BuildingStore(false, planet.id)
      @companyStores[planet.id] = new CompanyStore(false, planet.id)
      @corporationStores[planet.id] = new CorporationStore(false, planet.id)
      @inventionStores[planet.id] = new InventionStore(false, planet.id)
      @mailStores[planet.id] = new MailStore(false, planet.id)

  start: () ->
    @receiveRequests()
    @receiveNotifications()

    await @publisherSocket.bind("tcp://127.0.0.1:#{ASYNC_SERVER_TO_CLIENT_PORT}")
    console.log "[Model Event Server] Publisher started on port #{ASYNC_SERVER_TO_CLIENT_PORT}"

  stop: () ->
    console.log('[Model Event Server] Stopping...')

    await @replySocket.close()
    await @publisherSocket.close()
    await @subscriberSocket.close()

    await @tycoonStore.close()
    await @tokenStore.close()
    await @visaStore.close()

    await Promise.all(_.map(_.values(@bookmarkStores), (store) -> store.close()))
    await Promise.all(_.map(_.values(@buildingStores), (store) -> store.close()))
    await Promise.all(_.map(_.values(@companyStores), (store) -> store.close()))
    await Promise.all(_.map(_.values(@corporationStores), (store) -> store.close()))
    await Promise.all(_.map(_.values(@inventionStores), (store) -> store.close()))
    await Promise.all(_.map(_.values(@mailStores), (store) -> store.close()))

    console.log('[Model Event Server] Stopped')

  receiveRequests: () ->
    await @replySocket.bind("tcp://127.0.0.1:#{SYNC_API_PORT}")
    console.log "[Model Event Server] API Receiver started on port #{SYNC_API_PORT}"
    for await [message] from @replySocket
      request = JSON.parse(message)

      if request.type == 'TYCOON:CREATE'
        tycoon = await @tycoonStore.set(Tycoon.fromJson(request.payload))
        await @replySocket.send(JSON.stringify({ tycoon: tycoon.toJson() }))
        await @publisherSocket.send(['TYCOON:UPDATE', JSON.stringify({ id: tycoon.id })])

      else if request.type == 'TOKEN:ISSUE'
        token = await @tokenStore.set(Utils.randomString(64), request.payload)
        await @replySocket.send(JSON.stringify({ token: token }))

      else if request.type == 'TOKEN:LOGIN'
        uid = await @tycoonStore.consumeToken(request.payload)
        tycoon = await @tycoonStore.get(uid)
        await @replySocket.send(JSON.stringify({ tycoon: tycoon.toJson() }))

      else if request.type == 'VISA:SAVE'
        visa = Visa.fromJson(request.payload)
        await @visaStore.destroyByTycoon(visa.tycoonId)
        await @visaStore.set(visa)
        await @replySocket.send(JSON.stringify({ visa: visa.toJson() }))
      else if request.type == 'VISA:DESTROY'
        await @visaStore.destroy(request.payload.visaId)
        await @replySocket.send(JSON.stringify({ }))

      else if request.type == 'BOOKMARK:SAVE'
        bookmarks = await Promise.all(_.map(request.payload.bookmarks, (bookmark) => @bookmarkStores[request.payload.planetId].set(Bookmark.fromJson(bookmark))))
        await @replySocket.send(JSON.stringify({ bookmarks: _.map(bookmarks, (bookmark) -> bookmark.toJson()) }))

      else if request.type == 'CORPORATION:CREATE'
        corporation = Corporation.fromJson(request.payload)
        corporation = await @corporationStores[corporation.planetId].set(corporation)
        await @replySocket.send(JSON.stringify({ corporation: corporation.toJson() }))
        await @publisherSocket.send(['CORPORATION:UPDATE', JSON.stringify({ planetId: corporation.planetId, id: corporation.id })])

      else if request.type == 'COMPANY:CREATE'
        company = Company.fromJson(request.payload)
        company = await @companyStores[company.planetId].set(company)

        corporation = await @corporationStores[company.planetId].get(company.corporationId)
        corporation.companyIds.add(company.id)
        await @corporationStores[company.planetId].set(corporation)

        await @replySocket.send(JSON.stringify({ company: company.toJson() }))
        await @publisherSocket.send(['CORPORATION:UPDATE', JSON.stringify({ planetId: corporation.planetId, id: corporation.id })])
        await @publisherSocket.send(['COMPANY:UPDATE', JSON.stringify({ planetId: company.planetId, id: company.id })])

      else if request.type == 'RESEARCH:START'
        invention = await @inventionStores[request.payload.planetId].insert(Invention.fromJson(request.payload.invention))
        await @replySocket.send(JSON.stringify({ invention: invention.toJson() }))
        await @publisherSocket.send(['INVENTION:START', JSON.stringify({ planetId: request.payload.planetId, companyId: invention.companyId, id: invention.id })])

      else if request.type == 'RESEARCH:SELL'
        inventionId = await @inventionStores[request.payload.planetId].updateStatus(request.payload.companyId, request.payload.inventionId, 'SELLING')
        await @replySocket.send(JSON.stringify({ inventionId }))
        await @publisherSocket.send(['INVENTION:SELL', JSON.stringify({ planetId: request.payload.planetId, companyId: invention.companyId, id: invention.id })])

      else if request.type == 'MAIL:SEND'
        mail = await @mailStores[request.payload.planetId].set(Mail.fromJson(request.payload.mail))
        corporation = await @corporationStores[request.payload.planetId].get(mail.corporationId)
        corporation.lastMailAt = mail.sentAt
        corporation = await @corporationStores[request.payload.planetId].set(corporation)
        await @replySocket.send(JSON.stringify({ mail }))
        await @publisherSocket.send(['CORPORATION:UPDATE', JSON.stringify({ planetId: corporation.planetId, id: corporation.id })])

      else if request.type == 'MAIL:MARK_READ'
        mail = await @mailStores[request.payload.planetId].get(request.payload.mailId)
        mail = if mail? then (await @mailStores[request.payload.planetId].set(mail.markRead())) else null
        await @replySocket.send(JSON.stringify(if mail? then { mailId: mail.id } else { }))

      else if request.type == 'MAIL:DELETE'
        mail = await @mailStores[request.payload.planetId].get(request.payload.mailId)
        mailId = if mail? then (await @mailStores[request.payload.planetId].delete(mail.id)) else null
        await @replySocket.send(JSON.stringify(if mailId? then { mailId } else { }))

      else
        console.log "unknown model server request type #{request.type}"

  receiveNotifications: () ->
    await @subscriberSocket.bind("tcp://127.0.0.1:#{ASYNC_CLIENT_TO_SERVER_PORT}")
    @subscriberSocket.subscribe('VISA:TOUCH')
    console.log "[Model Event Server] Subscriber started on port #{ASYNC_CLIENT_TO_SERVER_PORT}"
    for await [topic, message] from @subscriberSocket
      topic = topic.toString()
      result = JSON.parse(message)
      switch topic
        when 'VISA:TOUCH' then await @visaStore.touch(result.visaId)
        else console.log "Unknown Model Event topic #{topic}"
