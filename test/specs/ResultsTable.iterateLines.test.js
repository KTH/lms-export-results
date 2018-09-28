const test = require('tape')
const rewire = require('rewire')
const ResultsTable = rewire('../../server/ResultsTable')
const log = require('bunyan').createLogger({
  name: 'test',
  level: 0 // Creates a very noisy logger
})

ResultsTable.__set__('rp', () => ({
  auth: {
    access_token: 'valid_access_token'
  }
}))

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

  ResultsTable.__set__('ldap.getBoundClient', () => fakeLdapClient)
  ResultsTable.__set__('CanvasApi', FakeCanvasApi)

  const file = await ResultsTable.create('canvas_course_id', {log, oauth: {}})

  await file.iterateRows(() => {
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

  ResultsTable.__set__('ldap.getBoundClient', () => fakeLdapClient)
  ResultsTable.__set__('CanvasApi', FakeCanvasApi)

  const file = await ResultsTable.create('canvas_course_id', {log, oauth: {}})

  try {
    await file.iterateRows(() => {
      t.fail('the callback was called')
    })
  } catch (e) {
    t.pass('should throw an error')
  }

  t.end()
})
