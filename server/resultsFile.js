const CanvasApi = require('kth-canvas-api')
const flatten = require('lodash/flatten')
const ldap = require('./ldap')

module.exports = async function createResultsFile (courseId, courseRound, options) {
  const log = options.log

  let accessToken

  try {
    const auth = await rp({
      method: 'POST',
      uri: `https://${process.env.CANVAS_HOST}/login/oauth2/token`,
      body: {
        grant_type: 'authorization_code',
        client_id: process.env.CANVAS_CLIENT_ID,
        client_secret: process.env.CANVAS_CLIENT_SECRET,
        redirect_uri: options.oauth.redirectUri,
        code: options.oauth.code
      },
      json: true
    })

    accessToken = auth.access_token
  } catch (e) {
    log.warn('The access token cannot be retrieved from Canvas', e)
    throw e
  }

  const canvasApi = new CanvasApi(`https://${process.env.CANVAS_HOST}/api/v1`, accessToken)
  const assignments = await canvasApi.get(`/courses/${courseId}/assignments`)
  const customColumns = (await canvasApi.get(`/courses/${courseId}/custom_gradebook_columns`))
    .sort((c1, c2) => c1.position - c2.position) // Sort by "position" in "ascending" order:

  const canvasUsers = await canvasApi.get(`courses/${canvasCourseId}/users?enrollment_type[]=student&per_page=100`)
  const fakeStudents = await canvasApi.get(`courses/${canvasCourseId}/users?enrollment_type[]=student_view`)
  const isReal = (student) => !fakeStudents.find(fake => fake.id === student.id)

  // Sections temporal cache
  let sectionsCache = {}
  async function getSection (sectionId) {
    if (!sectionsCache[sectionId]) {
      sectionsCache[sectionId] = await canvasApi.requestUrl(`sections/${sectionId}`)
    }
    return sectionsCache[sectionId]
  }

  // Custom Columns Data temporal cache
  let customColumnsCache = {}
  async function getCustomColumnsData (userId) {
    return customColumnsCache[userId] || []
  }

  // "Fill" the data of the cache grouped by users
  for (let student of canvasUsers) {
    customColumnCache[student.id] = []
  }

  for (let column of customColumns) {
    const data = await canvasApi.get(`/courses/${courseId}/custom_gradebook_columns/${column.id}/data`)
    for (let d of data) {
      customColumnsCache[d.user_id].push(d.content)
    }
  }

  return {
    async getHeaders () {
      const fixedHeaders = [
        'SIS User ID',
        'ID',
        'Section',
        'Name',
        'Surname',
        'Personnummer',
        'Email address'
      ]

      const assignmentsHeaders = assignments
        .map(a => [
          `${a.name} (${a.id}) - submission date`,
          `${a.name} (${a.id}) - grade`
        ])

      const customColumnsHeaders = customColumns
        .map(column => column.title)

      return [
        ...fixedHeaders,
        ...customColumnsHeaders,
        ...flatten(assignmentsHeaders) // TODO: Replace with array.prototype.flatten() when Node 10!!
      ]
    },

    async readLine (callback) {
      const ldapClient = await ldap.getBoundClient({log})

      await canvasApi.get(`/courses/${courseId}/students/submissions?grouped=1&student_ids[]=all`, async students => {
        const realStudents = students.filter(isReal)

        for (let student of realStudents) {
          try {
            const section = await getSection(student.section_id)
            const canvasUser = canvasUsers.find(cu => cu.id === student.user_id)
            const ldapUser = await ldap.lookupUser(ldapClient, student.sis_user_id)

            const fixedData = [
              student.sis_user_id,
              student.user_id,
              section.name,
              ldapUser.givenName || (canvasUser && canvasUser.name),
              ldapUser.sn,
              `="${ldapUser.personnummer || ''}"`,
              (canvasUser && canvasUser.login_id) || "Not displaying email for users that hasn't accepted invitation to course"
            ]

            const assignmentsData = student.submissions
              .map(submission => [
                submission.submitted_at,
                submission.entered_grade
              ])

            const customColumnsData = await getCustomColumnsData(student.user_id)

            return [
              ...fixedData,
              ...customColumnsData,
              ...flatten(assignmentsData) // TODO: Replace with array.prototype.flatten() when Node 10!!
            ]
          } catch (e) {
            log.error('Error. Export failed', e)
          }
        }
      })

      await ldapClient.unbind()
    }
  }
}
