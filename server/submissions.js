// Note: The purpose of this function is to extract the query string from the Link header,
// for the so called "first" link.
function getFirstLinkQSParams (headers) {
  let firstQSParams = {}
  const first = headers.link.split(',').find(l => l.search(/rel="first"$/) !== -1)
  const matchedUrl = first && first.match(/<(.*?)>/)
  const splitUrl = matchedUrl[1].split('?')
  const qsArray = splitUrl[1].split('&')
  for (const item of qsArray) {
    const splitItem = item.split('=')
    firstQSParams[splitItem[0]] = splitItem[1]
  }
  return firstQSParams
}

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
  const url = `/courses/${canvasCourseId}/students/submissions`
  const response = await canvasApi.get(url, { student_ids: 'all' })
  // Note: Speculative special handling of pagination when fetching submissions.
  // Want to use the query string to specifically fetch the "first" page.
  const qsParams = getFirstLinkQSParams(response.headers)
  const submissions = []
  for await (const submission of canvasApi.list(url, qsParams)) {
    submissions.push(submission)
  }

  return students.map(student => ({ ...student, submissions: submissions.filter(sub => sub.user_id === student.user_id) }))
}
module.exports = { getSubmissions }
