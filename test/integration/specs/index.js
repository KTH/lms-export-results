const test = require('tape')
require('dotenv').config({ path: 'test/.env' })
const randomstring = require('randomstring')

const webdriver = require('selenium-webdriver')
const By = webdriver.By
const until = webdriver.until
const rimraf = require('rimraf-promise')
const firefox = require('selenium-webdriver/firefox')
const CanvasApi = require('kth-canvas-api')
const folderName = '/tmp/lms-export-results'
const fs = require('fs')
const canvasApi = new CanvasApi(process.env.CANVAS_API_URL, process.env.CANVAS_API_TOKEN)

// Set up firefox so that the file will be downloaded in a preferred folder
let profile = new firefox.Profile()
profile.setPreference('browser.download.folderList', 2)
profile.setPreference('browser.download.dir', folderName)
profile.setPreference('browser.helperApps.neverAsk.saveToDisk', 'text/csv')
profile.setPreference('webdriver.load.strategy', 'unstable')

console.log('remove the /tmp/lms-export-results directory.')

rimraf(folderName)

let options = new firefox.Options().setProfile(profile)

const driver = new webdriver.Builder()
  .forBrowser('firefox')
  .setFirefoxOptions(options)
  .build()

async function createCanvasCourse () {
  const courseCode = 'A' + randomstring.generate(5)
  const course = {
    name: 'Emil testar lms-export-results',
    'course_code': courseCode,
    'sis_course_id': `${courseCode}VT171`
  }

  const accountId = 14 // Courses that starts with an 'A' is handled by account 14
  const canvasCourse = await canvasApi.createCourse({ course }, accountId)
  await canvasApi.createDefaultSection(canvasCourse)
  return canvasCourse
}

async function prepareCourse (course) {
  // Enroll the test user, 56313, as a teacher
  // Enroll some students
  return result
}

async function setupCourse () {
  return await prepareCourse(await createCanvasCourse())
}

test(`should write a file
    with personnummer and name for the student
    if there's one assignment with one submission in the course`, async t => {
  const course = await setupCourse()
  await driver.get('https://kth.test.instructure.com/login/canvas')

  await driver.findElement(By.id('pseudonym_session_unique_id')).sendKeys(process.env.CANVAS_TESTUSER_USERNAME)
  await driver.findElement(By.id('pseudonym_session_password')).sendKeys(process.env.CANVAS_TESTUSER_PASSWORD)
  await driver.findElement(By.className('Button--login')).click()
  await driver.get(`https://kth.test.instructure.com/courses/${course.id}/external_tools/536?display=borderless`)
  try {
    // TODO: should set the timeout to somethinge shorter, since we want it to timeout. But preferably sooner.
    await driver.findElement(By.css('input[type="submit"]')).click()
  } catch (e) {
    console.log('timeout. This is good, now check file content...')
  }

  fs.readdirSync(folderName).forEach(file => {
    // Should only be one file, since I just created this folder
    const fileContent = fs.readFileSync(file)
    console.log(fileContent)
  })
  await driver.quit()
  t.end()
})
