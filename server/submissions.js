const CanvasApi = require('kth-canvas-api')

require('dotenv').config()

const canvasApi = new CanvasApi(process.env.CANVAS_HOST, process.env.CANVAS_TOKEN)

async function getStudentsAndSections (courseId) {
  const sections = await canvasApi.get(`courses/${courseId}/sections?include[]=students`)

  const studentsPerSection = sections.map(section => section.students.map(student => ({
    user_id: student.id,
    section_id: section.id,
    submissions: [], // Add this to preserve the order of the properties, to make deepEqual possible
    sis_user_id: student.sis_user_id,
    integration_id: student.integration_id
  })))

  // Flatten the students array
  const students = [].concat(...studentsPerSection)
  const submissions = await canvasApi.get(`courses/${courseId}/students/submissions?student_ids[]=all&per_page=100`)
  const studentsWithSubmissions = students.map(student => ({...student, submissions: submissions.filter(sub => sub.user_id === student.user_id)}))

  return {sections, students: studentsWithSubmissions}
}
module.exports = {getStudentsAndSections}
