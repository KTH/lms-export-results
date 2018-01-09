const test = require('tape')
const sinon = require('sinon')
require('rewire-global').enable()
const assert = require('assert')
const _export = require('../../server/export')
require('should')

const getCustomColumnsFn = _export.__get__('getCustomColumnsFn')

test('should return a function with user_id as argument, and the column data as return value', async t => {
  const userId = 123456
  const canvasCourseId = 0
  const canvasApi = {get: sinon.stub()}
  const canvasApiUrl = ''
  const columnId = 1
  const columnId2 = 2

  // Columns
  canvasApi.get.withArgs(`/courses/${canvasCourseId}/custom_gradebook_columns`).returns([
    {
      id: columnId,
      title: 'Anteckningar',
      position: 1,
      teacher_notes: true,
      hidden: false
    }, {
      id: columnId2,
      title: 'Nån annan kolumn',
      position: 2,
      teacher_notes: false,
      hidden: false
    }
  ])

  // Column data
  canvasApi.get.withArgs(`/courses/${canvasCourseId}/custom_gradebook_columns/${columnId}/data`).returns(
    [
      {
        content: 'en anteckning...',
        user_id: userId
      }
    ]
  )

  canvasApi.get.withArgs(`/courses/${canvasCourseId}/custom_gradebook_columns/${columnId2}/data`).returns(
    [
      {
        content: 'Nåt annat data i en kolumn',
        user_id: userId
      }
    ]
  )

  const {getCustomColumnsData} = await getCustomColumnsFn({canvasApi, canvasCourseId, canvasApiUrl})
  const result = getCustomColumnsData(userId)
  const expected = {
    [columnId]: 'en anteckning...',
    [columnId2]: 'Nåt annat data i en kolumn'
  }
  t.deepEqual(result, expected)
  t.end()
})

test(`should sort the custom column headers by position`, t => {
  const customColumns = [
    {
      id: 185,
      title: 'Anteckningar 2',
      position: 2,
      teacher_notes: true,
      hidden: false
    }, {
      id: 184,
      title: 'Anteckningar',
      position: 1,
      teacher_notes: true,
      hidden: false
    }]
  const getCustomColumnHeaders = _export.__get__('getCustomColumnHeaders')
  const result = getCustomColumnHeaders(customColumns)
  result.should.deepEqual(['Anteckningar', 'Anteckningar 2'])
  t.end()
})

test(`should return an array with the custom columns data,
  or empty string if no data exists,
  sorted by custom columns position`, t => {
  const customColumnsData = {184: 'en anteckning...'}
  const customColumns = [
    {
      id: 185,
      title: 'Anteckningar 2',
      position: 2,
      teacher_notes: true,
      hidden: false
    }, {
      id: 184,
      title: 'Anteckningar',
      position: 1,
      teacher_notes: true,
      hidden: false
    }]
  const createCustomColumnsContent = _export.__get__('createCustomColumnsContent')
  const result = createCustomColumnsContent({customColumns, customColumnsData})
  result.should.deepEqual(['en anteckning...', ''])
  t.end()
})

test(`should return a function with user_id as argument,
  and an object as result
  if the user has no data for the custom columns
  `, async t => {
  const userId = 123, userId2 = 456
  const canvasCourseId = 0
  const canvasApi = {get: sinon.stub()}
  const canvasApiUrl = ''
  const columnId = 1

  // Columns
  canvasApi.get.withArgs(`/courses/${canvasCourseId}/custom_gradebook_columns`).returns([
    {
      id: columnId,
      title: 'Anteckningar',
      position: 1,
      teacher_notes: true,
      hidden: false
    }
  ])

  // Column data
  canvasApi.get.withArgs(`/courses/${canvasCourseId}/custom_gradebook_columns/${columnId}/data`).returns(
    []
  )

  const {getCustomColumnsData} = await getCustomColumnsFn({canvasApi, canvasCourseId, canvasApiUrl})
  const result = getCustomColumnsData(userId2)
  const expected = {}
  t.deepEqual(result, expected)
  t.end()
})
