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

test('"iterateLines()" should throw an error if "preload()" is not called before', async t => {
  const fakeLdapClient = {
    unbind: () => {}
  }
  class FakeCanvasApi {
    get () {
      return []
    }
  }

  ResultsFile.__set__('ldap.getBoundClient', () => fakeLdapClient)
  ResultsFile.__set__('CanvasApi', FakeCanvasApi)
  t.plan(1)
  const file = await getInstance()

  try {
    await file.iterateLines(() => {})
  } catch (e) {
    t.pass('should throw an error')
  }

  t.fail('no error returned')
})
