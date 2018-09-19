const express = require('express')
const router = express.Router()
const { URL, URLSearchParams } = require('url')

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
router.get('/start', (req, res) => {
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
    const downloadUrl = new URL(routerUrl + '/download')
    downloadUrl.search = new URLSearchParams({
      course_round: b.lis_course_offering_sourcedid,
      canvas_course_id: b.custom_canvas_course_id,
      correlation_id: correlationId
    })

    const canvasAuthUrl = new URL(`https://${settings.canvas.host}/login/oauth2/auth`)
    canvasAuthUrl.search = new URLSearchParams({
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

router.get('/download', (req, res) => {
  res.status(501).send('Nothing implemented')
})

router.get('/file', (req, res) => {
  res.status(501).send('Nothing implemented')
})

module.exports = router
