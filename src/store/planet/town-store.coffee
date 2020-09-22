_ = require('lodash')
sqlite3 = require('sqlite3').verbose()

Town = require('../../planet/town')

module.exports = class TownStore
  constructor: (@readOnly, planetId) ->
    @db = new sqlite3.Database("./db/planet.#{planetId}.metadata.db", (if @readOnly then sqlite3.OPEN_READONLY else (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)))

    unless @readOnly
      @db.exec "PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS towns (id TEXT PRIMARY KEY, content TEXT NOT NULL)", (err) ->
        throw err if err

  close: () ->
    new Promise (resolve, reject) =>
      @db.close (err) ->
        return reject(err) if err
        resolve()

  all: () ->
    new Promise (resolve, reject) =>
      @db.all "SELECT content FROM towns", [], (err, rows) ->
        return reject(err) if err
        resolve(_.map(_.filter(rows, (row) -> row?.content?), (row) -> Town.fromJson(JSON.parse(row.content))))

  get: (id) ->
    new Promise (resolve, reject) =>
      @db.get "SELECT content FROM towns WHERE id = ?", [id], (err, row) ->
        return reject(err) if err
        resolve(if row?.content? then Town.fromJson(JSON.parse(row.content)) else null)

  set: (town) ->
    new Promise (resolve, reject) =>
      @db.run "INSERT OR REPLACE INTO towns (id, content) VALUES (?, ?)", [town.id, JSON.stringify(town.toJson())], (err, row) ->
        return reject(err) if err
        resolve(town)
