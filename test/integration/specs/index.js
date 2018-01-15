const test = require('tape')
require('dotenv').config({path: 'test/.env'})

const webdriver = require('selenium-webdriver')
const By = webdriver.By
const until = webdriver.until
const rimraf = require('rimraf-promise')
const firefox = require('selenium-webdriver/firefox')


// Set up firefox so that the file will be downloaded in a preferred folder
let profile = new firefox.Profile()
profile.setPreference('browser.download.folderList', 2)
profile.setPreference('browser.download.dir', folderName)
profile.setPreference('browser.helperApps.neverAsk.saveToDisk', 'text/csv')
profile.setPreference('webdriver.load.strategy', 'unstable')

console.log('remove the /tmp/lms-export-results directory.')

const folderName = '/tmp/lms-export-results'
rimraf(folderName)

let options = new firefox.Options().setProfile(profile)

const driver = new webdriver.Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build()

test(`should write a file
    with personnummer and name for the student
    if there's one assignment with one submission in the course`, async t => {

  // TODO: create a course in Canvas

  await driver.get('https://kth.test.instructure.com/login/canvas')

  await driver.findElement(By.id('pseudonym_session_unique_id')).sendKeys(process.env.CANVAS_TESTUSER_USERNAME)
  await driver.findElement(By.id('pseudonym_session_password')).sendKeys(process.env.CANVAS_TESTUSER_PASSWORD)
  await driver.findElement(By.className('Button--login')).click()
  await driver.get('https://kth.test.instructure.com/courses/4/external_tools/536?display=borderless')
  try {
    // TODO: should set the timeout to somethinge shorter, since we want it to timeout. But preferably sooner.
    await driver.findElement(By.css('input[type="submit"]')).click()
  } catch (e) {
    console.log('timeout. This is good, now check file content...', )
  }

  fs.readdirSync(folderName).forEach(file => {
    // TODO: read the content of the file
    console.log(file)
  })
  await driver.quit()
  t.end()
})
