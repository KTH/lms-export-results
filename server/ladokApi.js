/* eslint-disable no-await-in-loop */
const got = require("got");

const gotClient = got.extend({
  prefixUrl: process.env.LADOK_API_BASEURL,
  headers: {
    Accept: "application/vnd.ladok-resultat+json",
  },
  responseType: "json",
  https: {
    pfx: Buffer.from(process.env.LADOK_API_PFX_BASE64, "base64"),
    passphrase: process.env.LADOK_API_PFX_PASSPHRASE,
  },
});

/**
 * Get the information of a student
 *
 * @see {@link https://www.integrationstest.ladok.se/restdoc/resultat.html#N77577}
 */
function getStudent(studentUID) {
  return gotClient
    .get(`resultat/student/${studentUID}`)
    .then((response) => response.body);
}

module.exports = {
  async getStudentData(studentUID) {
    const ladokStudent = await getStudent(studentUID);

    return {
      personnummer: ladokStudent.Personnummer,
      surname: ladokStudent.Efternamn,
      givenName: ladokStudent.Fornamn,
    };
  },
};
