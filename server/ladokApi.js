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
 * Get the structure of a course round (kurstillfälle)
 * @see {@link https://www.integrationstest.ladok.se/restdoc/resultat.html#h%C3%A4mtaIng%C3%A5endeMomentF%C3%B6rKurstillf%C3%A4lle}
 */
function getKurstillfalleStructure(kurstillfalleUID) {
  return gotClient
    .get(`resultat/kurstillfalle/${kurstillfalleUID}/moment`)
    .then((response) => response.body);
}
/**
 * Get all Studieresultat given some filters
 *
 * @see {@link https://www.integrationstest.ladok.se/restdoc/resultat.html#s%C3%B6kStudieresultatF%C3%B6rRapporteringMedRequestbody} for documentation
 * when type is "utbildningsinstans" and
 * @see {@link https://www.integrationstest.ladok.se/restdoc/resultat.html#s%C3%B6kStudieresultatAttRapporteraP%C3%A5Aktivitetstillf%C3%A4lleMedRequestbody} for documentation
 * when type is "aktivitetstillfalle"
 */
function searchStudieresultat(UID = "", KurstillfallenUID = [], page = 1) {
  return gotClient
    .put(`resultat/studieresultat/rapportera/utbildningsinstans/${UID}/sok`, {
      json: {
        Filtrering: ["OBEHANDLADE", "UTKAST", "KLARMARKERADE", "ATTESTERADE"],
        KurstillfallenUID,
        // NOTE: OrderBy MUST be included always.
        // Otherwise the pagination will be broken because Ladok does not sort
        // things consistently by default
        OrderBy: ["PERSONNUMMER_ASC"],
        Page: page,
      },
    })
    .then((r) => r.body);
}

async function _searchAllStudieresultat(UID, KurstillfallenUID) {
  let page = 1;
  const allResults = [];
  const result = await searchStudieresultat(UID, KurstillfallenUID, page);
  allResults.push(...result.Resultat);

  while (result.TotaltAntalPoster > allResults.length) {
    page++;
    // eslint-disable-next-line no-await-in-loop, no-shadow
    const result = await searchStudieresultat(UID, KurstillfallenUID, page);
    allResults.push(...result.Resultat);
  }

  return allResults;
}

/** Given a list of kurstillfalle UID, get a map of student IDs and their personal number */
async function getStudentData(kurstillfalleIds) {
  // Get all "Utbildningsinstans"
  const mapWithPersonalInformation = new Map();
  const utbildningsinstansUIDs = new Set();

  for (const kurstillfalleId of kurstillfalleIds) {
    utbildningsinstansUIDs.add(
      await getKurstillfalleStructure(kurstillfalleId).then(
        (kurstillfalle) => kurstillfalle.UtbildningsinstansUID
      )
    );
  }

  // For each utbildningsinstans, get all results
  for (const utbildningsinstansUID of utbildningsinstansUIDs) {
    const studieresultat = await _searchAllStudieresultat(
      utbildningsinstansUID,
      kurstillfalleIds
    );

    for (const s of studieresultat) {
      mapWithPersonalInformation.set(s.Student.Uid, {
        personnummer: s.Student.Personnummer,
        givenName: s.Student.Fornamn,
        surname: s.student.Efternamn,
      });
    }
  }

  return mapWithPersonalInformation;
}

module.exports = class LadokApi {
  /** Prepares a Ladok Client to get students given a list of course rounds */
  constructor(kurstillfalleIds) {
    this.kurstillfalleIds = kurstillfalleIds;
    this.personalInformation = null;
  }

  /** Return the personal number given a Ladok ID of a student */
  async getPersonalInformation(studentUid) {
    if (!this.personalInformation) {
      this.personalInformation = await getStudentData(this.kurstillfalleIds);
    }

    return this.personalInformation.get(studentUid);
  }
};
