'use strict'
// Load .env file if it exists
require('dotenv').config()

const config = require('./config/serverSettings')
const server = require('./server/server')
const log = require('./server/log')
/* ****************************
 * ******* SERVER START *******
 * ****************************
 */
log.info('canvas client id:', config.canvas.clientId)

module.exports = server.start({
  useSsl: false,
  port: config.port,
  logger: log
})
