const test = require('tape')
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
          .url('http://www.google.com')
          .getTitle()
          .then(function (title) {
            t.equal(title, 'EMiul....')
            console.log('Title was: ' + title)
          })
          .end()
          .catch(function (err) {
            console.log(err)
          })

  t.end()
})
