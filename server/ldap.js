const defaultLog = require("./log");
const { Client } = require("ldapts");

async function getBoundClient({ log = defaultLog } = {}) {
  const ldapClient = new Client({
    url: process.env.LDAP_URL,
  });

  await ldapClient.bind(process.env.LDAP_USERNAME, process.env.LDAP_PASSWORD);

  return ldapClient;
}

async function lookupUser(ldapClient, kthid, { log = defaultLog } = {}) {
  const { searchEntries } = await ldapClient.search(process.env.LDAP_BASE, {
    scope: "sub",
    filter: `(ugKthId=${kthid})`,
    timeLimit: 10,
    paging: true,
    attributes: ["givenName", "sn", "norEduPersonNIN"],
    paged: {
      pageSize: 1,
      pagePause: false,
    },
  });

  return searchEntries.length > 0 ? searchEntries[0] : {};
}

module.exports = {
  getBoundClient,
  lookupUser,
};
