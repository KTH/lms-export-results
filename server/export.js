"use strict";
const defaultLog = require("./log");
const querystring = require("querystring");
const { getSubmissions } = require("./submissions");
const got = require("got");
const CanvasApi = require("kth-canvas-api");
const csv = require("./csvFile");
const ldap = require("./ldap");
const moment = require("moment");
const _ = require("lodash");
const canvasHost = process.env.CANVAS_HOST || "kth.test.instructure.com";
const canvasApiUrl = `https://${canvasHost}/api/v1`;
const isAllowed = require("./isAllowed");

function exportResults(req, res) {
  const correlationId = req.id;
  const log = (req.log || defaultLog).child({ correlation_id: correlationId });

  try {
    const b = req.body;
    log.info(
      `The user ${b.lis_person_sourcedid}, ${b.custom_canvas_user_login_id}, is exporting the course ${b.context_label} with id ${b.custom_canvas_course_id}`
    );

    const courseRound = b.lis_course_offering_sourcedid;
    const canvasCourseId = b.custom_canvas_course_id;
    const fullUrl =
      (process.env.PROXY_BASE || req.protocol + "://" + req.get("host")) +
      req.originalUrl;
    const nextUrl =
      fullUrl +
      "2?" +
      querystring.stringify({ courseRound, canvasCourseId, correlationId });
    log.info("Tell auth to redirect back to", nextUrl);
    log.info("using canvas client id", process.env.CANVAS_CLIENT_ID);
    const basicUrl =
      `https://${canvasHost}/login/oauth2/auth?` +
      querystring.stringify({
        client_id: process.env.CANVAS_CLIENT_ID,
        response_type: "code",
        redirect_uri: nextUrl,
        scope: [
          "url:GET|/api/v1/courses/:course_id/assignments",
          "url:GET|/api/v1/courses/:course_id/custom_gradebook_columns",
          "url:GET|/api/v1/courses/:course_id/custom_gradebook_columns/:id/data",
          "url:GET|/api/v1/courses/:course_id/users",
          "url:GET|/api/v1/courses/:course_id/students/submissions",
          "url:GET|/api/v1/sections/:id",
        ].join(" "),
      });
    res.redirect(basicUrl);
  } catch (e) {
    log.error("Export failed:", e);
    res.status(500)
      .send(`<link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
    <div aria-live="polite" role="alert" class="alert alert-danger">Something has gone wrong, try again later.</div>`);
  }
}

async function getAccessToken({ clientId, clientSecret, redirectUri, code }) {
  const { body } = await got({
    method: "POST",
    url: `https://${canvasHost}/login/oauth2/token`,
    body: {
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code,
    },
    json: true,
  });
  return body.access_token;
}

async function getAssignmentIdsAndHeaders({ canvasApi, canvasCourseId }) {
  const assignmentIds = [];
  const headers = {};

  const assignments = await canvasApi.get(
    `/courses/${canvasCourseId}/assignments`
  );

  for (const t of assignments) {
    const id = "" + t.id;
    assignmentIds.push(id);
    headers[id] = `${t.name} (${t.id})`;
  }
  return { assignmentIds, headers };
}

async function createFixedColumnsContent(
  { student, ldapClient, section, canvasUser },
  { log = defaultLog } = {}
) {
  let row;
  try {
    const ugUser = await ldap.lookupUser(ldapClient, student.sis_user_id);
    const personnummer = ugUser.norEduPersonNIN;
    row = {
      kthid: student.sis_user_id,
      givenName: ugUser.givenName,
      surname: ugUser.sn,
      personnummer:
        personnummer &&
        (personnummer.length === 12 ? personnummer.slice(2) : personnummer),
    };
  } catch (err) {
    log.error(
      `An error occured while trying to find user ${student.sis_user_id} in ldap`,
      err
    );
    log.info("No user from ldap, use empty row instead");
    row = {};
  }

  return [
    student.sis_user_id || "",
    student.user_id || "",
    student.section_names || "",
    row.givenName || (canvasUser && canvasUser.name) || "", // Prefer name from ldap, but if it doesn't exist, use the name in Canvas.
    row.surname || "",
    `="${row.personnummer || ""}"`,
    (canvasUser && canvasUser.login_id) ||
      "Not displaying email for users that hasn't accepted invitation to course.",
  ];
}

function createCustomColumnsContent({ customColumnsData, customColumns }) {
  const sortedCustomColumns = _.orderBy(customColumns, ["position"], ["asc"]);
  return sortedCustomColumns.map(
    (customColumn) => customColumnsData[customColumn.id] || ""
  );
}

