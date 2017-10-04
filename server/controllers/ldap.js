const Promise = require('bluebird')
const ldap = require('ldapjs')

async function getBoundClient () {
  const options = {
    url: process.env.LDAP_URL || 'ldaps://ldap.kth.se',
    timeout: 1000,
    connectTimeout: 1000
  }
  console.log('Should get ldap client for', options)
  const ldapClient = Promise.promisifyAll(ldap.createClient(options))
  console.log('Should bind to ldap')
  await ldapClient.bindAsync(process.env.LDAP_USERNAME, process.env.LDAP_PASSWORD)
  console.log('returning ldap client')
  return ldapClient
}

async function lookupUser (ldapClient, kthid) {
  const attributes = ['givenName', 'sn', 'norEduPersonNIN']
  const ldapResults = await ldapClient.searchAsync('ou=UG,dc=referens,dc=sys,dc=kth,dc=se', {
    scope: 'sub',
    filter: `(ugKthId=${kthid})`,
    timeLimit: 10,
    paging: true,
    attributes,
    paged: {
      pageSize: 1000,
      pagePause: false
    }
  })
  const ugUser = await new Promise((resolve, reject) => {
    const user = []
    ldapResults.on('searchEntry', ({object}) => user.push(object))
    ldapResults.on('end', () => resolve(user))
    ldapResults.on('error', reject)
  })
  if (ugUser.length > 0) {
    return ugUser[0]
  } else {
    return {}
  }
}

module.exports = {
  getBoundClient,
  lookupUser
}
