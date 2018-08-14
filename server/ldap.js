const defaultLog = require('./log')
const ldap = require('ldapjs')
const settings = require('../config/serverSettings')

function getBoundClient ({log = defaultLog} = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      url: settings.ldap.url,
      timeout: 1000,
      connectTimeout: 10000,
      log
    }

    const username = settings.ldap.userName
    const password = settings.ldap.password

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

function lookupUser (ldapClient, kthid, {log = defaultLog} = {}) {
  return new Promise((resolve, reject) => {
    ldapClient.search(
      settings.ldap.base,
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
          res.on('searchEntry', ({object}) => { user = object })
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
