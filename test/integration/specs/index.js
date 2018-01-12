const test = require('tape')
require('dotenv').config({path: 'test/.env'})
// http://webdriver.io/guide/services/firefox-profile.html
const webdriverio = require('webdriverio')
const FirefoxProfile = require('firefox-profile')


// Creating a profile. But for some reason this is not used.
const fp = new FirefoxProfile()
fp.setPreference('browser.download.folderList', 1)
fp.setPreference('browser.download.manager.showWhenStarting', true)
fp.setPreference('browser.helperApps.neverAsk.saveToDisk', 'text/csv')
fp.setPreference('browser.newtab.url', 'http://saadtazi.com')
fp.updatePreferences()

test(`should write a file
    with personnummer and name for the student
    if there's one assignment with one submission in the course`, async t => {
  fp.encoded((err, profile) =>{
    var options = {
      desiredCapabilities: {
        // pageLoadStrategy: 'eager',
        browserName: 'firefox',
        firefox_profile: profile
      }
    }

    webdriverio
            .remote(options)
            .init()
            .url('https://kth.test.instructure.com/login/canvas')
            .setValue('#pseudonym_session_unique_id', process.env.CANVAS_TESTUSER_USERNAME)
            .setValue('#pseudonym_session_password', process.env.CANVAS_TESTUSER_PASSWORD)
            .click('#login_form .Button--login')
            .url('https://kth.test.instructure.com/courses/4/external_tools/536?display=borderless')
            .click('input[type="submit"]')
            .then(() => {
              t.end()
            })
            .end()
            .catch(function (err) {
              console.log(err)
            })
  })

  t.end()
})
