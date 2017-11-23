'use strict'
const log = require('../log')
const querystring = require('querystring')
const rp = require('request-promise')
const settings = require('../configuration').server
const CanvasApi = require('kth-canvas-api')
const csv = require('./csvFile')
const ldap = require('./ldap')

const canvasApiUrl = `https://${settings.canvas.host}/api/v1`

function exportResults (req, res) {
  try {
    let b = req.body
    log.info(`The user ${b.lis_person_sourcedid}, ${b.custom_canvas_user_login_id}, is exporting the course ${b.context_label} with id ${b.custom_canvas_course_id}`)
    let courseRound = b.lis_course_offering_sourcedid
    const canvasCourseId = b.custom_canvas_course_id
    const fullUrl = (settings.proxyBase || (req.protocol + '://' + req.get('host'))) + req.originalUrl
    const nextUrl = fullUrl + '2?' + querystring.stringify({courseRound, canvasCourseId})
    log.info('Tell auth to redirect back to', nextUrl)
    log.info('using canvas client id', settings.canvas.clientId)
    const basicUrl = `https://${settings.canvas.host}/login/oauth2/auth?` + querystring.stringify({client_id: settings.canvas.clientId, response_type: 'code', redirect_uri: nextUrl})
    res.redirect(basicUrl)
  } catch (e) {
    log.error('Export failed:', e)
    res.status(500).send('Trasigt')
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
      code
    },
    json: true
  })
  return auth.access_token
}

async function getAssignmentIdsAndHeaders ({canvasApi, canvasCourseId}) {
  const assignmentIds = []
  const headers = {}

  const assignments = await canvasApi.recursePages(`${canvasApiUrl}/courses/${canvasCourseId}/assignments`)

  for (let t of assignments) {
    const id = '' + t.id
    assignmentIds.push(id)
    headers[id] = `${t.name} (${t.id})`
  }
  return {assignmentIds, headers}
}

async function createSubmissionLine ({student, ldapClient, assignmentIds}) {
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

  for (let submission of student.submissions) {
    row['' + submission.assignment_id] = submission.entered_grade || ''
  }
  return [
    student.sis_user_id || '',
    student.user_id || '',
    row['givenName'] || '',
    row['surname'] || '',
    `="${row['personnummer'] || ''}"`
  ].concat(assignmentIds.map(id => row[id] || '-'))
}
//
function exportResults2 (req, res) {
  res.sendFile(path.join(__dirname+'/export2.html'));
  // try {
  //   // Hack to make Canvas see that the auth is finished and the
  //   // 'please wait' text can be removed
  //   res.send(`
  // Your download should start automatically. If nothing happens within a few minutes, please go back and try again.
  //
  // <script>
  //   // var xhr = new XMLHttpRequest();
  //   // xhr.open('GET', 'exportResults3${req._parsedUrl.search}', true);
  //   // xhr.responseType = 'blob';
  //   //
  //   // xhr.onload = function(e) {
  //   //   if (this.status == 200) {
  //   //     // Note: .response instead of .responseText
  //   //     var a = document.createElement('a')
  //   //     document.body.appendChild(a)
  //   //     a.style = 'display: none'
  //   //
  //   //     var blob = new Blob([this.response], {type: 'text/csv'});
  //   //     console.log('wow, got the file! Now: save it')
  //   //
  //   //     url = window.URL.createObjectURL(blob)
  //   //     a.href = url
  //   //     a.download = 'canvas-results.csv'
  //   //     a.click()
  //   //     window.URL.revokeObjectURL(url)
  //   //     document.location='done'
  //   //   }
  //   // };
  //   //
  //   // xhr.send();
  //   document.location='exportResults3${req._parsedUrl.search}'
  // </script>
  //     `)
  //   // res.redirect('download' + req._parsedUrl.search)
  // } catch (e) {
  //   log.error('Export failed:', e)
  //   res.status(500).send('Trasigt')
  // }
}

function exportDone (req, res) {
  res.send('Done. The file should now be downloaded to your computer.')
}

async function exportResults3 (req, res) {
  try {
    const courseRound = req.query.courseRound
    const canvasCourseId = req.query.canvasCourseId
    log.info(`Should export for ${courseRound} / ${canvasCourseId}`)
    const ldapClient = await ldap.getBoundClient()
    const accessToken = await getAccessToken({
      clientId: settings.canvas.clientId,
      clientSecret: settings.canvas.clientSecret,
      redirectUri: req.protocol + '://' + req.get('host') + req.originalUrl,
      code: req.query.code
    })

    const canvasApi = new CanvasApi(canvasApiUrl, accessToken)
    const students = await canvasApi.requestCanvas(`courses/${canvasCourseId}/students/submissions?grouped=1&student_ids[]=all`)

    // const users = await canvasApi.recursePages(`${canvasApiUrl}/courses/${canvasCourseId}/users`)
    // console.log('users: ', users)
    // So far so good, start constructing the output
    const {assignmentIds, headers} = await getAssignmentIdsAndHeaders({canvasApi, canvasCourseId})
    const csvHeader = ['SIS User ID', 'ID', 'Name', 'Surname', 'Personnummer'].concat(assignmentIds.map(id => headers[id]))

    res.set({
      'content-type': 'text/csv; charset=utf-8',
      'location': 'http://www.kth.se'
    })
    res.attachment(`${courseRound || 'canvas'}-results.csv`)

    // Write BOM https://sv.wikipedia.org/wiki/Byte_order_mark
    res.write('\uFEFF')

    res.write(csv.createLine(csvHeader))
    for (let student of students) {
      log.info('stundent', student)
      const csvLine = await createSubmissionLine({student, ldapClient, assignmentIds})
      res.write(csv.createLine(csvLine))
    }
    res.send()
  } catch (e) {
    log.error(`Export failed for query ${req.query}:`, e)
    res.status(500).send('Trasigt')
  }
}

module.exports = {
  // Do not remove the System controller!
  System: require('./systemCtrl'),

  exportResults,
  exportResults2,
  exportResults3,
  exportDone
}
