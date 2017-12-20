'use strict'
const server = require('kth-node-server')
// Now read the server config etc.
const config = require('./configuration').server

// Expose the server and paths
// server.locals.secret = new Map()
module.exports = server

/* *******************************
 * ******* REQUEST PARSING *******
 * *******************************
 */
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({ extended: true }))
server.use(cookieParser())

/* **********************************
 * ******* APPLICATION ROUTES *******
 * **********************************
 */

const { exportResults, exportResults2, exportResults3, exportDone } = require('./export')
const {monitor, about, paths, robotsTxt} = require('./controllers/systemCtrl')
const prefix = config.proxyPrefixPath.uri

server.get(prefix + '/_monitor', monitor)
server.get(prefix + '/_about', about)
server.get(prefix + '/_paths', paths)
server.get('/robots.txt', robotsTxt)

server.get(prefix, (req, res) => res.redirect(`${config.proxyPrefixPath.uri}/_about`))

server.post(prefix + '/export', exportResults)
server.get(prefix + '/export2', exportResults2)
server.get(prefix + '/exportResults3', exportResults3)
server.get(prefix + '/done', exportDone)

// Temp route
server.get(config.proxyPrefixPath.uri + '/test', (req, res) => res.send(`
  <html>
  TODO: Detta är bara en testsida för att kunna testa hela oath2-flödet i prod. Så fort som produktion funkar ska denna route tas bort.
  <form method="post" action="export">
    <input autofocus name="custom_canvas_course_id" value="2080"></input>
  </form>
  </html>
  `))

// Catch not found and errors

module.exports = server
