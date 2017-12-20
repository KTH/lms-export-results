'use strict'

const log = require('../log')
const packageFile = require('../../package.json')
const getPaths = require('kth-node-express-routing').getPaths
const settings = require('../configuration').server
const ldap = require('../ldap')
const rp = require('request-promise')
const version = require('../../config/version')

/**
 * System controller for functions such as about and monitor.
 * Avoid making changes here in sub-projects.
 */
module.exports = {
  monitor: getMonitor,
  about: getAbout,
  robotsTxt: getRobotsTxt,
  paths: getPathsHandler,
  checkAPIKey: checkAPIKey
}

function getNameAndVersion () {
  return `${packageFile.name} ${version.dockerVersion || 'UNKNOWN'}`
}

/**
 * GET /_about
 * About page
 */
function getAbout (req, res) {
  const appName = getNameAndVersion()
  res.status(200).send(
    `<!doctype html>
<html><head><title>${appName}</title></head>
<body><h1>${appName}</h1>
<p>${packageFile.description}</p>
<p>Canvas is ${settings.canvas.host}</p>
<p>Build on ${version.jenkinsBuildDate} from git ${version.gitCommit}.</p>
<p><a href="_monitor">system status</a></p>
</body></html>
`)
}

/**
 * GET /_monitor
 * Monitor page
 */
async function getMonitor (req, res) {
  try {
    log.debug('Start preparing monitor')
    let checks = {
      // Async functions that we do not await: Promises?
      'LDAP': checkLdap(),
      'IP': checkIp()
    }
    let main = {
      'ok': true,
      'msg': getNameAndVersion()
    }
    let body = ''

    log.debug('Start collecting monitor results')
    for (let key in checks) {
      const status = await getStatus(checks[key])
      body = body + statusRow(key, status)
      main.ok &= status.ok
    }

    log.info('Done collecting monitor results', main)
    res.type('text').status(200).send(statusRow('APPLICATION_STATUS', main) + body)
  } catch (err) {
    log.error('Failed to display status page:', err)
    res.type('text').status(500).send('APPLICATION_STATUS ERROR\n')
  }
}

function statusRow (name, status) {
  return `${name}: ${status.ok ? 'OK' : 'ERROR'} ${status.msg}\n`
}

async function getStatus (resultPromise) {
  try {
    return await resultPromise
  } catch (err) {
    log.error('Check failed:', err)
    return {'ok': false, 'msg': `Error: ${err}`}
  }
}

async function checkLdap () {
  const ldapClient = await ldap.getBoundClient()
  const u1famwov = await ldap.lookupUser(ldapClient, 'u1famwov')
  if (u1famwov.sn) {
    return {
      'ok': true,
      'msg': `Could lookup u1famwov in ldap (got ${u1famwov.givenName} ${u1famwov.sn})`
    }
  } else {
    return {'ok': false, 'msg': 'ERROR Failed to lookup u1famwov in ldap'}
  }
}

async function checkIp () {
  const t = await rp({
    method: 'GET',
    uri: 'https://api.ipify.org?format=json',
    json: true
  })
  return {'ok': true, msg: t.ip}
}

/**
 * GET /robots.txt
 * Robots.txt page
 */
function getRobotsTxt (req, res) {
  res.type('text').render('system/robots')
}

/**
 * GET /_paths
 * Return all paths for the system
 */
function getPathsHandler (req, res) {
  res.json(getPaths())
}

function checkAPIKey (req, res) {
  res.end()
}
