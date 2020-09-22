HttpServer = require('../core/http-server')

server = new HttpServer()
server.start()

process.on('SIGINT', -> server.stop())
