const canvas = require('@kth/canvas-api')
const ldap = require('./ldap')
const rp = require('request-promise')

const flattenReducer = (acc, el) => [...acc, ...el]

module.exports.create = async function createResultsFile (courseId, options) {
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

  // From here, the "createResultsFile" function (this function) should finish
  // as early as possible not awaiting for slow promises
  const canvasApi = canvas(`https://${process.env.CANVAS_HOST}/api/v1`, accessToken)
  const sectionsCache = {}
  const customColumnsCache = {}
  let assignments
  let customColumns
  let canvasUsers
  let fakeStudents

  async function getSection (sectionId) {
    if (!sectionsCache[sectionId]) {
      sectionsCache[sectionId] = await canvasApi.get(`sections/${sectionId}`).body
    }
    return sectionsCache[sectionId]
  }

  function getCustomColumnsData (userId) {
    return customColumnsCache[userId] || []
  }

  const isReal = (student) => !(fakeStudents).find(fake => fake.id === student.id)

  function sortSubmissions (submissions) {
    const result = []
    for (let assignment of assignments) {
      const submission = submissions.find(s => s.assignment_id === assignment.id)
      result.push(submission)
    }
    return result
  }

  return {
    async preload () {
      assignments = []
      for await (const page of canvasApi.listPaginated(`courses/${courseId}/assignments`)) {
        assignments.push(...page)
      }

      canvasUsers = []
      for await (const page of canvasApi.listPaginated(`courses/${courseId}/users`, { 'enrollment_type[]': 'student' })) {
        canvasUsers.push(...page)
      }

      fakeStudents = []
      for await (const page of canvasApi.listPaginated(`courses/${courseId}/users`, { 'enrollment_type[]': 'student_view' })) {
        fakeStudents.push(...page)
      }

      customColumns = []
      for await (const page of canvasApi.listPaginated(`courses/${courseId}/custom_gradebook_columns`)) {
        customColumns.push(...page)
      }
      customColumns.sort((c1, c2) => c1.position - c2.position) // Sort by "position" in "ascending" order

      for (let column of customColumns) {
        const data = await canvasApi.get(`courses/${courseId}/custom_gradebook_columns/${column.id}/data`).body
        for (let d of data) {
          if (!customColumnsCache[d.user_id]) {
            customColumnsCache[d.user_id] = []
          }
          customColumnsCache[d.user_id].push(d.content)
        }
      }
    },

    getHeaders () {
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
        .reduce(flattenReducer, [])

      const customColumnsHeaders = customColumns
        .map(column => column.title)

      return [
        ...fixedHeaders,
        ...customColumnsHeaders,
        ...assignmentsHeaders
      ]
    },

    async iterateRows (callback) {
      const ldapClient = await ldap.getBoundClient({ log })

      const url = `/courses/${courseId}/students/submissions`
      const response = await canvasApi.get(url, { grouped: 1, 'student_ids[]': 'all' })
      const next = response.headers.link.split(',').find(l => l.search(/rel="first"$/) !== -1)
      const nextUrl = next && next.match(/<(.*?)>/)
      if (nextUrl && nextUrl[1]) {
        const splitUrl = nextUrl[1].split('?')
        const qsArray = splitUrl[1].split('&')
        const qsParams = {}
        for (const item of qsArray) {
          const splitItem = item.split('=')
          qsParams[splitItem[0]] = splitItem[1]
        }
        for await (const student of canvasApi.list(url, qsParams)) {
          if (isReal(student)) {
            try {
              const section = await getSection(student.section_id)
              const canvasUser = canvasUsers.find(cu => cu.id === student.user_id)
              const ldapUser = (await ldap.lookupUser(ldapClient, student.sis_user_id)) || {}

              const fixedData = [
                student.sis_user_id || '',
                student.user_id || '',
                section.name || '',
                ldapUser.givenName || (canvasUser && canvasUser.name) || '',
                ldapUser.sn || '',
                `="${ldapUser.personnummer || ''}"`,
                (canvasUser && canvasUser.login_id) || "Not displaying email for users that hasn't accepted invitation to course"
              ]

              const assignmentsData = sortSubmissions(student.submissions)
                .map(submission => [
                  (submission && submission.submitted_at) || '',
                  (submission && submission.entered_grade) || ''
                ])
                .reduce(flattenReducer, [])

              const customColumnsData = await getCustomColumnsData(student.user_id)

              // TODO: Replace with Array.prototype.flat() once supported by Node.js used (11+)
              callback([
                ...fixedData,
                ...customColumnsData,
                ...assignmentsData
              ])
            } catch (e) {
              log.error('Error. Export failed', e)
            }
          }
        }
      } else {
        log.error('Error. Export failed due to missing Link header.')
      }

      await ldapClient.unbind((err) => {
        if (err) {
          log.error('An error occured when unbinding ldap client')
          log.error(err)
        }
      })
    }
  }
}
