_ = require('lodash')
sqlite3 = require('sqlite3').verbose()

Ranking = require('../../corporation/ranking')

module.exports = class RankingsStore
  constructor: (@readOnly, planetId) ->
    @db = new sqlite3.Database("./db/planet.#{planetId}.corporations.db", (if @readOnly then sqlite3.OPEN_READONLY else (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)))

    unless @readOnly
      @db.exec "PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS rankings (rankingTypeId TEXT PRIMARY KEY, content TEXT NOT NULL)", (err) ->
        throw err if err

  close: () ->
    new Promise (resolve, reject) =>
      @db.close (err) ->
        return reject(err) if err
        resolve()

  get: (id) ->
    new Promise (resolve, reject) =>
      @db.get "SELECT content FROM rankings WHERE rankingTypeId = ?", [id], (err, row) ->
        return reject(err) if err
        resolve(if row?.content? then _.map(JSON.parse(row.content), Ranking.fromJson) else [])

  set: (rankingTypeId, rankings) ->
    new Promise (resolve, reject) =>
      return reject('Cannot set Rankings in read-only mode') if @readOnly
      @db.run "INSERT OR REPLACE INTO rankings (rankingTypeId, content) VALUES (?, ?)", [rankingTypeId, JSON.stringify(_.map(rankings, (r) -> r.toJson()))], (err, row) ->
        return reject(err) if err
        resolve(rankings)
