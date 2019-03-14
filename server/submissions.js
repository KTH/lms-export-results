const CanvasApi = require('kth-canvas-api')
const canvasApiUrl = `https://${process.env.CANVAS_HOST}/api/v1`

require('dotenv').config()

const canvasApi = new CanvasApi(canvasApiUrl, process.env.CANVAS_TOKEN)

async function getSubmissions (courseId, sections) {

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

  return studentsWithSubmissions
}
module.exports = {getSubmissions}
