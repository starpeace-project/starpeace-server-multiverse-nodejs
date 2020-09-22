_ = require('lodash')
sqlite3 = require('sqlite3').verbose()

Invention = require('../../company/invention')

module.exports = class InventionStore
  constructor: (@readOnly, planetId) ->
    @db = new sqlite3.Database("./db/planet.#{planetId}.companies.db", (if @readOnly then sqlite3.OPEN_READONLY else (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)))

    unless @readOnly
      columns = []
      columns.push 'id TEXT PRIMARY KEY'
      columns.push 'companyId TEXT NOT NULL'
      columns.push 'status TEXT NOT NULL'
      columns.push 'progress INTEGER NOT NULL'
      columns.push 'investment INTEGER NOT NULL'
      columns.push 'rebate INTEGER NOT NULL'
      columns.push 'rebatePaid INTEGER NOT NULL'
      columns.push 'createdAt INTEGER NOT NULL'
      columns.push 'UNIQUE(id, companyId)'
      @db.exec "PRAGMA journal_mode = wal; CREATE TABLE IF NOT EXISTS inventions (#{columns.join(', ')})", (err) ->
        throw err if err

  close: () ->
    new Promise (resolve, reject) =>
      @db.close (err) ->
        return reject(err) if err
        resolve()

  forCompanyId: (companyId) ->
    new Promise (resolve, reject) =>
      @db.all "SELECT id, companyId, status, progress, investment, rebate, rebatePaid, createdAt FROM inventions WHERE companyId = ?", [companyId], (err, rows) ->
        return reject(err) if err
        resolve(_.map(_.filter(rows, (row) -> row?.id?), (row) -> Invention.fromJson(row)))

  forId: (companyId, inventionId) ->
    new Promise (resolve, reject) =>
      @db.get "SELECT id, companyId, status, progress, investment, rebate, rebatePaid, createdAt FROM inventions WHERE id = ? AND companyId = ?", [inventionId, companyId], (err, row) ->
        return reject(err) if err
        resolve(if row?.id? then Invention.fromJson(row) else null)

  insert: (invention) ->
    new Promise (resolve, reject) =>
      @db.run "INSERT INTO inventions (id, companyId, status, progress, investment, rebate, rebatePaid, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [invention.id, invention.companyId, invention.status, invention.progress, invention.investment, invention.rebate, invention.rebatePaid, invention.createdAt],
          (err, row) ->
        return reject(err) if err
        resolve(invention)

  updateStatus: (companyId, inventionId, status) ->
    new Promise (resolve, reject) =>
      @db.run "UPDATE inventions SET status = ? WHERE id = ? AND companyId = ?", [status, inventionId, companyId], (err, row) ->
        return reject(err) if err
        resolve(inventionId)

  updateProgress: (companyId, inventionId, progress) ->
    new Promise (resolve, reject) =>
      @db.run "UPDATE inventions SET progress = ? WHERE id = ? AND companyId = ?", [progress, inventionId, companyId], (err, row) ->
        return reject(err) if err
        resolve(inventionId)

  delete: (companyId, inventionId) ->
    new Promise (resolve, reject) =>
      @db.run "DELETE FROM inventions WHERE id = ? AND companyId = ?", [inventionId, companyId], (err, row) ->
        return reject(err) if err
        resolve(inventionId)
