_ = require('lodash')
sqlite3 = require('sqlite3').verbose()

Bookmark = require('../../corporation/bookmark')

module.exports = class MailStore
  constructor: (@readOnly, planetId) ->
    @db = new sqlite3.Database("./db/planet.#{planetId}.corporations.db", (if @readOnly then sqlite3.OPEN_READONLY else (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)))

    unless @readOnly
      @db.exec "PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS bookmarks (id TEXT PRIMARY KEY, corporationId TEXT NOT NULL, content TEXT NOT NULL)", (err) ->
        throw err if err

  close: () ->
    new Promise (resolve, reject) =>
      @db.close (err) ->
        return reject(err) if err
        resolve()

  forCorporationId: (corporationId) ->
    new Promise (resolve, reject) =>
      @db.all "SELECT content FROM bookmarks WHERE corporationId = ?", [corporationId], (err, rows) ->
        return reject(err) if err
        resolve(_.map(_.filter(rows, (row) -> row?.content?), (row) -> Bookmark.fromJson(JSON.parse(row.content))))

  get: (id) ->
    new Promise (resolve, reject) =>
      @db.get "SELECT content FROM bookmarks WHERE id = ?", [id], (err, row) ->
        return reject(err) if err
        resolve(if row?.content? then Bookmark.fromJson(JSON.parse(row.content)) else null)

  set: (bookmark) ->
    new Promise (resolve, reject) =>
      return reject('Cannot set Bookmark in read-only mode') if @readOnly
      @db.run "INSERT OR REPLACE INTO bookmarks (id, corporationId, content) VALUES (?, ?, ?)", [bookmark.id, bookmark.corporationId, JSON.stringify(bookmark.toJson())], (err, row) ->
        return reject(err) if err
        resolve(bookmark)
