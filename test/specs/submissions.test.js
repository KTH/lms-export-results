const test = require('tape')
const rewire = require('rewire')
const _export = rewire('../../server/submissions')

const extractStudentsFromSections = _export.__get__('extractUniqueStudentsAndSectionNamesFromSections')

const emptySections1 = []
const emptySectionsResult1 = []
const emptySections2 = [
  {
    name: 'Section A',
    students: null
  }, {
    name: 'Section B',
    students: null
  }
]
const emptySectionsResult2 = []

const uniqueSections = [
  {
    name: 'Section C',
    students: [
      {
        id: 2,
        sis_user_id: 'SHEL93921'
      },
      {
        id: 4,
        sis_user_id: 'SHEL93922'
      }
    ]
  }, {
    name: 'Section D',
    students: [
      {
        id: 8,
        sis_user_id: 'SHEL93923'
      },
      {
        id: 16,
        sis_user_id: 'SHEL93924'
      },
      {
        id: 32,
        sis_user_id: 'SHEL93925'
      }
    ]
  }
]
const uniqueSectionsResult = [
  {
    user_id: 2,
    section_names: 'Section C',
    submissions: [],
    sis_user_id: 'SHEL93921'
  },
  {
    user_id: 4,
    section_names: 'Section C',
    submissions: [],
    sis_user_id: 'SHEL93922'
  },
  {
    user_id: 8,
    section_names: 'Section D',
    submissions: [],
    sis_user_id: 'SHEL93923'
  },
  {
    user_id: 16,
    section_names: 'Section D',
    submissions: [],
    sis_user_id: 'SHEL93924'
  },
  {
    user_id: 32,
    section_names: 'Section D',
    submissions: [],
    sis_user_id: 'SHEL93925'
  }
]

const duplicateSections1 = uniqueSections.slice()
duplicateSections1[1].students.push(
  {
    id: 8,
    sis_user_id: 'SHEL93923'
  }
)
const duplicateSectionsResult1 = uniqueSectionsResult

const duplicateSections2 = uniqueSections.slice()
duplicateSections1[1].students.push(
  {
    id: 4,
    sis_user_id: 'SHEL93922'
  }
)
const duplicateSectionsResult2 = uniqueSectionsResult.slice()
duplicateSectionsResult2[1].section_names = 'Section C / Section D'

test('should correctly extract unique students from list of sections', t => {
  let extractedStudents = extractStudentsFromSections(emptySections1)
  t.deepEqual(extractedStudents, emptySectionsResult1, 'function should be able to handle empty sections')

  extractedStudents = extractStudentsFromSections(emptySections2)
  t.deepEqual(extractedStudents, emptySectionsResult2, 'function should be able to handle sections without students')

  extractedStudents = extractStudentsFromSections(uniqueSections)
  t.deepEqual(extractedStudents, uniqueSectionsResult, 'function should be able to handle all unique students')

  extractedStudents = extractStudentsFromSections(duplicateSections1)
  t.deepEqual(extractedStudents, duplicateSectionsResult1, 'function should be able to handle duplicated students found within the same section')

  extractedStudents = extractStudentsFromSections(duplicateSections2)
  t.deepEqual(extractedStudents, duplicateSectionsResult2, 'function should be able to handle duplicated students found across different sections')

  t.end()
})
