cluster = require('cluster')

if cluster.isMaster
  require('./process/process-master')
else
  require('./process/process-http-server')
