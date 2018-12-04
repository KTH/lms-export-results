'use strict'
const defaultLog = require('./log')
const querystring = require('querystring')
const rp = require('request-promise')
const settings = require('../config/serverSettings')
const CanvasApi = require('kth-canvas-api')
const csv = require('./csvFile')
const ldap = require('./ldap')
const moment = require('moment')
const _ = require('lodash')
const canvasApiUrl = `https://${settings.canvas.host}/api/v1`

function exportResults (req, res) {
  const correlationId = req.id
  const log = (req.log || defaultLog).child({correlation_id: correlationId})

  try {
    let b = req.body
    log.info(`The user ${b.lis_person_sourcedid}, ${b.custom_canvas_user_login_id}, is exporting the course ${b.context_label} with id ${b.custom_canvas_course_id}`)
    let courseRound = b.lis_course_offering_sourcedid
    const canvasCourseId = b.custom_canvas_course_id
    const fullUrl = (settings.proxyBase || (req.protocol + '://' + req.get('host'))) + req.originalUrl
    const nextUrl = fullUrl + '2?' + querystring.stringify({courseRound, canvasCourseId, correlationId})
    log.info('Tell auth to redirect back to', nextUrl)
    log.info('using canvas client id', settings.canvas.clientId)
    const basicUrl = `https://${settings.canvas.host}/login/oauth2/auth?` + querystring.stringify({
      client_id: settings.canvas.clientId,
      response_type: 'code',
      redirect_uri: nextUrl,
      scope: [
        'url:GET|/api/v1/courses/:course_id/assignments',
        'url:GET|/api/v1/courses/:course_id/custom_gradebook_columns',
        'url:GET|/api/v1/courses/:course_id/users',
        'url:GET|/api/v1/courses/:course_id/students/submissions',
        'url:GET|/api/v1/sections/:id'
      ].join(' ')
    })
    res.redirect(basicUrl)
  } catch (e) {
    log.error('Export failed:', e)
    res.status(500).send(`<link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
    <div aria-live="polite" role="alert" class="alert alert-danger">Smth has gone wrong, try it later.</div>`)
  }
}

async function getAccessToken ({clientId, clientSecret, redirectUri, code}) {
  const auth = await rp({
    method: 'POST',
    uri: `https://${settings.canvas.host}/login/oauth2/token`,
    body: {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code
    },
    json: true
  })
  return auth.access_token
}

async function getAssignmentIdsAndHeaders ({canvasApi, canvasCourseId}) {
  const assignmentIds = []
  const headers = {}

  const assignments = await canvasApi.get(`/courses/${canvasCourseId}/assignments`)

  for (let t of assignments) {
    const id = '' + t.id
    assignmentIds.push(id)
    headers[id] = `${t.name} (${t.id})`
  }
  return {assignmentIds, headers}
}

async function createFixedColumnsContent ({student, ldapClient, section, canvasUser}, {log = defaultLog} = {}) {
  let row
  try {
    const ugUser = await ldap.lookupUser(ldapClient, student.sis_user_id)
    row = {
      kthid: student.sis_user_id,
      givenName: ugUser.givenName,
      surname: ugUser.sn,
      personnummer: ugUser.norEduPersonNIN
    }
  } catch (err) {
    log.error('An error occured while trying to find user in ldap:', err)
    log.info('No user from ldap, use empty row instead')
    row = {}
  }

  return [
    student.sis_user_id || '',
    student.user_id || '',
    section.name || '',
    row.givenName || (canvasUser && canvasUser.name) || '', // Prefer name from ldap, but if it doesn't exist, use the name in Canvas.
    row.surname || '',
    `="${row.personnummer || ''}"`,
    (canvasUser && canvasUser.login_id) || "Not displaying email for users that hasn't accepted invitation to course."
  ]
}

function createCustomColumnsContent ({customColumnsData, customColumns}) {
  const sortedCustomColumns = _.orderBy(customColumns, ['position'], ['asc'])
  return sortedCustomColumns.map(customColumn => customColumnsData[customColumn.id] || '')
}

function createSubmissionLineContent ({student, assignmentIds}) {
  const row = {}
  for (let submission of student.submissions) {
    row['' + submission.assignment_id] = {
      grade: submission.entered_grade || '',
      submitted_at: submission.submitted_at || ''
    }
  }

  return _.flatten(assignmentIds.map(id => {
    const submission = row['' + id] || {grade: '-', submitted_at: '-'}
    return [submission.submitted_at, submission.grade]
  }))
}

