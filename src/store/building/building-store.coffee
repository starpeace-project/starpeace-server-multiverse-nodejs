_ = require('lodash')
sqlite3 = require('sqlite3').verbose()

Building = require('../../building/building')

module.exports = class BuildingStore
  constructor: (@readOnly, planetId) ->
    @db = new sqlite3.Database("./db/planet.#{planetId}.buildings.db", (if @readOnly then sqlite3.OPEN_READONLY else (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)))

    unless @readOnly
      @db.exec "PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS buildings (id TEXT PRIMARY KEY, content TEXT NOT NULL)", (err) ->
        throw err if err

  close: () ->
    new Promise (resolve, reject) =>
      @db.close (err) ->
        return reject(err) if err
        resolve()

  all: () ->
    new Promise (resolve, reject) =>
      @db.all "SELECT content FROM buildings", [], (err, rows) ->
        return reject(err) if err
        resolve(_.map(_.filter(rows, (row) -> row?.content?), (row) -> Building.fromJson(JSON.parse(row.content))))

  get: (id) ->
    new Promise (resolve, reject) =>
      @db.get "SELECT content FROM buildings WHERE id = ?", [id], (err, row) ->
        return reject(err) if err
        resolve(if row?.content? then Building.fromJson(JSON.parse(row.content)) else null)

  set: (building) ->
    new Promise (resolve, reject) =>
      @db.run "INSERT OR REPLACE INTO buildings (id, content) VALUES (?, ?)", [building.id, JSON.stringify(building.toJson())], (err, row) ->
        return reject(err) if err
        resolve(building)