function createSubmissionLineContent({ student, assignmentIds }) {
  const row = {};
  for (const submission of student.submissions) {
    row["" + submission.assignment_id] = {
      grade: submission.entered_grade || "",
      submitted_at: submission.submitted_at || "",
    };
  }

  return _.flatten(
    assignmentIds.map((id) => {
      const submission = row["" + id] || { grade: "-", submitted_at: "-" };
      return [submission.submitted_at, submission.grade];
    })
  );
}

async function createCsvLineContent(
  {
    student,
    ldapClient,
    assignmentIds,
    canvasUser,
    customColumns,
    customColumnsData,
  },
  { log = defaultLog } = {}
) {
  const fixedColumnsContent = await createFixedColumnsContent(
    { student, ldapClient, assignmentIds, canvasUser },
    { log }
  );
  const customColumnsContent = createCustomColumnsContent({
    customColumnsData,
    customColumns,
  });
  const assignmentsColumnsContent = createSubmissionLineContent({
    student,
    ldapClient,
    assignmentIds,
    canvasUser,
  });

  return [
    ...fixedColumnsContent,
    ...customColumnsContent,
    ...assignmentsColumnsContent,
  ];
}

function exportResults2(req, res) {
  const correlationId = req.query.correlationId || req.id;
  const log = (req.log || defaultLog).child({ correlation_id: correlationId });

  const errorHtml = (message) => `
    <link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
    <div aria-live="polite" role="alert" class="alert alert-danger">${message}</div>
  `;

  if (!req.query || !req.query.canvasCourseId) {
    log.warn(
      "/export2 accessed with missing parameters. Ignoring the request..."
    );
    res
      .status(400)
      .send(
        errorHtml(
          "The URL you are accessing needs extra parameters, please check it. If you came here by a link, inform us about this error."
        )
      );
    return;
  }

  if (req.query.error) {
    if (req.query.error === "access_denied") {
      log.warn(
        "/export2 accessed without giving permission. Ignoring the request..."
      );
      res
        .status(400)
        .send(
          errorHtml("Access denied. You need to authorize this app to use it")
        );
      return;
    }

    log.error(
      `/export2 accessed with an unexpected "error" parameter which value is: ${req.query.error}. Ignoring the request...`
    );
    res.status(400).send(errorHtml("An error ocurred. Please try it later"));
    return;
  }

  if (!req.query.code) {
    log.warn(
      "/export2 accessed without authorization code. Ignoring the request..."
    );
    res
      .status(400)
      .send(
        errorHtml("Access denied. You need to authorize this app to use it")
      );
    return;
  }

  try {
    // Hack to make Canvas see that the auth is finished and the
    // 'please wait' text can be removed
    res.send(`
    <link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
    <div aria-live="polite" role="alert" class="alert alert-info">Your download should start automatically. If nothing happens within a few minutes, please go back and try again.</div>
    <script>document.location='exportResults3${req._parsedUrl.search}'</script>
      `);
  } catch (e) {
    log.error("Export failed:", e);
    res.status(500)
      .send(`<link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
    <div aria-live="polite" role="alert" class="alert alert-danger">Something has gone wrong, try it later.</div>`);
  }
}

function exportDone(req, res) {
  res.send(`<link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
  <div aria-live="polite" role="alert" class="alert alert-success">Done. The file should now be downloaded to your computer.</div>`);
}

async function getCustomColumnsFn({ canvasApi, canvasCourseId, canvasApiUrl }) {
  const customColumnsData = {};
  const customColumns = await canvasApi.get(
    `/courses/${canvasCourseId}/custom_gradebook_columns`
  );
  for (const customColumn of customColumns) {
    const data = await canvasApi.get(
      `/courses/${canvasCourseId}/custom_gradebook_columns/${customColumn.id}/data`
    );
    for (const dataEntry of data) {
      customColumnsData[dataEntry.user_id] =
        customColumnsData[dataEntry.user_id] || {};
      customColumnsData[dataEntry.user_id][customColumn.id] = dataEntry.content;
    }
  }
  return {
    customColumns,
    getCustomColumnsData(userId) {
      return customColumnsData[userId] || {};
    },
  };
}

function getCustomColumnHeaders(customColumns) {
  return _.orderBy(customColumns, ["position"], ["asc"]).map((c) => c.title);
}

