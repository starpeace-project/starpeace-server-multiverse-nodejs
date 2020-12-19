_ = require('lodash')
{ DateTime } = require('luxon')
sqlite3 = require('sqlite3').verbose()

KEY_PLANET_DATE = 'planetDate'

module.exports = class SimulationStateStore
  constructor: (@readOnly, planetId) ->
    @db = new sqlite3.Database("./db/planet.#{planetId}.metadata.db", (if @readOnly then sqlite3.OPEN_READONLY else (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)))

    unless @readOnly
      @db.exec "PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS simulation_state (id TEXT PRIMARY KEY, content TEXT NOT NULL)", (err) ->
        throw err if err

  close: () ->
    new Promise (resolve, reject) =>
      @db.close (err) ->
        return reject(err) if err
        resolve()

  get: (id) ->
    new Promise (resolve, reject) =>
      @db.get "SELECT content FROM simulation_state WHERE id = ?", [id], (err, row) ->
        return reject(err) if err
        resolve(if row?.content? then JSON.parse(row.content) else null)

  set: (id, content) ->
    new Promise (resolve, reject) =>
      @db.run "INSERT OR REPLACE INTO simulation_state (id, content) VALUES (?, ?)", [id, JSON.stringify(content)], (err, row) ->
        return reject(err) if err
        resolve(content)


  getPlanetDate: -> DateTime.fromISO(await @get(KEY_PLANET_DATE))
  setPlanetDate: (date) -> @set(KEY_PLANET_DATE, date.toISO())
