_ = require('lodash')
fs = require('fs')
path = require('path')

module.exports = class FileUtils
  @readAllFilesSync: (dir, fileMatcher) ->
    fs.readdirSync(dir).reduce((files, file) ->
      if fs.statSync(path.join(dir, file)).isDirectory()
        files.concat(FileUtils.readAllFilesSync(path.join(dir, file), fileMatcher))
      else
        files.concat(if !fileMatcher? || fileMatcher(file) then [path.join(dir, file)] else [])
    , [])

  @parseToJson: (rootDir, whitelistPatterns, blacklistPatterns) ->
    fileMatcher = (filePath) ->
      for pattern in blacklistPatterns
        return false if filePath.endsWith(pattern)
      for pattern in whitelistPatterns
        return false unless filePath.endsWith(pattern)
      true
    _.flatten(_.map(FileUtils.readAllFilesSync(rootDir, fileMatcher), (path) -> JSON.parse(fs.readFileSync(path))))
