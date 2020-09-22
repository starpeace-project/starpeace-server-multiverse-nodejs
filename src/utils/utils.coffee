
{ v4: uuidv4 } = require('uuid')

CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

module.exports = class Utils

  @randomInt: (min, max) -> Math.floor(Math.random() * (max - min + 1)) + min
  @randomString: (len) ->
    buf = []
    buf.push(CHARS[Utils.randomInt(0, CHARS.length - 1)]) for i in [0..len]
    buf.join('')

  @uuid: () -> uuidv4()
