const test = require('tape')
const sinon = require('sinon')
const assert = require('assert')
require('rewire-global').enable()
require('should')

const _export = require('../../server/export')

const getAssignmentIdsAndHeaders = _export.__get__('getAssignmentIdsAndHeaders')
const createSubmissionLineContent = _export.__get__('createSubmissionLineContent')

/**
 * Return a canvasApi instance with a mocked "get" function
 */
const setupCanvasApi = (canvasCourseId, assignments) => {
  const canvasApi = {get: sinon.stub()}

  canvasApi
    .get.withArgs(`/courses/${canvasCourseId}/assignments`)
    .returns(assignments)

  return canvasApi
}

test('should get assignment ids and headers', async t => {
  const canvasCourseId = 0
  const canvasApi = setupCanvasApi(canvasCourseId, [
    { id: 0, name: 'Assignment 1' }
  ])

  const result = await getAssignmentIdsAndHeaders({canvasApi, canvasCourseId})

  const expected = {
    assignmentIds: ['0'],
    headers: [
      'Assignment 1 (0)'
    ]
  }

  t.deepEqual(result, expected)
  t.end()
})

test('should return empty arrays if there are no assignments', async t => {
  const canvasCourseId = 0
  const canvasApi = setupCanvasApi(canvasCourseId, [])

  const result = await getAssignmentIdsAndHeaders({canvasApi, canvasCourseId})

  const expected = {
    assignmentIds: [],
    headers: []
  }

  t.deepEqual(result, expected)
  t.end()
})


test('should return an empty array if no submissions', async t => {
  const student = {
    submissions: []
  }
  const assignmentIds = []

  const result = createSubmissionLineContent({student, assignmentIds})
  const expected = []

  t.deepEqual(result, expected)
  t.end()
})

test('should return string results even for non-existent data', t => {
  const student = {
    submissions: [
      {assignment_id: 0},
      {assignment_id: 15, entered_grade: 'L'},
      {assignment_id: 16, entered_grade: 'O'},
      {assignment_id: 23, entered_grade: 'S'},
      {assignment_id: 42, entered_grade: 'T'},
    ]
  }
  const assignmentIds = [4, 8, 15, 16, 23, 42]


  const result = createSubmissionLineContent({student, assignmentIds})

  t.equal(result.length, 6)
  t.ok(result[0])
  t.ok(result[1])
  t.ok(result[2])
  t.ok(result[3])
  t.ok(result[4])
  t.ok(result[5])

  t.end()
})


test('both functions should return same-length arrays', async t => {
  const canvasCourseId = 0
  const canvasApi = setupCanvasApi(canvasCourseId, [
    { id: 0, name: 'Assignment 1' },
    { id: 1, name: 'Assignment 1' },
    { id: 2, name: 'Assignment 1' },
    { id: 3, name: 'Assignment 1' },
    { id: 4, name: 'Assignment 1' },
    { id: 5, name: 'Assignment 1' },
    { id: 6, name: 'Assignment 1' }
  ])
  const student = {
    submissions: []
  }

  const {assignmentIds, headers} = await getAssignmentIdsAndHeaders({canvasApi, canvasCourseId})
  const result = createSubmissionLineContent({student, assignmentIds})

  t.ok(
    Object.keys(headers).length === result.length,
    `length of headers and result should be equal. they are ${headers.length} and ${result.length}`)
  t.end()
})
