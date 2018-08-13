'use strict'

const defaultLog = require('../log')
const packageFile = require('../../package.json')
const settings = require('../../config/serverSettings')
const ldap = require('../ldap')
const rp = require('request-promise')
const version = require('../../config/version')

module.exports = {
  monitor: getMonitor,
  about: getAbout,
  robotsTxt: getRobotsTxt
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
  const log = req.log || defaultLog
  try {
    log.debug('Start preparing monitor')
    let checks = {
      // Async functions that we do not await: Promises?
      'LDAP': checkLdap({log}),
      'IP': checkIp()
    }
    let main = {
      'ok': true,
      'msg': getNameAndVersion()
    }
    let body = ''

    log.debug('Start collecting monitor results')
    for (let key in checks) {
      const status = await getStatus(checks[key], {log})
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

async function getStatus (resultPromise, {log = defaultLog} = {}) {
  try {
    return await resultPromise
  } catch (err) {
    log.error('Check failed:', err)
    return {'ok': false, 'msg': `Error: ${err}`}
  }
}

async function checkLdap ({log = defaultLog} = {}) {
  const ldapClient = await ldap.getBoundClient({log})
  const u1famwov = await ldap.lookupUser(ldapClient, 'u1famwov', {log})
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
  res.send(`
    User-agent: *
    Disallow: /`)
}
