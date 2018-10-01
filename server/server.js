'use strict'
const server = require('kth-node-server')
// Now read the server config etc.
const config = require('../config/serverSettings')
const prefix = config.proxyPrefixPath.uri

/* *******************************
 * *******KTH STYLE *******
 * *******************************
 */
const path = require('path')
const express = require('express')

server.use(prefix + '/kth-style', express.static(path.join(__dirname, '../node_modules/kth-style/dist')))

/* *******************************
 * ******* REQUEST PARSING *******
 * *******************************
 */
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({ extended: true }))
server.use(cookieParser())

/* *******************************
 * *** PER-REQUEST MIDDLEWARE ****
 * *******************************
 */
const uuid = require('uuid/v4')
const logger = require('./log')
server.use((req, res, next) => {
  req.id = uuid()
  req.log = logger.child({
    request_id: req.id,
    request_path: req.path
  })
  next()
})

/* **********************************
 * ******* APPLICATION ROUTES *******
 * **********************************
 */

const { exportResults, exportResults2, exportResults3, exportDone } = require('./export')
const systemroutes = require('./systemroutes')
const exportroutes = require('./exportroutes')

server.use(prefix, systemroutes)
server.use(prefix + '/v2', exportroutes)

server.get(prefix, (req, res) => res.redirect(`${config.proxyPrefixPath.uri}/_about`))

server.post(prefix + '/export', exportResults)
server.get(prefix + '/export2', exportResults2)
server.get(prefix + '/exportResults3', exportResults3)
server.get(prefix + '/done', exportDone)

// Temp route
server.get(config.proxyPrefixPath.uri + '/test', (req, res) => res.send(`
  <html>
  <link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
  <p>TODO: Detta är bara en testsida för att kunna testa hela oath2-flödet i prod. Så fort som produktion funkar ska denna route tas bort.</p>
  <form method="post" action="export">
    <input autofocus name="custom_canvas_course_id" value="2080"></input>
  </form>
  </html>
  `))

// Catch not found and errors

// Expose the server and paths
// server.locals.secret = new Map()
module.exports = server
