_ = require('lodash')
sqlite3 = require('sqlite3').verbose()

Visa = require('../../tycoon/visa')

FIFTEEN_MINUTES = 900000

module.exports = class VisaStore
  constructor: (@readOnly) ->
    @db = new sqlite3.Database("./db/sessions.db", (if @readOnly then sqlite3.OPEN_READONLY else (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)))

    unless @readOnly
      @db.exec "PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS visas (id TEXT PRIMARY KEY, tycoonId TEXT NOT NULL UNIQUE, planetId TEXT NOT NULL, content TEXT NOT NULL, expired NOT NULL)", (err) ->
        throw err if err

  close: () ->
    new Promise (resolve, reject) =>
      @db.close (err) ->
        return reject(err) if err
        resolve()

  cleanup: () ->
    new Promise (resolve, reject) =>
      @db.run "DELETE FROM visas WHERE ? > expired", [new Date().getTime()], (err, row) ->
        return reject(err) if err
        resolve(row)
  clear: () ->
    new Promise (resolve, reject) =>
      @db.exec "DELETE FROM visas", (err, row) ->
        return reject(err) if err
        resolve(row)

  get: (id) ->
    new Promise (resolve, reject) =>
      @db.get "SELECT content FROM visas WHERE id = ? AND ? <= expired", [id, new Date().getTime()], (err, row) ->
        return reject(err) if err
        resolve(if row?.content? then Visa.fromJson(JSON.parse(row.content)) else null)

  forPlanetId: (planetId) ->
    new Promise (resolve, reject) =>
      @db.all "SELECT content FROM visas WHERE planetId = ? AND ? <= expired", [planetId, new Date().getTime()], (err, rows) ->
        return reject(err) if err
        resolve(_.map(_.filter(rows, (row) -> row?.content?), (row) -> Visa.fromJson(JSON.parse(row.content))))

  set: (visa) ->
    new Promise (resolve, reject) =>
      @db.all "INSERT OR REPLACE INTO visas VALUES (?, ?, ?, ?, ?)", [visa.id, visa.tycoonId, visa.planetId, JSON.stringify(visa.toJson()), new Date().getTime() + FIFTEEN_MINUTES], (err, row) ->
        return reject(err) if err
        resolve(visa.id)

  touch: (id) ->
    new Promise (resolve, reject) =>
      now = new Date().getTime()
      @db.run "UPDATE visas SET expired=? WHERE id = ? AND ? <= expired", [now + FIFTEEN_MINUTES, id, now], (err, row) ->
        return reject(err) if err
        resolve(id)

  destroy: (id) ->
    new Promise (resolve, reject) =>
      @db.run "DELETE FROM visas WHERE id = ?", [id], (err, row) ->
        return reject(err) if err
        resolve(row)

  destroyByTycoon: (tycoonId) ->
    new Promise (resolve, reject) =>
      @db.run "DELETE FROM visas WHERE tycoonId = ?", [tycoonId], (err, row) ->
        return reject(err) if err
        resolve(row)
