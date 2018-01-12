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
profile.setPreference('browser.download.manager.showWhenStarting', false)
// profile.setPreference("browser.download.dir", "/save/file/to/this/directory");
profile.setPreference('browser.helperApps.neverAsk.saveToDisk', 'text/csv')

let options = new firefox.Options().setProfile(profile)

/***********/

const driver = new webdriver.Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build()

test(`should write a file
    with personnummer and name for the student
    if there's one assignment with one submission in the course`, async t => {
  driver.get('https://kth.test.instructure.com/login/canvas')

  driver.findElement(By.id('pseudonym_session_unique_id')).sendKeys(process.env.CANVAS_TESTUSER_USERNAME)
  driver.findElement(By.id('pseudonym_session_password')).sendKeys(process.env.CANVAS_TESTUSER_PASSWORD)
  driver.findElement(By.className('Button--login')).click()
  // driver.wait(until.titleIs('webdriver - Google Search'), 1000)

  // driver.findElement(By.name('q')).sendKeys('webdriver')
  // driver.findElement(By.name('btnG')).click()
  // driver.wait(until.titleIs('webdriver - Google Search'), 1000)
  driver.quit()

  t.end()
})
