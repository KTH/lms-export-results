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

test('"getHeaders()" not works if "preload()" is not called before', async t => {
  t.plan(1)
  const file = await getInstance()

  try {
    file.getHeaders()
  } catch (e) {
    t.pass('should throw an error')
  }
})

test('"getHeaders()" returns 7 fixed headers when preload()-ed data is empty', async t => {
  // A CanvasApi that returns always empty arrays
  class FakeCanvasApi {
    get (url) {
      return []
    }
  }

  ResultsFile.__set__('CanvasApi', FakeCanvasApi)
  const file = await getInstance()

  await file.preload()
  const expectedHeaders = [
    'SIS User ID',
    'ID',
    'Section',
    'Name',
    'Surname',
    'Personnummer',
    'Email address'
  ]

  t.deepEqual(file.getHeaders(), expectedHeaders)
  t.end()
})

test('"getHeaders()" returns 9 headers when data is one assignment (7 fixed + 2 per assignment)', async t => {
  const ASSIGNMENT_ID = 'assignment_id'
  const ASSIGNMENT_NAME = 'assignment_name'
  // A CanvasApi that returns always empty arrays
  class FakeCanvasApi {
    get (url) {
      if (url.includes('assignments')) {
        return [{id: ASSIGNMENT_ID, name: ASSIGNMENT_NAME}]
      } else {
        return []
      }
    }
  }

  ResultsFile.__set__('CanvasApi', FakeCanvasApi)
  const file = await getInstance()

  await file.preload()

  const headers = file.getHeaders()

  t.equal(headers.length, 9, 'should return 9 headers. No less, no more')
  t.ok(headers[7].includes(ASSIGNMENT_ID), 'headers should contain the ID of the assignment')
  t.ok(headers[8].includes(ASSIGNMENT_ID), 'headers should contain the ID of the assignment')

  t.ok(headers[7].includes(ASSIGNMENT_NAME), 'headers should contain the name of the assignment')
  t.ok(headers[8].includes(ASSIGNMENT_NAME), 'headers should contain the name of the assignment')

  t.ok(headers[7].includes('submission date'), '8th header should contain the words "submission date"')
  t.ok(headers[8].includes('grade'), '9th header should contain the word "grade"')
  t.end()
})

test('"getHeaders()" returns 15 headers when data are four assignment (7 fixed + 2 per assignment)', async t => {
  const assignments = [
    {id: 'a1', name: 'a1name'},
    {id: 'a2', name: 'a2name'},
    {id: 'a3', name: 'a3name'},
    {id: 'a4', name: 'a4name'},
  ]
  // A CanvasApi that returns always empty arrays
  class FakeCanvasApi {
    get (url) {
      if (url.includes('assignments')) {
        return assignments
      } else {
        return []
      }
    }
  }

  ResultsFile.__set__('CanvasApi', FakeCanvasApi)
  const file = await getInstance()

  await file.preload()

  const headers = file.getHeaders()

  t.equal(headers.length, 15, 'should return exactly 15 headers. No less, no more')

  assignments.forEach((a, index) => {
    t.ok(headers[7 + index * 2].includes(a.id), `header ${7 + index * 2} should contain the ID of the assignment`)
    t.ok(headers[7 + index * 2 + 1].includes(a.id),   `header ${7 + index * 2 + 1} should contain the ID of the assignment`)
  })

  assignments.forEach((a, index) => {
    t.ok(headers[7 + index * 2].includes(a.name), `header ${7 + index * 2} should contain the name of the assignment`)
    t.ok(headers[7 + index * 2 + 1].includes(a.name), `header ${7 + index * 2 + 1} should contain the name of the assignment`)
  })

  headers.slice(7).forEach((header, i) => {
    if (i % 2 === 0) {
      t.ok(header.includes('submission date'), `header ${i+7} should contain "submission date"`)
    } else {
      t.ok(header.includes('grade'), `header ${i+7} should contain "grade"`)
    }
  })

  t.end()
})
