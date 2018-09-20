const express = require('express')
const router = express.Router()
const querystring = require('querystring')

const defaultLog = require('./log')
const settings = require('../config/serverSettings')

const errorHtml = (message) => `
  <link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
  <div aria-live="polite" role="alert" class="alert alert-danger">${message}</div>
`

const infoHtml = (message) => `
  <link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
  <div aria-live="polite" role="alert" class="alert alert-info">${message}</div>
`

// First step of Oauth.
// Redirect to Canvas endpoint "/login/oauth2/auth"
router.post('/start', (req, res) => {
  // Correlation ID is "created here" and passed through all the following
  // steps. For simplicity, we reuse req.id but it is possible to replace it
  // to a newly random generated id

  // The correlation is also passed to Canvas. Canvas will call the next step
  // WITH the correlation ID
  const correlationId = req.id || 'no "request_id" and therefore no correlation id'
  const log = (req.log || defaultLog).child({
    correlation_id: correlationId
  })

  try {
    const b = req.body
    log.info(
      `The user ${b.lis_person_sourcedid}, ${b.custom_canvas_user_login_id} wants to export the course ${b.context_label} with id ${b.custom_canvas_course_id}`
    )

    // Get the URL where the router is mounted:
    const routerUrl = req.protocol + '://' + req.get('host') + req.baseUrl

    // URL with the next step of Oauth
    const downloadUrl = routerUrl + '/download?' + querystring.stringify({
      course_round: b.lis_course_offering_sourcedid,
      canvas_course_id: b.custom_canvas_course_id,
      correlation_id: correlationId
    })

    const canvasAuthUrl = `https://${settings.canvas.host}/login/oauth2/auth?` + querystring.stringify({
      client_id: settings.canvas.clientId,
      response_type: 'code',
      redirect_uri: downloadUrl.toString(),
      scope: [
        'url:GET|/api/v1/courses/:course_id/assignments',
        'url:GET|/api/v1/courses/:course_id/custom_gradebook_columns',
        'url:GET|/api/v1/courses/:course_id/users',
        'url:GET|/api/v1/courses/:course_id/students/submissions',
        'url:GET|/api/v1/sections/:id'
      ].join(' ')
    })
    log.info('Tell auth to redirect back to', downloadUrl.toString())
    res.redirect(canvasAuthUrl)

  } catch (e) {
    log.error('Export failed on start', e)
    res.status(500).send(
      errorHtml('Something has gone wrong. Contact the IT support team')
    )
  }
})

// Second step of Oauth.
// Shows an HTML page with a message "Downloading..." and redirects to "/file" (in the frontend)
router.get('/download', (req, res) => {
  const correlationId = req.query.correlation_id || req.id
  const log = (req.log || defaultLog).child({
    coerrelation_id: correlationId
  })

  if (!req.query || !req.query.canvas_course_id) {
    log.warn('Missing parameter "canvas_course_id". Sending error message to the user')
    res.status(400).send(
      errorHtml('The page you are trying to enter is not valid. If you came here by a link, contact the IT department')
    )
    return
  }

  if (req.query.error && req.query.error === 'access_denied') {
    log.warn('The user has not authorized the tool. Sending error message to the user')
    res.status(400).send(
      errorHtml('You must authorize the app to acesss your Canvas data.')
    )
    return
  }

  if (req.query.error) {
    log.error(`Unexpected "error" parameter in the URL query: "${req.query.error}". Sending error message to the user`)
    res.status(400).send(
      errorHtml('An error ocurred. Please try again later or contact the IT department')
    )
    return
  }

  if (!req.query.code) {
    log.warn('Missing parameter "code". Sending error message to the user')
    res.status(400).send(
      errorHtml('The page you are trying to enter is not valid. If you came here by a link, contact the IT department')
    )
    return
  }

  try {
    const fileUrl = req.baseUrl + '/file?' + querystring.stringify(req.query)
    log.info('Redirecting the user to', fileUrl.toString())
    res.send(`
      <link rel="stylesheet" href="/api/lms-export-results/kth-style/css/kth-bootstrap.css">
      <div aria-live="polite" role="alert" class="alert alert-info">Your download should start automatically. If nothing happens within a few minutes, please go back and try again.</div>
      <script>document.location='${fileUrl.toString()}'</script>
    `)
  } catch (e) {
    log.error('An error when requesting to download the file', e)
    res.status(500).send(
      errorHtml('Something has gone wrong. Please contact the IT support team')
    )
  }
})


// Third step of Oauth.
// The CSV file itself
router.get('/file', (req, res) => {
  // res.status(501).send('Nothing implemented')
})

module.exports = router
