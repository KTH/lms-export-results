const test = require('tape')
require('dotenv').config({path: 'test/.env'})

const webdriver = require('selenium-webdriver')
const By = webdriver.By
const until = webdriver.until

/*****************/
const firefox = require('selenium-webdriver/firefox')

let profile = new firefox.Profile()
// profile.addExtension('/path/to/firebug.xpi')
profile.setPreference('browser.download.folderList', 2)
profile.setPreference('browser.download.dir', '/tmp/lms-export-results')
profile.setPreference('browser.helperApps.neverAsk.saveToDisk', 'text/csv')
profile.setPreference("webdriver.load.strategy", "unstable");

console.log('todo: remove the /tmp/lms-export-results directory!')
console.log('Todo: set the page timeout to something less.')
let options = new firefox.Options().setProfile(profile)
const fs = require('fs')
/***********/

const driver = new webdriver.Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build()

test(`should write a file
    with personnummer and name for the student
    if there's one assignment with one submission in the course`, async t => {
  await driver.get('https://kth.test.instructure.com/login/canvas')

  await driver.findElement(By.id('pseudonym_session_unique_id')).sendKeys(process.env.CANVAS_TESTUSER_USERNAME)
  await driver.findElement(By.id('pseudonym_session_password')).sendKeys(process.env.CANVAS_TESTUSER_PASSWORD)
  await driver.findElement(By.className('Button--login')).click()
  await driver.get('https://kth.test.instructure.com/courses/4/external_tools/536?display=borderless')
  try {
    // driver.manage().timeouts().pageLoadTimeout(5, TimeUnit.SECONDS)
    await driver.findElement(By.css('input[type="submit"]')).click()
  } catch (e) {
    console.log('timeout. This is good, now check file content...', )
  }

  fs.readdirSync('/tmp/lms-export-results').forEach(file => {
    console.log(file)
  })
  // driver.wait(until.titleIs('webdriver - Google Search'), 1000)

  // driver.findElement(By.name('q')).sendKeys('webdriver')
  // driver.findElement(By.name('btnG')).click()
  // driver.wait(until.titleIs('webdriver - Google Search'), 1000)
  await driver.quit()

  t.end()
})