async function createCsvLineContent ({student, ldapClient, assignmentIds, section, canvasUser, customColumns, customColumnsData}, {log = defaultLog} = {}) {
  const fixedColumnsContent = await createFixedColumnsContent({student, ldapClient, assignmentIds, section, canvasUser}, {log})
  const customColumnsContent = createCustomColumnsContent({customColumnsData, customColumns})
  const assignmentsColumnsContent = createSubmissionLineContent({student, ldapClient, assignmentIds, section, canvasUser})

  return [
    ...fixedColumnsContent,
    ...customColumnsContent,
    ...assignmentsColumnsContent
  ]
}

function exportResults2 (req, res) {
  const correlationId = req.query.correlationId || req.id
  const log = (req.log || defaultLog).child({correlation_id: correlationId})

  const errorHtml = (message) => `
    <link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
    <div aria-live="polite" role="alert" class="alert alert-danger">${message}</div>
  `

  if (!req.query || !req.query.canvasCourseId) {
    log.warn('/export2 accessed with missing parameters. Ignoring the request...')
    res.status(400).send(errorHtml('The URL you are accessing needs extra parameters, please check it. If you came here by a link, inform us about this error.'))
    return
  }

  if (req.query.error) {
    if (req.query.error === 'access_denied') {
      log.warn('/export2 accessed without giving permission. Ignoring the request...')
      res.status(400).send(errorHtml('Access denied. You need to authorize this app to use it'))
      return
    }

    log.error(`/export2 accessed with an unexpected "error" parameter which value is: ${req.query.error}. Ignoring the request...`)
    res.status(400).send(errorHtml('An error ocurred. Please try it later'))
    return
  }

  if (!req.query.code) {
    log.warn('/export2 accessed without authorization code. Ignoring the request...')
    res.status(400).send(errorHtml('Access denied. You need to authorize this app to use it'))
    return
  }

  try {
    // Hack to make Canvas see that the auth is finished and the
    // 'please wait' text can be removed
    res.send(`
    <link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
    <div aria-live="polite" role="alert" class="alert alert-info">Your download should start automatically. If nothing happens within a few minutes, please go back and try again.</div>
    <script>document.location='exportResults3${req._parsedUrl.search}'</script>
      `)
  } catch (e) {
    log.error('Export failed:', e)
    res.status(500).send(`<link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
    <div aria-live="polite" role="alert" class="alert alert-danger">Smth has gone wrong, try it later.</div>`)
  }
}

function exportDone (req, res) {
  res.send(`<link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
  <div aria-live="polite" role="alert" class="alert alert-success">Done. The file should now be downloaded to your computer.</div>`)
}

async function curriedIsFake ({canvasApi, canvasApiUrl, canvasCourseId}) {
  const fakeUsers = await canvasApi.get(`/courses/${canvasCourseId}/users?enrollment_type[]=student_view`)
  return function (student) {
    return fakeUsers.find(user => user.id === student.user_id)
  }
}

async function getCustomColumnsFn ({canvasApi, canvasCourseId, canvasApiUrl}) {
  const customColumnsData = {}
  const customColumns = await canvasApi.get(`/courses/${canvasCourseId}/custom_gradebook_columns`)
  for (let customColumn of customColumns) {
    const data = await canvasApi.get(`/courses/${canvasCourseId}/custom_gradebook_columns/${customColumn.id}/data`)
    for (let dataEntry of data) {
      customColumnsData[dataEntry.user_id] = customColumnsData[dataEntry.user_id] || {}
      customColumnsData[dataEntry.user_id][customColumn.id] = dataEntry.content
    }
  }
  return {
    customColumns,
    getCustomColumnsData (userId) {
      return customColumnsData[userId] || {}
    }
  }
}

function getCustomColumnHeaders (customColumns) {
  return _.orderBy(customColumns, ['position'], ['asc']).map(c => c.title)
}

function findDuplicates (data) {
  return data.reduce((accumulator, value, index, array) => {
    if (array.indexOf(value) !== index && accumulator.indexOf(value) < 0) {
      accumulator.push(value)
    }
    return accumulator
  }, [])
}

