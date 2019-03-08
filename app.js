require('dotenv').config()

const config = require('./config/serverSettings')
const server = require('./server/server')
const log = require('./server/log')

log.info('canvas client id:', config.canvas.clientId)

module.exports = server.start({
  useSsl: false,
  port: config.port,
  logger: log
})
