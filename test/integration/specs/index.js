const test = require('tape')
require('dotenv').config({path: 'test/.env'})

var webdriverio = require('webdriverio')
var options = {
  desiredCapabilities: {
    browserName: 'firefox'
  }
}

test(`should write a file
    with personnummer and name for the student
    if there's one assignment with one submission in the course`, async t => {
  webdriverio
          .remote(options)
          .init()
          .url('https://kth.test.instructure.com/login/canvas')
          .setValue('#pseudonym_session_unique_id',process.env.CANVAS_TESTUSER_USERNAME)
          .setValue('#pseudonym_session_password',process.env.CANVAS_TESTUSER_PASSWORD)
          .end()
          .catch(function (err) {
            console.log(err)
          })

  t.end()
})
