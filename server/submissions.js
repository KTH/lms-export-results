function findDuplicates (submissions) {
  function generateFindIndexFunction (submissionToFind) {
    return (element) => element.user_id === submissionToFind.user_id && element.assignment_id === submissionToFind.assignment_id
  }

  return submissions.reduce((accumulator, value, index, array) => {
    const findIndexFunction = generateFindIndexFunction(value)
    if (array.findIndex(findIndexFunction) !== index && accumulator.findIndex(findIndexFunction)) {
      accumulator.push(value)
    }
    return accumulator
  }, [])
}

async function getSubmissions ({ canvasCourseId, sections, canvasApi, log }) {
  // This code reduces the array of sections containing arrays or students into one student array. It also makes sure each student
  // only occurs once.
  const studentsFromSections = sections.reduce((accumulatedSectionStudents, currentSection, currentIndex, sectionsSource) => {
    if (!currentSection.students) {
      currentSection.students = []
    }

    const studentsInSection = currentSection.students.reduce((accumulatedStudents, currentStudent, currentIndex, studentsSource) => {
      if (!accumulatedStudents.find(student => student.user_id === currentStudent.id)) {
        let sectionName = currentSection.name
        const previousStudentEntryIndex = accumulatedSectionStudents.findIndex(sectionStudent => sectionStudent.user_id === currentStudent.id)
        if (previousStudentEntryIndex > -1) {
          accumulatedSectionStudents[previousStudentEntryIndex].section_names += ` / ${sectionName}`
        } else {
          accumulatedStudents.push({
            user_id: currentStudent.id,
            section_names: sectionName,
            submissions: [], // Add this to preserve the order of the properties, to make deepEqual possible
            sis_user_id: currentStudent.sis_user_id,
            integration_id: currentStudent.integration_id
          })
        }
      }

      return accumulatedStudents
    }, [])

    accumulatedSectionStudents.push(...studentsInSection)
    return accumulatedSectionStudents
  }, [])

  const submissions = await canvasApi.get(`courses/${canvasCourseId}/students/submissions?student_ids[]=all&order=id&order_direction=ascending&per_page=100`)
  if (findDuplicates(submissions).length) {
    log.warn('Found instances of submissions appearing more than once. Could be an indication of something going wrong...')
  }
  const studentsWithSubmissions = studentsFromSections.map(student => ({ ...student, submissions: submissions.filter(sub => sub.user_id === student.user_id) }))

  return studentsWithSubmissions
}
module.exports = { getSubmissions }
