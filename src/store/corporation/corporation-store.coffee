_ = require('lodash')
sqlite3 = require('sqlite3').verbose()

Corporation = require('../../corporation/corporation')

module.exports = class CorporationStore
  constructor: (@readOnly, planetId) ->
    @db = new sqlite3.Database("./db/planet.#{planetId}.corporations.db", (if @readOnly then sqlite3.OPEN_READONLY else (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)))

    unless @readOnly
      @db.exec "PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS corporations (id TEXT PRIMARY KEY, tycoonId TEXT NOT NULL UNIQUE, content TEXT NOT NULL)", (err) ->
        throw err if err

  close: () ->
    new Promise (resolve, reject) =>
      @db.close (err) ->
        return reject(err) if err
        resolve()

  all: () ->
    new Promise (resolve, reject) =>
      @db.all "SELECT content FROM corporations", [], (err, rows) ->
        return reject(err) if err
        resolve(_.map(_.filter(rows, (row) -> row?.content?), (row) -> Corporation.fromJson(JSON.parse(row.content))))

  get: (id) ->
    new Promise (resolve, reject) =>
      @db.get "SELECT content FROM corporations WHERE id = ?", [id], (err, row) ->
        return reject(err) if err
        resolve(if row?.content? then Corporation.fromJson(JSON.parse(row.content)) else null)

  set: (corporation) ->
    new Promise (resolve, reject) =>
      return reject('Cannot set Corporation in read-only mode') if @readOnly
      @db.run "INSERT OR REPLACE INTO corporations (id, tycoonId, content) VALUES (?, ?, ?)", [corporation.id, corporation.tycoonId, JSON.stringify(corporation.toJson())], (err, row) ->
        return reject(err) if err
        resolve(corporation)
