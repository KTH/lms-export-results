const test = require('tape')
require('dotenv').config({path: 'test/.env'})

var webdriver = require('selenium-webdriver'),
  By = webdriver.By,
  until = webdriver.until

/*****************/
const firefox = require('selenium-webdriver/firefox')

let profile = new firefox.Profile()
// profile.addExtension('/path/to/firebug.xpi')
profile.setPreference("browser.download.folderList",2);
profile.setPreference("browser.download.manager.showWhenStarting",false);
// profile.setPreference("browser.download.dir", "/save/file/to/this/directory");
profile.setPreference("browser.helperApps.neverAsk.saveToDisk","text/csv");

let options = new firefox.Options().setProfile(profile)

/***********/

const driver = new webdriver.Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build()

test(`should write a file
    with personnummer and name for the student
    if there's one assignment with one submission in the course`, async t => {
  driver.get('http://www.google.com/ncr')
  // driver.findElement(By.name('q')).sendKeys('webdriver')
  // driver.findElement(By.name('btnG')).click()
  // driver.wait(until.titleIs('webdriver - Google Search'), 1000)
  driver.quit()

  t.end()
})
