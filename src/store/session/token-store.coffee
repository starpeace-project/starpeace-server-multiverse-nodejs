sqlite3 = require('sqlite3').verbose()

TWO_WEEKS = 1209600000

module.exports = class TokenStore
  constructor: (@readOnly) ->
    @db = new sqlite3.Database("./db/sessions.db", (if @readOnly then sqlite3.OPEN_READONLY else (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)))

    unless @readOnly
      @db.exec "PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS tokens (token PRIMARY KEY, expired, uid)", (err) ->
        throw err if err

  close: () ->
    new Promise (resolve, reject) =>
      @db.close (err) ->
        return reject(err) if err
        resolve()

  cleanup: () ->
    new Promise (resolve, reject) =>
      @db.run "DELETE FROM tokens WHERE ? > expired", [new Date().getTime()], (err, row) ->
        return reject(err) if err
        resolve(row)
  clear: () ->
    new Promise (resolve, reject) =>
      @db.exec "DELETE FROM tokens", (err, row) ->
        return reject(err) if err
        resolve(row)

  get: (token) ->
    new Promise (resolve, reject) =>
      @db.get "SELECT uid FROM tokens WHERE token = ? AND ? <= expired", [token, new Date().getTime()], (err, row) ->
        return reject(err) if err
        resolve(row?.uid)

  set: (token, uid) ->
    new Promise (resolve, reject) =>
      @db.all "INSERT OR REPLACE INTO tokens VALUES (?, ?, ?)", [token, new Date().getTime() + TWO_WEEKS, uid], (err, row) ->
        return reject(err) if err
        resolve(token)

  destroy: (token) ->
    new Promise (resolve, reject) =>
      @db.run "DELETE FROM tokens WHERE token = ?", [token], (err, row) ->
        return reject(err) if err
        resolve(row)

  length: () ->
    new Promise (resolve, reject) =>
      @db.all "SELECT COUNT(*) AS count FROM tokens", [], (err, rows) ->
        return reject(err) if err
        resolve(rows?[0]?.count || 0)

  consumeToken: (token) ->
    new Promise (resolve, reject) =>
      @get(token)
        .then (uid) =>
          if uid?
            @destroy(token)
              .then (removed) -> resolve(uid)
              .catch reject
          else
            reject()
        .catch reject
