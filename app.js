require('dotenv').config()
const server = require('./server/server')
const log = require('./server/log')

log.info('canvas client id:', process.env.CANVAS_CLIENT_ID)

module.exports = server.start({
  useSsl: false,
  port: process.env.SERVER_PORT || process.env.PORT || 3001,
  logger: log
})
