const test = require('tape')
const rewire = require('rewire')
const ResultsFile = rewire('../../server/resultsFile')
const log = require('bunyan').createLogger({
  name: 'test',
  level: 0 // Creates a very noisy logger
})

async function getInstance () {
  ResultsFile.__set__('rp', () => ({
    auth: {
      access_token: 'valid_access_token'
    }
  }))

  return ResultsFile.create('canvas_course_id', {log, oauth: {}})
}

test('"iterateLines()" with 0 students should finish without calling the callback', async t => {
  const fakeLdapClient = {
    unbind: () => {}
  }
  class FakeCanvasApi {
    get (url, cb) {
      cb([])
      return []
    }
  }

  ResultsFile.__set__('ldap.getBoundClient', () => fakeLdapClient)
  ResultsFile.__set__('CanvasApi', FakeCanvasApi)

  const file = await getInstance()

  await file.iterateLines(() => {
    t.fail('the callback was called')
  })

  t.end()
})

test('"iterateLines()" with 1 student should throw an error if preload() was not called before', async t => {
  const fakeLdapClient = {
    unbind: () => {}
  }
  class FakeCanvasApi {
    async get (url, cb) {
      if (url.includes('sections')) {
        return {
          id: 'section_id',
          name: 'section_name'
        }
      } else if (url.includes('students/submissions')) {
        await cb([
          {id: '1'}
        ])
      } else {
        return []
      }
    }
  }

  ResultsFile.__set__('ldap.getBoundClient', () => fakeLdapClient)
  ResultsFile.__set__('CanvasApi', FakeCanvasApi)

  const file = await getInstance()

  try {
    await file.iterateLines(() => {
      t.fail('the callback was called')
    })
  } catch (e) {
    t.pass('should throw an error')
  }

  t.end()
})
