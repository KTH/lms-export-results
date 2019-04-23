const defaultLog = require('./log')
const ldap = require('ldapjs')

function getBoundClient ({ log = defaultLog } = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      url: process.env.LDAP_URL || 'ldaps://ldap.referens.sys.kth.se',
      timeout: 10000,
      connectTimeout: 10000,
      log
    }

    const username = process.env.LDAP_USERNAME
    const password = process.env.LDAP_PASSWORD

    log.info('Should get ldap client for', username, 'on', options.url)
    const ldapClient = ldap.createClient(options)
    const doReject = function (e) {
      log.debug('In ldapClient rejection callback:', e)
      reject(e)
    }
    ldapClient.on('error', doReject)
    ldapClient.on('timeout', doReject)
    ldapClient.on('connectTimeout', doReject)
    ldapClient.bind(username, password, function (err) {
      if (err) {
        reject(err)
      } else {
        log.info('Created bound ldap client')
        resolve(ldapClient)
      }
    })
  })
}

function lookupUser (ldapClient, kthid, { log = defaultLog } = {}) {
  return new Promise((resolve, reject) => {
    ldapClient.search(
      process.env.LDAP_BASE || 'ou=UG,dc=referens,dc=sys.dc=kth,dc=se',
      {
        scope: 'sub',
        filter: `(ugKthId=${kthid})`,
        timeLimit: 10,
        paging: true,
        attributes: ['givenName', 'sn', 'norEduPersonNIN'],
        paged: {
          pageSize: 1000,
          pagePause: false
        }
      },
      function (err, res) {
        if (err) {
          log.debug('Got err from search:', err)
          reject(err)
        } else {
          let user
          res.on('searchEntry', ({ object }) => { user = object })
          res.on('end', () => resolve(user || {}))
          res.on('error', reject)
        }
      }
    )
  })
}

module.exports = {
  getBoundClient,
  lookupUser
}
