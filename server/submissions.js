async function getSubmissions ({ canvasCourseId, sections, canvasApi }) {
  const studentsPerSection = sections.map(section => section.students.map(student => ({
    user_id: student.id,
    section_id: section.id,
    submissions: [], // Add this to preserve the order of the properties, to make deepEqual possible
    sis_user_id: student.sis_user_id,
    integration_id: student.integration_id
  })))

  // Flatten the students array
  const students = [].concat(...studentsPerSection)
  const submissions = await canvasApi.get(`courses/${canvasCourseId}/students/submissions?student_ids[]=all&order=id&order_direction=ascending&per_page=100`)
  const studentsWithSubmissions = students.map(student => ({ ...student, submissions: submissions.filter(sub => sub.user_id === student.user_id) }))

  return studentsWithSubmissions
}
module.exports = { getSubmissions }
