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

test('"getHeaders()" should not work if "preload()" is not called before', async t => {
  const file = await ResultsTable.create('canvas_course_id', {log, oauth: {}})

  try {
    file.getHeaders()
  } catch (e) {
    t.pass('should throw an error')
  }
  t.end()
})

test('"getHeaders()" should return 7 fixed headers when preload()-ed data is empty', async t => {
  ResultsTable.__set__('CanvasApi', class FakeCanvasApi {
    get (url) {
      return []
    }
  })

  const file = await ResultsTable.create('canvas_course_id', {log, oauth: {}})

  await file.preload()
  const expectedHeaders = [
    'SIS User ID',
    'ID',
    'Section',
    'Name',
    'Surname',
    'Ladok UID',
    'Email address'
  ]

  t.deepEqual(file.getHeaders(), expectedHeaders)
  t.end()
})

test('"getHeaders()" should return 9 headers when data is one assignment (7 fixed + 2 per assignment)', async t => {
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

  ResultsTable.__set__('CanvasApi', FakeCanvasApi)
  const file = await ResultsTable.create('canvas_course_id', {log, oauth: {}})

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

  ResultsTable.__set__('CanvasApi', FakeCanvasApi)
  const file = await ResultsTable.create('canvas_course_id', {log, oauth: {}})

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

test('"getHeaders() returns 10 headers when data are 1 assignment + 1 custom column (7 fixed + 2 per assignemnt + 1 per custom column', async t => {
  class FakeCanvasApi {
    get (url) {
      if (url.includes('assignments')) {
        return [{id: 'a1', name: 'a1name'}]
      } else if (url.includes('custom_gradebook_columns') && !url.includes('data')) {
        return [{position: 0, title: 'custom column 1'}]
      } else {
        return []
      }
    }
  }

  ResultsTable.__set__('CanvasApi', FakeCanvasApi)
  const file = await ResultsTable.create('canvas_course_id', {log, oauth: {}})

  await file.preload()

  const headers = file.getHeaders()

  t.equal(headers.length, 10, 'should return exactly 10 headers')
  t.equal(headers[7], 'custom column 1', '8th header should be called "custom column 1"')
  t.end()
})

test('"getHeaders() returns custom columns sorted by "position" in Canvas', async t => {
  class FakeCanvasApi {
    get (url) {
      if (url.includes('custom_gradebook_columns') && !url.includes('data')) {
        return [
          {position: 2, title: 'custom column 2'},
          {position: 0, title: 'custom column 0'},
          {position: 1, title: 'custom column 1'}
        ]
      } else {
        return []
      }
    }
  }

  ResultsTable.__set__('CanvasApi', FakeCanvasApi)
  const file = await ResultsTable.create('canvas_course_id', {log, oauth: {}})

  await file.preload()

  const headers = file.getHeaders()

  t.equal(headers[7], 'custom column 0', '8th header should be called "custom column 0"')
  t.equal(headers[8], 'custom column 1', '9th header should be called "custom column 1"')
  t.equal(headers[9], 'custom column 2', '10th header should be called "custom column 2"')
  t.end()
})