async function exportResults3 (req, res) {
  const correlationId = req.query.correlationId || req.id
  const fetchedSections = {}
  const courseRound = req.query.courseRound
  const fileName = `${courseRound || 'canvas'}-${moment().format('YYYYMMDD-HHMMSS')}-results.csv`
  const log = (req.log || defaultLog).child({fileName, correlation_id: correlationId})

  const canvasCourseId = req.query.canvasCourseId
  log.info(`Should export for ${courseRound} / ${canvasCourseId}`)

  let accessToken
  let aggregatedData = []

  try {
    accessToken = await getAccessToken({
      clientId: settings.canvas.clientId,
      clientSecret: settings.canvas.clientSecret,
      redirectUri: req.protocol + '://' + req.get('host') + req.originalUrl,
      code: req.query.code
    })
  } catch (e) {
    log.warn('The access token cannot be retrieved from Canvas', e)
    res.status(400).send(`<link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
      <div aria-live="polite" role="alert" class="alert alert-danger">
        <h3>Access denied</h3>
        <p>You should launch this application from a Canvas course</p>
        <ul>
          <li>If you have refreshed the browser, close the window or tab and launch it again from Canvas</li>
        </ul>
      </div>
    `)
    // return to prevent the rest of this function to run
    return
  }

  // Start writing response as soon as possible
  res.set({
    'content-type': 'text/csv; charset=utf-8',
    'location': 'http://www.kth.se'
  })
  res.attachment(fileName)
  // Write BOM https://sv.wikipedia.org/wiki/Byte_order_mark
  res.write('\uFEFF')

  try {
    const canvasApi = new CanvasApi(canvasApiUrl, accessToken)
    canvasApi.logger = log

    const ldapClient = await ldap.getBoundClient({log})
    ldap.logger = log

    // So far so good, start constructing the output
    const {assignmentIds, headers} = await getAssignmentIdsAndHeaders({canvasApi, canvasCourseId})
    const {getCustomColumnsData, customColumns} = await getCustomColumnsFn({canvasApi, canvasCourseId, canvasApiUrl})
    const fixedColumnHeaders = [
      'SIS User ID',
      'ID',
      'Section',
      'Name',
      'Surname',
      'Personnummer',
      'Email address']

    // Note that the order of these columns has to match that returned from the 'createCsvLineContent' function
    const csvHeader = [
      ...fixedColumnHeaders,
      ...getCustomColumnHeaders(customColumns),
      ...(_.flatten(assignmentIds.map(
        id => [headers[id] + ' - submission date', headers[id] + ' - grade']
      )))
    ]
    res.write(csv.createLine(csvHeader))

    const usersInCourse = await canvasApi.get(`courses/${canvasCourseId}/users?enrollment_type[]=student&per_page=100`)
    const isFake = await curriedIsFake({canvasApi, canvasApiUrl, canvasCourseId})
    await canvasApi.get(`courses/${canvasCourseId}/students/submissions?grouped=1&student_ids[]=all`, async students => {
      for (let student of students) {
        try {
          if (isFake(student)) {
            continue
          }
          const section = fetchedSections[student.section_id] || await canvasApi.requestUrl(`sections/${student.section_id}`)
          fetchedSections[student.section_id] = section

          const canvasUser = usersInCourse.find(u => u.id === student.user_id)
          const customColumnsData = getCustomColumnsData(student.user_id)
          const csvLine = await createCsvLineContent({
            student,
            ldapClient,
            assignmentIds,
            section,
            canvasUser,
            customColumns,
            customColumnsData
          }, {
            log
          })
          const csvString = csv.createLine(csvLine)
          aggregatedData.push(csvString)
          res.write(csvString)
        } catch (e) {
          log.error(`Export failed: `, e)
          // Instead of writing a status:500, write an error in the file. Otherwise the browser will think that the download is finished.
          res.write('An error occured when exporting a student. Something is probably missing in this file.')
        }
      }
    })
    await ldapClient.unbind()
  } catch (e) {
    log.error(`Export failed for query ${req.query}:`, e)
    // Instead of writing a status:500, write an error in the file. Otherwise the browser will think that the download is finished.
    res.write('An error occured when exporting. Something is probably missing in this file.')
  }

  log.info('Finish the response and close ldap client.')
  res.send()
  log.info(`Number if duplicated found for round ${courseRound} of course ${canvasCourseId}: ${findDuplicates(aggregatedData).length}`)
}

module.exports = {
  exportResults,
  exportResults2,
  exportResults3,
  exportDone
}
