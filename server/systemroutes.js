const express = require('express')
const packageFile = require('../package.json')
const defaultLog = require('./log')
const ldap = require('./ldap')
const rp = require('request-promise')
const version = require('../config/version')

const router = express.Router()

async function checkLdap ({log}) {
  try {
    const ldapClient = await ldap.getBoundClient({log})
    const testUser = await ldap.lookupUser(ldapClient, 'u1famwov', {log})

    if (testUser.sn) {
      return {ok: true, msg: `Could lookup u1famwov (got ${testUser.givenName} ${testUser.sn})`}
    } else {
      return {ok: false, msg: 'failed to lookup u1famwov in ldap'}
    }
  } catch (e) {
    log.error('LDAP check failed', e)
    return {ok: false, msg: 'failed to lookup u1famwov in ldap'}
  }
}

async function checkIp ({log}) {
  try {
    const t = await rp({
      method: 'GET',
      uri: 'https://api.ipify.org?format=json',
      json: true
    })
    return {ok: true, msg: t.ip}
  } catch (e) {
    log.error('IP check failed', e)
    return {ok: false, msg: 'failed IP test'}
  }
}

function _about (req, res) {
  res.setHeader('Content-Type', 'text/plain')
  res.send(`
    packageFile.name:${packageFile.name}
    packageFile.version:${packageFile.version}
    packageFile.description:${packageFile.description}
    version.gitBranch:${version.gitBranch}
    version.gitCommit:${version.gitCommit}
    version.jenkinsBuild:${version.jenkinsBuild}
    version.dockerName:${version.dockerName}
    version.dockerVersion:${version.dockerVersion}
    version.jenkinsBuildDate:${version.jenkinsBuildDate}
  `)
}

async function _monitor (req, res) {
  const log = req.log || defaultLog
  const checks = await Promise.all([
    checkLdap({log}),
    checkIp({log})
  ])

  res.setHeader('Content-Type', 'text/plain')
  res.send(stripIndent`
    APPLICATION_STATUS: ${checks.every((e) => e) ? 'OK' : 'ERROR'}

    LDAP: ${checks[0].ok ? 'OK' : 'ERROR'} ${checks[0].msg}
    IP: ${checks[1].ok ? 'OK' : 'ERROR'} ${checks[1].msg}
  `)
}

router.get('/_monitor', _monitor)
router.get('/_about', _about)

module.exports = router
