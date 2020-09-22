sqlite3 = require('sqlite3')

Tycoon = require('../tycoon/tycoon')

module.exports = class TycoonStore
  constructor: (@readOnly) ->
    @db = new sqlite3.Database("./db/tycoons.db", (if @readOnly then sqlite3.OPEN_READONLY else (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)))

    unless @readOnly
      @db.exec "PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS tycoons (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, content TEXT NOT NULL)", (err) ->
        throw err if err

  close: () ->
    new Promise (resolve, reject) =>
      @db.close (err) ->
        return reject(err) if err
        resolve()

  get: (id) ->
    new Promise (resolve, reject) =>
      @db.get "SELECT content FROM tycoons WHERE id = ?", [id], (err, row) ->
        return reject(err) if err
        resolve(if row?.content? then Tycoon.fromJson(JSON.parse(row.content)) else null)

  forUsername: (username) ->
    new Promise (resolve, reject) =>
      @db.get "SELECT content FROM tycoons WHERE username = ?", [username], (err, row) ->
        return reject(err) if err
        resolve(if row?.content? then Tycoon.fromJson(JSON.parse(row.content)) else null)

  set: (tycoon) ->
    new Promise (resolve, reject) =>
      return reject('READ_ONLY mode') if @readOnly

      @db.run "INSERT OR REPLACE INTO tycoons (id, username, content) VALUES (?, ?, ?)", [tycoon.id, tycoon.username, JSON.stringify(tycoon.toJson())], (err, row) ->
        return reject(err) if err
        resolve(tycoon)
