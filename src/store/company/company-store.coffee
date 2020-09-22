_ = require('lodash')
sqlite3 = require('sqlite3').verbose()

Company = require('../../company/company')

module.exports = class CompanyStore
  constructor: (@readOnly, planetId) ->
    @db = new sqlite3.Database("./db/planet.#{planetId}.companies.db", (if @readOnly then sqlite3.OPEN_READONLY else (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)))

    unless @readOnly
      @db.exec "PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, content TEXT NOT NULL)", (err) ->
        throw err if err

  close: () ->
    new Promise (resolve, reject) =>
      @db.close (err) ->
        return reject(err) if err
        resolve()

  all: () ->
    new Promise (resolve, reject) =>
      @db.all "SELECT content FROM companies", [], (err, rows) ->
        return reject(err) if err
        resolve(_.map(_.filter(rows, (row) -> row?.content?), (row) -> Company.fromJson(JSON.parse(row.content))))

  get: (id) ->
    new Promise (resolve, reject) =>
      @db.get "SELECT content FROM companies WHERE id = ?", [id], (err, row) ->
        return reject(err) if err
        resolve(if row?.content? then Company.fromJson(JSON.parse(row.content)) else null)

  set: (company) ->
    new Promise (resolve, reject) =>
      @db.run "INSERT OR REPLACE INTO companies (id, content) VALUES (?, ?)", [company.id, JSON.stringify(company.toJson())], (err, row) ->
        return reject(err) if err
        resolve(company)
