module.exports = {
  // The proxy prefix path if the application is proxied. E.g /places
  proxyPrefixPath: {
    uri: '/api/lms-export-results'
  },
  port: process.env.SERVER_PORT || 3001,

  ldap: {
    base: process.env.LDAP_BASE || 'ou=UG,dc=ug,dc=kth,dc=se',
    url: process.env.LDAP_URL || 'ldaps://ldap.ug.kth.se',
    password: process.env.LDAP_PASSWORD,
    userName: process.env.LDAP_USERNAME
  },
  canvas: {
    host: process.env.CANVAS_HOST || 'kth.test.instructure.com',
    clientId: process.env.CANVAS_CLIENT_ID,
    clientSecret: process.env.CANVAS_CLIENT_SECRET
  },
  // Custom app settings
  proxyBase: process.env.PROXY_BASE || ''
}
