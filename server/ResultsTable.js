const CanvasApi = require("kth-canvas-api");
const got = require("got");
const ldap = require("./ldap");

const flattenReducer = (acc, el) => [...acc, ...el];

module.exports.create = async function createResultsFile(courseId, options) {
  const { log } = options;

  let accessToken;

  try {
    const { body } = await got({
      method: "POST",
      url: `https://${process.env.CANVAS_HOST}/login/oauth2/token`,
      body: {
        grant_type: "authorization_code",
        client_id: process.env.CANVAS_CLIENT_ID,
        client_secret: process.env.CANVAS_CLIENT_SECRET,
        redirect_uri: options.oauth.redirectUri,
        code: options.oauth.code,
      },
      json: true,
    });

    accessToken = body.access_token;
  } catch (e) {
    log.warn("The access token cannot be retrieved from Canvas", e);
    throw e;
  }

  // From here, the "createResultsFile" function (this function) should finish
  // as early as possible not awaiting for slow promises
  const canvasApi = new CanvasApi(
    `https://${process.env.CANVAS_HOST}/api/v1`,
    accessToken
  );
  const sectionsCache = {};
  const customColumnsCache = {};
  let assignments;
  let customColumns;
  let canvasUsers;
  let fakeStudents;

  async function getSection(sectionId) {
    if (!sectionsCache[sectionId]) {
      sectionsCache[sectionId] = await canvasApi.requestUrl(
        `sections/${sectionId}`
      );
    }
    return sectionsCache[sectionId];
  }

  function getCustomColumnsData(userId) {
    return customColumnsCache[userId] || [];
  }

  const isReal = (student) =>
    !fakeStudents.find((fake) => fake.id === student.id);

  function sortSubmissions(submissions) {
    const result = [];
    for (const assignment of assignments) {
      const submission = submissions.find(
        (s) => s.assignment_id === assignment.id
      );
      result.push(submission);
    }
    return result;
  }

  return {
    async preload() {
      assignments = await canvasApi.get(`courses/${courseId}/assignments`);
      canvasUsers = await canvasApi.get(
        `courses/${courseId}/users?enrollment_type[]=student&per_page=100`
      );

      fakeStudents = await canvasApi.get(
        `courses/${courseId}/users?enrollment_type[]=student_view`
      );

      customColumns = (
        await canvasApi.get(`courses/${courseId}/custom_gradebook_columns`)
      ).sort((c1, c2) => c1.position - c2.position); // Sort by "position" in "ascending" order

      for (const column of customColumns) {
        // eslint-disable-next-line no-await-in-loop
        const data = await canvasApi.get(
          `courses/${courseId}/custom_gradebook_columns/${column.id}/data`
        );
        for (const d of data) {
          if (!customColumnsCache[d.user_id]) {
            customColumnsCache[d.user_id] = [];
          }
          customColumnsCache[d.user_id].push(d.content);
        }
      }
    },

    getHeaders() {
      const fixedHeaders = [
        "SIS User ID",
        "ID",
        "Section",
        "Name",
        "Surname",
        "Personnummer",
        "Email address",
      ];

      const assignmentsHeaders = assignments
        .map((a) => [
          `${a.name} (${a.id}) - submission date`,
          `${a.name} (${a.id}) - grade`,
        ])
        .reduce(flattenReducer, []);

      const customColumnsHeaders = customColumns.map((column) => column.title);

      return [...fixedHeaders, ...customColumnsHeaders, ...assignmentsHeaders];
    },

    async iterateRows(callback) {
      const ldapClient = await ldap.getBoundClient({ log });

      await canvasApi.get(
        `/courses/${courseId}/students/submissions?grouped=1&student_ids[]=all`,
        async (students) => {
          const realStudents = students.filter(isReal);

          for (const student of realStudents) {
            try {
              // eslint-disable-next-line no-await-in-loop
              const section = await getSection(student.section_id);
              const canvasUser = canvasUsers.find(
                (cu) => cu.id === student.user_id
              );
              const ldapUser =
                // eslint-disable-next-line no-await-in-loop
                (await ldap.lookupUser(ldapClient, student.sis_user_id)) || {};

              const fixedData = [
                student.sis_user_id || "",
                student.user_id || "",
                section.name || "",
                ldapUser.givenName || (canvasUser && canvasUser.name) || "",
                ldapUser.sn || "",
                `="${ldapUser.personnummer || ""}"`,
                (canvasUser && canvasUser.login_id) ||
                  "Not displaying email for users that hasn't accepted invitation to course",
              ];

              const assignmentsData = sortSubmissions(student.submissions)
                .map((submission) => [
                  (submission && submission.submitted_at) || "",
                  (submission && submission.entered_grade) || "",
                ])
                .reduce(flattenReducer, []);

              // eslint-disable-next-line no-await-in-loop
              const customColumnsData = await getCustomColumnsData(
                student.user_id
              );
              /* eslint-disable */
              callback([
                ...fixedData,
                ...customColumnsData,
                ...assignmentsData, // TODO: Replace with array.prototype.flatten() when Node 10!!
              ]);
              /* eslint-enable */
            } catch (e) {
              log.error("Error. Export failed", e);
            }
          }
        }
      );

      await ldapClient.unbind((err) => {
        if (err) {
          log.error("An error occured when unbinding ldap client");
          log.error(err);
        }
      });
    },
  };
};