async function exportResults3(req, res) {
  req.setTimeout && req.setTimeout(10 * 60 * 1000);
  const correlationId = req.query.correlationId || req.id;
  const courseRound = req.query.courseRound;
  const fileName = `${courseRound || "canvas"}-${moment().format(
    "YYYYMMDD-HHMMSS"
  )}-results.csv`;
  const log = (req.log || defaultLog).child({
    fileName,
    correlation_id: correlationId,
  });

  const canvasCourseId = req.query.canvasCourseId;
  log.info(`Should export for ${courseRound} / ${canvasCourseId}`);

  let accessToken;
  const aggregatedData = [];

  try {
    accessToken = await getAccessToken({
      clientId: process.env.CANVAS_CLIENT_ID,
      clientSecret: process.env.CANVAS_CLIENT_SECRET,
      redirectUri: req.protocol + "://" + req.get("host") + req.originalUrl,
      code: req.query.code,
    });
  } catch (e) {
    log.warn("The access token cannot be retrieved from Canvas", e);
    res.status(400)
      .send(`<link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
      <div aria-live="polite" role="alert" class="alert alert-danger">
        <h3>Access denied</h3>
        <p>You should launch this application from a Canvas course</p>
        <ul>
          <li>If you have refreshed the browser, close the window or tab and launch it again from Canvas</li>
        </ul>
      </div>
    `);
    // return to prevent the rest of this function to run
    return;
  }

  try {
    const canvasApi = new CanvasApi(canvasApiUrl, accessToken);
    canvasApi.logger = log;

    const allowed = await isAllowed(canvasApi, canvasCourseId);
    if (!allowed) {
      log.warn(
        "Export only allowed for teachers, course responsible and examiners."
      );
      res.status(403)
        .send(`<link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
      <div aria-live="polite" role="alert" class="alert alert-danger">Only examiners, course responsible and teachers are allowed to export results.</div>`);
      return;
    }

    // Start writing response as soon as possible
    res.set({
      "content-type": "text/csv; charset=utf-8",
      location: "http://www.kth.se",
    });
    res.attachment(fileName);
    // Write BOM https://sv.wikipedia.org/wiki/Byte_order_mark
    res.write("\uFEFF");

    // So far so good, start constructing the output
    const { assignmentIds, headers } = await getAssignmentIdsAndHeaders({
      canvasApi,
      canvasCourseId,
    });
    const { getCustomColumnsData, customColumns } = await getCustomColumnsFn({
      canvasApi,
      canvasCourseId,
      canvasApiUrl,
    });
    const fixedColumnHeaders = [
      "SIS User ID",
      "ID",
      "Section",
      "Name",
      "Surname",
      "Personnummer",
      "Email address",
    ];

    // Note that the order of these columns has to match that returned from the 'createCsvLineContent' function
    const csvHeader = [
      ...fixedColumnHeaders,
      ...getCustomColumnHeaders(customColumns),
      ..._.flatten(
        assignmentIds.map((id) => [
          headers[id] + " - submission date",
          headers[id] + " - grade",
        ])
      ),
    ];
    res.write(csv.createLine(csvHeader));

    const usersInCourse = await canvasApi.get(
      `courses/${canvasCourseId}/users?enrollment_type[]=student&per_page=100`
    );

    const sections = await canvasApi.get(
      `courses/${canvasCourseId}/sections?include[]=students`
    );
    const students = await getSubmissions({
      canvasCourseId,
      sections,
      canvasApi,
      log,
    });

    for (const student of students) {
      let ldapClient;
      try {
        ldapClient = await ldap.getBoundClient({ log });
        const canvasUser = usersInCourse.find((u) => u.id === student.user_id);
        const customColumnsData = getCustomColumnsData(student.user_id);
        const csvLine = await createCsvLineContent(
          {
            student,
            ldapClient,
            assignmentIds,
            canvasUser,
            customColumns,
            customColumnsData,
          },
          {
            log,
          }
        );
        const csvString = csv.createLine(csvLine);
        aggregatedData.push(csvString);
        res.write(csvString);
      } catch (e) {
        log.error("Export failed: ", e);
        // Instead of writing a status:500, write an error in the file. Otherwise the browser will think that the download is finished.
        res.write(
          "An error occured when exporting a student. Something is probably missing in this file."
        );
      } finally {
        await ldapClient.unbind();
      }
    }
  } catch (e) {
    log.error("Export failed for query: ", req.query, e);
    // Instead of writing a status:500, write an error in the file. Otherwise the browser will think that the download is finished.
    res.write(
      "An error occured when exporting. Something is probably missing in this file."
    );
  }

  log.info("Finish the response and close ldap client.");
  res.send();
}

module.exports = {
  exportResults,
  exportResults2,
  exportResults3,
  exportDone,
};
