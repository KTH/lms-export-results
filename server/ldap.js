const util = require('util')
const defaultLog = require('./log')
const ldap = require('ldapjs')
const settings = require('../config/serverSettings')

async function getBoundClient ({log = defaultLog} = {}) {
  log.info('Should get ldap client for', settings.ldap.userName, 'on', settings.ldap.url)
  const ldapClient = ldap.createClient({
    url: settings.ldap.url
  })
  const ldapClientBindAsync = util.promisify(ldapClient.bind).bind(ldapClient)
  await ldapClientBindAsync(settings.ldap.userName, settings.ldap.password)
  return ldapClient
}

function lookupUser (ldapClient, kthid, {log = defaultLog} = {}) {
  return new Promise((resolve, reject) => {
    ldapClient.search(settings.ldap.base,
      {
        scope: 'sub',
        filter: `(ugKthId=${kthid})`,
        timeLimit: 10,
        paging: true,
        attributes: ['givenName', 'Sn', 'ugLadok3StudentUid'],
        paged: {
          pageSize: 1000,
          pagePause: false
        }
      }, (err, res) => {
        if (err) {
          log.debug('Got error from ldap search:', err)
          reject(err)
          return
        }
        let user
        res.on('searchEntry', ({object}) => { user = object })
        res.on('end', () => resolve(user || {}))
        res.on('error', reject)
      }
    )
  })
}

module.exports = {
  getBoundClient,
  lookupUser
}
