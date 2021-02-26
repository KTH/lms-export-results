const express = require('express')
const packageFile = require('../package.json')
const defaultLog = require('./log')
const ldap = require('./ldap')
const got = require('got')
const version = require('../config/version')

const router = express.Router()

async function checkLdap ({ log }) {
  let ldapClient
  try {
    ldapClient = await ldap.getBoundClient({ log })
    const testUser = await ldap.lookupUser(ldapClient, 'u1famwov', { log })

    if (testUser.sn) {
      return {
        ok: true,
        msg: `Could lookup u1famwov (got ${testUser.givenName} ${testUser.sn})`
      }
    } else {
      return { ok: false, msg: 'failed to lookup u1famwov in ldap' }
    }
  } catch (e) {
    log.error('LDAP check failed', e)
    return { ok: false, msg: 'failed to lookup u1famwov in ldap' }
  } finally {
    if (ldapClient) {
      await ldapClient.unbind(err => {
        if (err) {
          // Only log, since these errors are not at all critical. See more: https://ldap.com/the-ldap-unbind-operation/
          log.info(
            "Couldn't unbind ldap client. This is ok since I'm only unbinding to be polite anyways.",
            err
          )
        }
      })
    }
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
  const checks = await Promise.all([checkLdap({ log })])

  res.setHeader('Content-Type', 'text/plain')
  res.send(`
APPLICATION_STATUS: ${checks.every(e => e.ok) ? 'OK' : 'ERROR'}

LDAP: ${checks[0].ok ? 'OK' : 'ERROR'} ${checks[0].msg}
  `)
}

router.get('/_monitor', _monitor)
router.get('/_about', _about)

module.exports = router
