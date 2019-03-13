const assert = require('assert')
const test = require('tape')
const CanvasApi = require('kth-canvas-api')
require('dotenv').config()

const canvasApi = new CanvasApi(process.env.CANVAS_HOST, process.env.CANVAS_TOKEN)
const {getSubmissions} = require('../../../../server/submissions')


test('should construct the similar json', async t => {
    const sections = await canvasApi.get(`courses/3719/sections?include[]=students`)

    // Get the json, sorted, without the test user. The new function don't incluce the test users.
    const oldWay = (await canvasApi.get(`courses/3719/students/submissions?grouped=1&student_ids[]=all&per_page=100`)).sort((a, b) => a.user_id - b.user_id).filter(stud => stud.user_id !== 55842)

    const {students} = (await getSubmissions(3719, sections))
    // Make sure both arrays are sorted, so I can compare them
    const newWay = students.sort((a, b) => a.user_id - b.user_id)

    // Ignore seconds late when comparing, since these are changed for every api call
    oldWay.forEach(student => student.submissions.forEach(sub => delete sub.seconds_late))
    newWay.forEach(student => student.submissions.forEach(sub => delete sub.seconds_late))

    assert.deepEqual(oldWay, newWay)

    t.end()
})


